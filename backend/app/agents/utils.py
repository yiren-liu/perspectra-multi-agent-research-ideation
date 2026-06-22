import os
import json
import time
import random
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Any, Callable, Optional, Dict, Union
from uuid import UUID
from functools import wraps
from dataclasses import dataclass
from enum import Enum

from semanticscholar import SemanticScholar
import pyalex
from pyalex import Works, OpenAlexResponseList

from langchain_core.callbacks import BaseCallbackHandler
from langchain_openai import ChatOpenAI

from tqdm import tqdm

from app.app_types.idea_types import PaperInfo
from settings import app_settings

# Configure pyalex for better API performance
if app_settings.openalex_email:
    pyalex.config.email = app_settings.openalex_email
if app_settings.openalex_api_key:
    pyalex.config.api_key = app_settings.openalex_api_key

# Provider enum for configuration
class SearchProvider(str, Enum):
    SEMANTIC_SCHOLAR = "semantic_scholar"
    OPENALEX = "openalex"

@dataclass
class SearchConfig:
    """Configuration for paper search behavior."""
    primary_provider: SearchProvider = SearchProvider.OPENALEX
    fallback_provider: SearchProvider = SearchProvider.SEMANTIC_SCHOLAR
    timeout_threshold: float = 60.0
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 15.0
    enable_fallback: bool = True

# Global search configuration
search_config = SearchConfig()

def update_search_config(**kwargs) -> SearchConfig:
    """
    Update the global search configuration.
    
    Args:
        **kwargs: Configuration parameters to update
    
    Returns:
        Updated SearchConfig instance
    """
    global search_config
    for key, value in kwargs.items():
        if hasattr(search_config, key):
            setattr(search_config, key, value)
        else:
            raise ValueError(f"Unknown configuration key: {key}")
    return search_config

# Setup file logging for debugging
def setup_debug_logger(name: str, log_file: Optional[str] = None, enabled: bool = False) -> logging.Logger:
    """Set up a logger for paper-search debugging.

    When ``enabled`` is False a NullHandler is attached and nothing is written to
    disk, so importing this module never silently creates a ``logs/`` directory.
    File logging is only turned on in user-study mode.
    """
    logger = logging.getLogger(name)
    # Remove any existing handlers to avoid duplicates
    logger.handlers.clear()

    if not enabled:
        logger.addHandler(logging.NullHandler())
        logger.setLevel(logging.WARNING)
        return logger

    if log_file is None:
        # Create logs directory if it doesn't exist
        os.makedirs("logs", exist_ok=True)
        log_file = f"logs/search_paper_debug_{datetime.now().strftime('%Y%m%d')}.log"

    logger.setLevel(logging.DEBUG)

    # Create file handler
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)

    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
    )
    file_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    return logger

# Initialize debug logger (file logging only in user-study mode)
debug_logger = setup_debug_logger('search_paper_debug', enabled=app_settings.user_study_mode)

def view_debug_logs(lines: int = 50) -> None:
    """Helper function to view the most recent debug log entries."""
    log_file = f"logs/search_paper_debug_{datetime.now().strftime('%Y%m%d')}.log"
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            print(f"=== Last {len(recent_lines)} lines from {log_file} ===")
            for line in recent_lines:
                print(line.strip())
    except FileNotFoundError:
        print(f"Log file {log_file} not found. Run search_paper_by_query first to generate logs.")
    except Exception as e:
        print(f"Error reading log file: {e}")

def exponential_backoff_retry(max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 5.0):
    """
    Decorator that implements exponential backoff retry logic for API calls.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay between retries in seconds
        max_delay: Maximum delay between retries in seconds
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    # Check if this is a retryable error
                    if not _is_retryable_error(e):
                        raise e
                    
                    # If this was the last attempt, raise the exception
                    if attempt == max_retries:
                        raise e
                    
                    # Calculate delay with exponential backoff and jitter
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    jitter = random.uniform(0, delay * 0.1)  # Add up to 10% jitter
                    total_delay = delay + jitter
                    
                    debug_logger.warning(f"API call failed (attempt {attempt + 1}/{max_retries + 1}), retrying in {total_delay:.2f} seconds...")
                    time.sleep(total_delay)
            
            # This should never be reached due to the logic above
            raise RuntimeError("Unexpected error: retry loop completed without returning or raising")
        
        return wrapper
    return decorator

def _is_retryable_error(error: Exception) -> bool:
    """
    Determines if an error is retryable based on common API error patterns.
    
    Args:
        error: The exception to check
        
    Returns:
        True if the error should be retried, False otherwise
    """
    error_str = str(error).lower()
    
    # Common retryable error patterns
    retryable_patterns = [
        'rate limit',
        'too many requests',
        '429',
        'timeout',
        'connection error',
        'connection timeout',
        'read timeout',
        'server error',
        '500',
        '502',
        '503',
        '504',
        'internal server error',
        'bad gateway',
        'service unavailable',
        'gateway timeout',
        'temporary failure',
        'temporarily unavailable'
    ]
    
    return any(pattern in error_str for pattern in retryable_patterns)

class PaperDataMapper:
    """
    Centralized mapper for extracting paper data from various API response formats.
    Handles both attribute-based and dict-like access patterns safely.
    """
    
    @staticmethod
    def safe_extract_field(paper: Any, field_names: List[str], default: Any = "") -> Any:
        """
        Safely extract a field from paper data using multiple access methods.
        
        Args:
            paper: Paper data object (could be dict-like or attribute-based)
            field_names: List of field names to try in order
            default: Default value to return if extraction fails
            
        Returns:
            Extracted field value or default
        """
        for field_name in field_names:
            # Try attribute access first
            try:
                value = getattr(paper, field_name, None)
                if value is not None:
                    return value
            except (AttributeError, TypeError):
                pass
            
            # Try dict-like access
            try:
                if hasattr(paper, 'get'):
                    value = paper.get(field_name)  # type: ignore
                    if value is not None:
                        return value
            except Exception:
                pass
        
        return default
    
    @staticmethod
    def extract_openalex_title(paper: Any) -> str:
        """Extract title from OpenAlex paper data."""
        title = PaperDataMapper.safe_extract_field(
            paper, 
            ['title', 'display_name'], 
            default=""
        )
        return str(title) if title else ""
    
    @staticmethod
    def extract_openalex_authors(paper: Any) -> List[str]:
        """Extract authors list from OpenAlex paper data."""
        authors = []
        
        try:
            authorships = PaperDataMapper.safe_extract_field(
                paper, 
                ['authorships'], 
                default=[]
            )
            
            for authorship in authorships or []:
                try:
                    # Try dict-like access first
                    if hasattr(authorship, 'get'):
                        author_info = authorship.get('author', {})  # type: ignore
                        if hasattr(author_info, 'get'):
                            author_name = author_info.get('display_name', '')  # type: ignore
                            if author_name and author_name != 'Unknown Author':
                                authors.append(str(author_name))
                    
                    # Try attribute access
                    elif hasattr(authorship, 'author'):
                        author = getattr(authorship, 'author', {})
                        author_name = getattr(author, 'display_name', '')
                        if author_name:
                            authors.append(str(author_name))
                except Exception:
                    continue
                    
        except Exception:
            debug_logger.debug("Failed to extract authors from authorships")
        
        return authors
    
    @staticmethod
    def extract_openalex_year(paper: Any) -> str:
        """Extract publication year from OpenAlex paper data."""
        year_val = PaperDataMapper.safe_extract_field(
            paper,
            ['publication_year'],
            default=None
        )
        return str(year_val) if year_val else ""
    
    @staticmethod
    def extract_openalex_citation_count(paper: Any) -> str:
        """Extract citation count from OpenAlex paper data."""
        cite_count = PaperDataMapper.safe_extract_field(
            paper,
            ['cited_by_count'],
            default=0
        )
        return str(cite_count) if cite_count else "0"
    
    @staticmethod
    def extract_openalex_venue_and_url(paper: Any) -> tuple[str, str]:
        """
        Extract venue and URL from OpenAlex paper data.
        
        Returns:
            Tuple of (venue, url)
        """
        venue = ""
        url = ""
        
        try:
            primary_location = PaperDataMapper.safe_extract_field(
                paper,
                ['primary_location'],
                default=None
            )
            
            if primary_location:
                # Extract venue from source
                if hasattr(primary_location, 'get'):
                    source = primary_location.get('source', {})  # type: ignore
                    if source and hasattr(source, 'get'):
                        venue = str(source.get('display_name', ''))  # type: ignore
                    url = str(primary_location.get('landing_page_url', ''))  # type: ignore
                elif hasattr(primary_location, 'source'):
                    source = getattr(primary_location, 'source', None)
                    if source:
                        venue = str(getattr(source, 'display_name', ''))
                    url = str(getattr(primary_location, 'landing_page_url', ''))
                    
        except Exception:
            debug_logger.debug("Failed to extract venue/URL from primary_location")
        
        # Try DOI if no URL found
        if not url:
            doi = PaperDataMapper.safe_extract_field(
                paper,
                ['doi'],
                default=""
            )
            if doi:
                url = str(doi)
        
        return venue, url
    
    @staticmethod
    def extract_openalex_abstract(paper: Any) -> str:
        """Extract and reconstruct abstract from OpenAlex inverted index."""
        try:
            abstract_inverted_index = PaperDataMapper.safe_extract_field(
                paper,
                ['abstract_inverted_index'],
                default=None
            )
            
            if not abstract_inverted_index or not isinstance(abstract_inverted_index, dict):
                return ""
            
            # Reconstruct abstract from inverted index
            # Create a list to hold words at their positions
            word_positions = []
            
            for word, positions in abstract_inverted_index.items():
                if isinstance(positions, list):
                    for position in positions:
                        if isinstance(position, int) and position >= 0:
                            word_positions.append((position, word))
            
            # Sort by position and extract words
            word_positions.sort(key=lambda x: x[0])
            words = [word for _, word in word_positions]
            
            # Join words to form the abstract
            abstract = ' '.join(words)
            return abstract
            
        except Exception as e:
            debug_logger.debug(f"Failed to extract abstract from inverted index: {str(e)}")
            return ""
    
    @staticmethod
    def extract_openalex_id(paper: Any) -> str:
        """Extract and clean OpenAlex ID from paper data."""
        paper_id = PaperDataMapper.safe_extract_field(
            paper,
            ['id'],
            default=""
        )
        
        if paper_id:
            paper_id_str = str(paper_id)
            # Remove OpenAlex URL prefix if present
            if paper_id_str.startswith('https://openalex.org/'):
                return paper_id_str.replace('https://openalex.org/', '')
            return paper_id_str
            
        return ""
    
    @staticmethod
    def map_openalex_paper(paper: Any, query: str) -> PaperInfo:
        """
        Map OpenAlex paper data to PaperInfo object.
        
        Args:
            paper: OpenAlex paper data
            query: Original search query for topic field
            
        Returns:
            PaperInfo object with extracted data
        """
        title = PaperDataMapper.extract_openalex_title(paper)
        authors = PaperDataMapper.extract_openalex_authors(paper)
        abstract = PaperDataMapper.extract_openalex_abstract(paper)
        year = PaperDataMapper.extract_openalex_year(paper)
        citation_count = PaperDataMapper.extract_openalex_citation_count(paper)
        venue, url = PaperDataMapper.extract_openalex_venue_and_url(paper)
        openalex_id = PaperDataMapper.extract_openalex_id(paper)
        
        return PaperInfo(
            title=title,
            authors=authors,
            abstract=abstract,
            url=url,
            topic=query,
            year=year,
            venue=venue,
            citationCount=citation_count,
            id=openalex_id
        )

class PaperSearchProvider(ABC):
    """Abstract base class for paper search providers."""
    
    @abstractmethod
    def search_papers(self, query: str, num_results: int = 10) -> List[PaperInfo]:
        """Search for papers by query."""
        pass
    
    @abstractmethod
    def get_papers_by_ids(self, ids: List[str]) -> List[PaperInfo]:
        """Get papers by their IDs."""
        pass
    
    @abstractmethod
    def get_papers_by_author_id(self, author_id: str, limit: int = 10) -> List[PaperInfo]:
        """Get papers by author ID."""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider."""
        pass

class SemanticScholarProvider(PaperSearchProvider):
    """Semantic Scholar API provider."""
    
    def __init__(self, timeout: float = 60.0):
        self.timeout = timeout
        if not app_settings.s2_api_key:
            raise ValueError("S2_API_KEY is required for Semantic Scholar API")
        self.client = SemanticScholar(
            api_key=app_settings.s2_api_key,
            timeout=int(timeout)
        )
    
    @property
    def name(self) -> str:
        return "Semantic Scholar"
    
    @exponential_backoff_retry()
    def search_papers(self, query: str, num_results: int = 10) -> List[PaperInfo]:
        """Search papers using Semantic Scholar API."""
        debug_logger.info(f"=== {self.name} search_papers STARTED ===")
        debug_logger.info(f"Input parameters: query='{query}', num_results={num_results}")
        
        try:
            debug_logger.info(f"Calling {self.name} API with query='{query}', limit={num_results}")
            papers = self.client.search_paper(query, limit=num_results)
            
            debug_logger.info(f"API returned {len(papers)} papers")
            res: List[PaperInfo] = []
            
            papers_to_process = list(papers)[:num_results] if papers else []
            debug_logger.info(f"Processing first {len(papers_to_process)} papers")
            
            for i, paper in enumerate(papers_to_process):
                debug_logger.debug(f"Processing paper {i+1}/{len(papers_to_process)}")
                debug_logger.debug(f"Paper ID: {paper.paperId}")
                
                try:
                    paper_info = PaperInfo(
                        title=paper.title or "",
                        authors=[a.name for a in paper.authors] if paper.authors else [],
                        abstract=paper.abstract or "",
                        url=paper.url or "",
                        topic=query,
                        year=str(paper.year) if paper.year else "",
                        venue=str(paper.venue) if paper.venue else "",
                        citationCount=str(paper.citationCount) if paper.citationCount else "0",
                        id=paper.paperId or ""
                    )
                    res.append(paper_info)
                    debug_logger.debug(f"Successfully processed paper {i+1}")
                    
                except Exception as e:
                    debug_logger.error(f"Error processing paper {i+1} (ID: {paper.paperId}): {str(e)}")
                    continue
            
            debug_logger.info(f"Successfully processed {len(res)} papers")
            debug_logger.info(f"=== {self.name} search_papers COMPLETED ===")
            return res
            
        except Exception as e:
            debug_logger.error(f"=== {self.name} search_papers FAILED ===")
            debug_logger.error(f"Error: {str(e)}")
            raise
    
    @exponential_backoff_retry()
    def get_papers_by_ids(self, ids: List[str]) -> List[PaperInfo]:
        """Get papers by their Semantic Scholar IDs."""
        papers = self.client.get_papers(ids)
        if isinstance(papers, tuple):
            papers = papers[0]  # Handle tuple return type
        
        result = []
        for paper in papers:
            if paper:  # Skip None results
                paper_info = PaperInfo(
                    title=paper.title or "",
                    authors=[a.name for a in paper.authors] if paper.authors else [],
                    abstract=paper.abstract or "",
                    url=paper.url or "",
                    topic="",
                    year=str(paper.year) if paper.year else "",
                    venue=str(paper.venue) if paper.venue else "",
                    citationCount=str(paper.citationCount) if paper.citationCount else "0",
                    id=paper.paperId or ""
                )
                result.append(paper_info)
        return result
    
    @exponential_backoff_retry()
    def get_papers_by_author_id(self, author_id: str, limit: int = 10) -> List[PaperInfo]:
        """Get papers by Semantic Scholar author ID."""
        papers_result = self.client.get_author_papers(author_id, limit=limit)
        
        # Handle PaginatedResults
        papers = list(papers_result)[:limit] if papers_result else []
        
        result = []
        for paper in papers:
            paper_info = PaperInfo(
                title=paper.title or "",
                authors=[a.name for a in paper.authors] if paper.authors else [],
                abstract=paper.abstract or "",
                url=paper.url or "",
                topic="",
                year=str(paper.year) if paper.year else "",
                venue=str(paper.venue) if paper.venue else "",
                citationCount=str(paper.citationCount) if paper.citationCount else "0",
                id=paper.paperId or ""
            )
            result.append(paper_info)
        return result

class OpenAlexProvider(PaperSearchProvider):
    """OpenAlex API provider."""
    
    def __init__(self, timeout: float = 60.0):
        self.timeout = timeout
    
    @property
    def name(self) -> str:
        return "OpenAlex"
    
    @exponential_backoff_retry()
    def search_papers(self, query: str, num_results: int = 10) -> List[PaperInfo]:
        """Search papers using OpenAlex API."""
        debug_logger.info(f"=== {self.name} search_papers STARTED ===")
        debug_logger.info(f"Input parameters: query='{query}', num_results={num_results}")
        
        try:
            debug_logger.info("Initializing OpenAlex API client via pyalex")
            works_query = Works().search(query).filter(has_abstract="true")
            raw_response = works_query.get()
            
            # Validate and extract OpenAlexResponseList from response
            if isinstance(raw_response, tuple):
                # Handle tuple response - first element should be the papers list
                papers_data = raw_response[0]
                if not isinstance(papers_data, list):
                    debug_logger.error(f"Expected OpenAlexResponseList in tuple, got {type(papers_data)}")
                    raise TypeError(f"Expected OpenAlexResponseList in tuple, got {type(papers_data)}")
                papers = papers_data
            elif isinstance(raw_response, list):
                # Direct list response
                papers = raw_response
            else:
                debug_logger.error(f"Unexpected response type from OpenAlex API: {type(raw_response)}. Expected OpenAlexResponseList or tuple containing it.")
                raise TypeError(f"Unexpected response type from OpenAlex API: {type(raw_response)}. Expected OpenAlexResponseList or tuple containing it.")
            
            debug_logger.info(f"API returned {len(papers)} papers")
            res: List[PaperInfo] = []
            
            papers_to_process = papers[:num_results] if papers else []
            debug_logger.info(f"Processing first {len(papers_to_process)} papers")
            
            for i, paper in enumerate(papers_to_process):
                debug_logger.debug(f"Processing paper {i+1}/{len(papers_to_process)}")
                
                try:
                    # Use PaperDataMapper for clean field extraction
                    paper_info = PaperDataMapper.map_openalex_paper(paper, query)
                    res.append(paper_info)
                    debug_logger.debug(f"Successfully processed paper {i+1}")
                    
                except Exception as e:
                    debug_logger.error(f"Error processing paper {i+1}: {str(e)}")
                    continue
            
            debug_logger.info(f"Successfully processed {len(res)} papers")
            debug_logger.info(f"=== {self.name} search_papers COMPLETED ===")
            return res
            
        except Exception as e:
            debug_logger.error(f"=== {self.name} search_papers FAILED ===")
            debug_logger.error(f"Error: {str(e)}")
            raise
    
    @exponential_backoff_retry()
    def get_papers_by_ids(self, ids: List[str]) -> List[PaperInfo]:
        """Get papers by their OpenAlex IDs."""
        debug_logger.info(f"=== {self.name} get_papers_by_ids STARTED ===")
        debug_logger.info(f"Input parameters: ids={ids} (count: {len(ids)})")
        
        if not ids:
            debug_logger.info("No IDs provided, returning empty list")
            return []
        
        try:
            result = []
            
            # Normalize IDs to handle both full URLs and short format
            normalized_ids = []
            for paper_id in ids:
                if paper_id.startswith('https://openalex.org/'):
                    normalized_ids.append(paper_id)
                elif paper_id.startswith('W'):
                    normalized_ids.append(f'https://openalex.org/{paper_id}')
                else:
                    # Try to add W prefix if it's just a number
                    try:
                        int(paper_id)
                        normalized_ids.append(f'https://openalex.org/W{paper_id}')
                    except ValueError:
                        normalized_ids.append(paper_id)  # Use as-is if can't parse
            
            debug_logger.info(f"Normalized {len(normalized_ids)} IDs")
            
            # for i, paper_id in enumerate(normalized_ids):
            #     debug_logger.debug(f"Processing ID {i+1}/{len(normalized_ids)}: {paper_id}")
                
            #     try:
            #         # Get individual work by ID
            #         work = Works()[paper_id]
                    
            #         if work:
            #             debug_logger.debug(f"Successfully retrieved paper for ID: {paper_id}")
            #             # Use PaperDataMapper for consistent extraction
            #             paper_info = PaperDataMapper.map_openalex_paper(work, "")
            #             result.append(paper_info)
            #         else:
            #             debug_logger.warning(f"No paper found for ID: {paper_id}")
                        
            #     except Exception as e:
            #         debug_logger.error(f"Error retrieving paper ID {paper_id}: {str(e)}")
            #         # Continue with other IDs instead of failing completely
            #         continue
            works = Works()[normalized_ids]
            result = [PaperDataMapper.map_openalex_paper(work, "") for work in works]
            
            debug_logger.info(f"Successfully retrieved {len(result)}/{len(ids)} papers")
            debug_logger.info(f"=== {self.name} get_papers_by_ids COMPLETED ===")
            return result
            
        except Exception as e:
            debug_logger.error(f"=== {self.name} get_papers_by_ids FAILED ===")
            debug_logger.error(f"Error: {str(e)}")
            raise
    
    def get_papers_by_author_id(self, author_id: str, limit: int = 10) -> List[PaperInfo]:
        """Get papers by OpenAlex author ID."""
        # This would require using the OpenAlex authors endpoint
        debug_logger.warning("get_papers_by_author_id not fully implemented for OpenAlex")
        return []

class PaperSearchManager:
    """Manager class that handles provider selection and fallback logic."""
    
    def __init__(self, config: Optional[SearchConfig] = None):
        self.config = config or search_config
        self.providers: Dict[SearchProvider, PaperSearchProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize the available providers."""
        try:
            self.providers[SearchProvider.SEMANTIC_SCHOLAR] = SemanticScholarProvider(
                timeout=self.config.timeout_threshold
            )
        except Exception as e:
            debug_logger.warning(f"Failed to initialize Semantic Scholar provider: {e}")
        
        try:
            self.providers[SearchProvider.OPENALEX] = OpenAlexProvider(
                timeout=self.config.timeout_threshold
            )
        except Exception as e:
            debug_logger.warning(f"Failed to initialize OpenAlex provider: {e}")
    
    def search_papers(self, query: str, num_results: int = 10) -> List[PaperInfo]:
        """
        Search for papers using the configured providers with fallback logic.
        
        Args:
            query: Search query string
            num_results: Number of results to return
            
        Returns:
            List of PaperInfo objects
        """
        primary_provider = self.providers.get(self.config.primary_provider)
        if not primary_provider:
            raise ValueError(f"Primary provider {self.config.primary_provider} not available")
        
        try:
            debug_logger.info(f"Attempting {primary_provider.name} as primary provider")
            return primary_provider.search_papers(query, num_results)
        
        except Exception as primary_error:
            debug_logger.warning(f"{primary_provider.name} failed: {str(primary_error)}")
            
            if not self.config.enable_fallback:
                debug_logger.info("Fallback disabled, re-raising primary error")
                raise primary_error
            
            # Check if this is a retryable error for fallback
            if _is_retryable_error(primary_error):
                fallback_provider = self.providers.get(self.config.fallback_provider)
                if fallback_provider and fallback_provider != primary_provider:
                    try:
                        debug_logger.info(f"Attempting {fallback_provider.name} as fallback")
                        return fallback_provider.search_papers(query, num_results)
                    except Exception as fallback_error:
                        debug_logger.error(f"Fallback {fallback_provider.name} also failed: {str(fallback_error)}")
                        # Re-raise the original primary error
                        raise primary_error
                else:
                    debug_logger.warning("No suitable fallback provider available")
            
            # Re-raise the primary error
            raise primary_error
    
    def get_papers_by_ids(self, ids: List[str]) -> List[PaperInfo]:
        """
        Get papers by their IDs using smart routing based on ID format.
        
        Args:
            ids: List of paper IDs (mixed OpenAlex and Semantic Scholar)
            
        Returns:
            List of PaperInfo objects from appropriate providers
            
        ID Routing Logic:
        - IDs starting with 'W' -> OpenAlex provider
        - All other IDs -> Semantic Scholar provider  
        """
        debug_logger.info(f"Smart routing get_papers_by_ids with {len(ids)} IDs")
        
        if not ids:
            return []
        
        # Split IDs by type
        openalex_ids = []
        semantic_scholar_ids = []
        
        for paper_id in ids:
            if str(paper_id).startswith('W'):
                openalex_ids.append(paper_id)
                debug_logger.debug(f"Routing to OpenAlex: {paper_id}")
            else:
                semantic_scholar_ids.append(paper_id)
                debug_logger.debug(f"Routing to Semantic Scholar: {paper_id}")
        
        debug_logger.info(f"Split: {len(openalex_ids)} OpenAlex, {len(semantic_scholar_ids)} Semantic Scholar")
        
        results = []
        
        # Get papers from OpenAlex if we have OpenAlex IDs
        if openalex_ids:
            openalex_provider = self.providers.get(SearchProvider.OPENALEX)
            if openalex_provider:
                try:
                    debug_logger.info(f"Fetching {len(openalex_ids)} papers from OpenAlex")
                    openalex_results = openalex_provider.get_papers_by_ids(openalex_ids)
                    results.extend(openalex_results)
                    debug_logger.info(f"Retrieved {len(openalex_results)} papers from OpenAlex")
                except Exception as e:
                    debug_logger.error(f"OpenAlex get_papers_by_ids failed: {str(e)}")
            else:
                debug_logger.warning("OpenAlex provider not available for ID routing")
        
        # Get papers from Semantic Scholar if we have Semantic Scholar IDs
        if semantic_scholar_ids:
            s2_provider = self.providers.get(SearchProvider.SEMANTIC_SCHOLAR)
            if s2_provider:
                try:
                    debug_logger.info(f"Fetching {len(semantic_scholar_ids)} papers from Semantic Scholar")
                    s2_results = s2_provider.get_papers_by_ids(semantic_scholar_ids)
                    results.extend(s2_results)
                    debug_logger.info(f"Retrieved {len(s2_results)} papers from Semantic Scholar")
                except Exception as e:
                    debug_logger.error(f"Semantic Scholar get_papers_by_ids failed: {str(e)}")
            else:
                debug_logger.warning("Semantic Scholar provider not available for ID routing")
        
        debug_logger.info(f"Smart routing completed: {len(results)} total papers retrieved")
        return results
    
    def get_papers_by_author_id(self, author_id: str, limit: int = 10) -> List[PaperInfo]:
        """Get papers by author ID using the primary provider."""
        primary_provider = self.providers.get(self.config.primary_provider)
        if not primary_provider:
            raise ValueError(f"Primary provider {self.config.primary_provider} not available")
        
        return primary_provider.get_papers_by_author_id(author_id, limit)

# Global paper search manager
_paper_search_manager: Optional[PaperSearchManager] = None

def get_paper_search_manager() -> PaperSearchManager:
    """Get or create the global paper search manager."""
    global _paper_search_manager
    if _paper_search_manager is None:
        _paper_search_manager = PaperSearchManager()
    return _paper_search_manager

def reset_paper_search_manager():
    """Reset the global paper search manager (useful for configuration changes)."""
    global _paper_search_manager
    _paper_search_manager = None

# Public API functions (backward compatibility)
def search_paper_by_query(query: str, num_results: int = 10) -> List[PaperInfo]:
    """
    Search for papers by query using the configured providers.
    
    Args:
        query: Search query string
        num_results: Number of results to return
        
    Returns:
        List of PaperInfo objects
    """
    return get_paper_search_manager().search_papers(query, num_results)

def retrieve_papers_by_ids(ids: List[str]) -> List[PaperInfo]:
    """
    Retrieve papers by their IDs.
    
    Args:
        ids: List of paper IDs
        
    Returns:
        List of PaperInfo objects
    """
    return get_paper_search_manager().get_papers_by_ids(ids)

def retrieve_papers_by_author_id(author_id: str, limit: int = 10) -> List[PaperInfo]:
    """
    Retrieve papers by author ID.
    
    Args:
        author_id: Author ID
        limit: Maximum number of papers to return
        
    Returns:
        List of PaperInfo objects
    """
    return get_paper_search_manager().get_papers_by_author_id(author_id, limit)

# Legacy functions for backward compatibility
def search_paper_by_query_openalex(query: str, num_results: int = 10) -> List[PaperInfo]:
    """Legacy function - use OpenAlex provider directly."""
    provider = OpenAlexProvider()
    return provider.search_papers(query, num_results)

def _search_paper_by_query_s2(query: str, num_results: int = 10) -> List[PaperInfo]:
    """Legacy function - use Semantic Scholar provider directly."""
    provider = SemanticScholarProvider()
    return provider.search_papers(query, num_results)

class BatchCallback(BaseCallbackHandler):
    def __init__(self, total: int):
        super().__init__()
        self.count = 0
        self.progress_bar = tqdm(total=total)

    def on_llm_end(self, response, *, run_id: UUID, parent_run_id: UUID | None = None, **kwargs: Any) -> Any:
        self.count += 1
        self.progress_bar.update(1)

def load_persona_profile(agent_name: str, user_id: str | None = None) -> dict:
    """
    Utility function to load the persona profile for a given agent.

    Parameters:
    - agent_name: The name of the agent whose profile is to be loaded.
    - user_id: The user ID to identify user-specific agent profiles.

    Returns:
    - A dictionary containing the persona profile if the file exists.
      Returns an empty dictionary if the persona_profile.json file does not exist.
    """
    if user_id:
        agent_folder = os.path.join(app_settings.lightrag_working_dir, user_id, agent_name, "default")
    else:
        agent_folder = os.path.join(app_settings.lightrag_working_dir, agent_name, "default")
    
    profile_path = os.path.join(agent_folder, "persona_profile.json")
    
    if not os.path.exists(profile_path):
        return {}
    
    with open(profile_path, "r") as file:
        persona_profile = json.load(file)
    
    return persona_profile