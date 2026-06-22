from typing import List, Dict, Any, Tuple

import os
import time
import json

from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.output_parsers import JsonOutputParser, PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langchain.output_parsers import RetryOutputParser
from langchain_core.runnables import RunnableLambda
from langchain_core.rate_limiters import InMemoryRateLimiter
import tiktoken

from settings import app_settings

from app.app_types.persona_types import Persona, PersonaWithNarrative, ChatMessage, GeneratePersonaQuestionsSuggestionsRequest, ProjectSummaryReport
from app.app_types.idea_types import PaperInfo, SearchQuery
from app.prompts.persona import get_persona_generation_taxonomy_prompt, get_persona_agent_prompt, \
    get_plain_agent_prompt, get_inquisitive_questions_prompt, get_inquisitive_questions_with_dialogue_history_prompt, \
        get_single_persona_generation_taxonomy_prompt, get_generate_thread_suggestions_prompt, get_project_summary_report_prompt
from app.prompts.judge import get_judge_idea_all_prompt
from app.prompts.paper2table import get_scheme_attribute_generation_prompt, get_column_value_extraction_prompt, \
    get_persona_additional_scheme_attribute_generation_prompt, get_persona_additional_column_value_extraction_prompt, get_persona_desc_edits_prompt, \
    get_persona_table_generation_prompt
from app.templates import get_default_persona_template
from app.app_types.idea_types import Idea, Ideas
from app.agents.utils import search_paper_by_query, BatchCallback
from app.prompts.search import get_search_query_and_sub_query_prompt
from app.agents.rerankers import create_reranker
from app.chains import formatting_personas_for_frontend

from tqdm import tqdm
import logging
logger = logging.getLogger(__name__)

class PersonaAgent:
    def __init__(self, model: str = None, temperature: float = 1):
        if model is None:
            model = app_settings.openai_model
        self.taxonomy = get_default_persona_template()
        # base model
        if app_settings.openai_api_type == "openai":
            self.model = ChatOpenAI(
                api_key=app_settings.openai_api_key,
                base_url=app_settings.openai_api_base,
                model=model,
                temperature=temperature,
                # rate_limiter=InMemoryRateLimiter(
                #     requests_per_second=50,  # <-- Can only make a request once every 10 seconds!!
                #     check_every_n_seconds=0.1,  # Wake up every 100 ms to check whether allowed to make a request,
                #     max_bucket_size=10,  # Controls the maximum burst size.
                # ),
                max_retries=3
            )
        elif app_settings.openai_api_type == "azure":
            self.model = AzureChatOpenAI(
                api_key=app_settings.openai_api_key,
                azure_endpoint=app_settings.openai_api_base,
                api_version=app_settings.openai_api_version,
                azure_deployment=model,
                temperature=temperature,
                # rate_limiter=InMemoryRateLimiter(
                #     requests_per_second=50,  # <-- Can only make a request once every 10 seconds!!
                #     check_every_n_seconds=0.1,  # Wake up every 100 ms to check whether allowed to make a request,
                #     max_bucket_size=10,  # Controls the maximum burst size.
                # ),
                max_retries=3
            )

        # prompt templates
        self.persona_taxonomy_prompt = PromptTemplate(
            template=get_persona_generation_taxonomy_prompt(),
            input_variables=["taxonomy", "topic", "literature_review"]
        )
        self.persona_agent_prompt = PromptTemplate(
            template=get_persona_agent_prompt(),
            input_variables=["persona", "topic", "literature_review"]
        )
        self.plain_agent_prompt = PromptTemplate(
            template=get_plain_agent_prompt(),
            input_variables=["topic", "literature_review"]
        )
        self.search_query_prompt = PromptTemplate(
            template=get_search_query_and_sub_query_prompt(),
            input_variables=["topic"]
        )
        self.inquisitive_questions_prompt = PromptTemplate(
            template=get_inquisitive_questions_prompt(),
            input_variables=["persona", "topic"]
        )
        ## prompts for paper2table generation
        self.scheme_attribute_generation_prompt = PromptTemplate(
            template=get_scheme_attribute_generation_prompt(),
            input_variables=["num_attributes", "formatted_papers"]
        )
        self.column_value_extraction_prompt = PromptTemplate(
            template=get_column_value_extraction_prompt(),
            input_variables=["column_names", "paper_content"]
        )
        self.persona_additional_scheme_attribute_generation_prompt = PromptTemplate(
            template=get_persona_additional_scheme_attribute_generation_prompt(),
            input_variables=["num_attributes", "formatted_papers", "persona_description", "past_table_values"]
        )
        self.persona_additional_column_value_extraction_prompt = PromptTemplate(
            template=get_persona_additional_column_value_extraction_prompt(),
            input_variables=["column_names", "paper_content", "persona_description"]
        )
        self.persona_desc_edits_prompt = PromptTemplate(
            template=get_persona_desc_edits_prompt(),
            input_variables=["instruction", "original_persona"]
        )
        self.persona_questions_suggestions_prompt = PromptTemplate(
            template=get_inquisitive_questions_with_dialogue_history_prompt(),
            input_variables=["persona", "topic", "dialogue_history"]
        )
        self.persona_table_generation_prompt = PromptTemplate(
            template=get_persona_table_generation_prompt(),
            input_variables=["personas", "dialogue_history"]
        )
        self.single_persona_generation_taxonomy_prompt = PromptTemplate(
            template=get_single_persona_generation_taxonomy_prompt(),
            input_variables=["papers", "taxonomy"]
        )
        self.generate_thread_suggestions_prompt = PromptTemplate(
            template=get_generate_thread_suggestions_prompt(),
            input_variables=["high_level_idea"]
        )
        self.project_summary_report_prompt = PromptTemplate(
            template=get_project_summary_report_prompt(),
            input_variables=["discussion_threads", "favorited_posts"]
        )

        # output parser
        self.persona_parser = JsonOutputParser(pydantic_object=List[Persona])
        self.single_idea_parser = JsonOutputParser(pydantic_object=Idea)
        self.single_idea_parser_with_retry = RetryOutputParser.from_llm(parser=self.single_idea_parser, llm=self.model, max_retries=1)
        self.ideas_parser = JsonOutputParser(pydantic_object=Ideas)
        self.search_query_parser = JsonOutputParser(pydantic_object=List[SearchQuery])
        self.inquisitive_questions_parser = JsonOutputParser(pydantic_object=List[str])
        self.scheme_attribute_parser = JsonOutputParser(pydantic_object=Dict[str, Any])
        self.table_value_parser = JsonOutputParser(pydantic_object=Dict[str, Any])
        self.persona_desc_edits_parser = JsonOutputParser(pydantic_object=Dict[str, Any])
        self.single_persona_with_narrative_parser = JsonOutputParser(pydantic_object=PersonaWithNarrative)
        self.thread_suggestions_parser = JsonOutputParser(pydantic_object=List[Dict[str, Any]])
        self.project_summary_report_parser = JsonOutputParser(pydantic_object=ProjectSummaryReport)
        # chains
        self.persona_generation_chain = self.persona_taxonomy_prompt | self.model | self.persona_parser
        # self.persona_agent_chain = self.persona_agent_prompt | self.model | self.single_idea_parser_with_retry
        self.persona_agent_chain = self.persona_agent_prompt | self.model | RunnableLambda(lambda x: self.single_idea_parser_with_retry.parse_with_prompt(
            completion=x.content, prompt_value=self.persona_agent_prompt.format_prompt(
                topic="[TOPIC]",
                persona="[PERSONA]",
                literature_review="[LITERATURE_REVIEW]"
                )
            )
        )
        self.plain_agent_chain = self.plain_agent_prompt | self.model | self.ideas_parser
        self.search_query_chain = self.search_query_prompt | self.model | self.search_query_parser
        self.inquisitive_questions_chain = self.inquisitive_questions_prompt | self.model | self.inquisitive_questions_parser
        self.scheme_attribute_chain = self.scheme_attribute_generation_prompt | self.model | self.scheme_attribute_parser
        self.table_value_chain = self.column_value_extraction_prompt | self.model | self.table_value_parser
        self.persona_additional_attribute_chain = self.persona_additional_scheme_attribute_generation_prompt | self.model | self.scheme_attribute_parser
        self.persona_additional_column_value_chain = self.persona_additional_column_value_extraction_prompt | self.model | self.table_value_parser
        self.persona_desc_edits_chain = self.persona_desc_edits_prompt | self.model | self.persona_desc_edits_parser
        self.persona_questions_suggestions_chain = self.persona_questions_suggestions_prompt | self.model | self.inquisitive_questions_parser
        self.persona_table_generation_chain = self.persona_table_generation_prompt | self.model | self.table_value_parser
        self.single_persona_generation_taxonomy_chain = self.single_persona_generation_taxonomy_prompt | self.model | self.single_persona_with_narrative_parser
        self.generate_thread_suggestions_chain = self.generate_thread_suggestions_prompt | self.model | self.thread_suggestions_parser
        self.project_summary_report_chain = self.project_summary_report_prompt | self.model | self.project_summary_report_parser

    def generate_personas(self, topic: str, literature_review: str) -> List[dict]:
        return self.persona_generation_chain.invoke({"taxonomy": self.taxonomy, "topic": topic, "literature_review": literature_review})
    
    def generate_single_persona_with_narrative(self, papers: List[PaperInfo]) -> PersonaWithNarrative:
        return self.single_persona_generation_taxonomy_chain.invoke({
            "papers": self.format_papers_for_llm(papers), 
            "taxonomy": self.taxonomy
        })
    
    def generate_idea_persona_agent(self, persona: dict, topic: str, literature_review: str) -> dict:
        return self.persona_agent_chain.invoke({"persona": persona, "topic": topic, "literature_review": literature_review})
    
    def generate_idea_persona_agent_batch(self, personas: List[dict], topic: str, literature_review: str) -> dict[str, dict]:
        callback = BatchCallback(len(personas))
        res = self.persona_agent_chain.batch(
            inputs=[{"persona": persona, "topic": topic, "literature_review": literature_review} for persona in personas],
            config={"callbacks": [callback], "max_concurrency": 100}
        )
        # zip the results with the persona names
        res = {persona["persona_name"]: idea for persona, idea in zip(personas, res)}
        return res
    
    def generate_ideas_plain_agent(self, topic: str, literature_review: str) -> List[dict]:
        return self.plain_agent_chain.invoke({"topic": topic, "literature_review": literature_review})
    

    def format_papers_for_llm(self, papers: List[PaperInfo]) -> str:
        # text = "\n\n".join([f"<paper>\nTitle: {p.title}\nAuthors: {', '.join([d.name for d in p.authors])}\nAbstract: {p.abstract}\n</paper>" for p in papers])
        text = "\n\n".join([f"<paper>\nTitle: {p.title}\nAuthors: {p.authors}\nAbstract: {p.abstract}\n</paper>" for p in papers])
        return text
    
    def generate_literature_review_from_papers(self, papers: List[PaperInfo]) -> str:
        # for now, just use the abstract, but format it nicely for LLM consumption
        return self.format_papers_for_llm(papers)
    
    def generate_search_queries_from_topic(self, topic: str) -> List[SearchQuery]:
        return self.search_query_chain.invoke({"topic": topic})
    
    def rerank_papers(self, query: str, papers: List, topk: int=10) -> List[Dict[str, Any]]:
        try:
            reranker = create_reranker()
            reranker.connect()
        except Exception as e:
            logger.error(f"Failed to connect to reranker: {e}")
            reranker = None
        if reranker is None:
            return papers[:topk] # return top-k papers if reranker is not available
        
        try:
            papers = reranker.rerank_papers(query, papers, topk) 
        except Exception as e:
            logger.error(f"Failed to rerank papers: {e}")
            papers = papers[:topk] # return top-k papers if reranking fails
        
        return papers

    def generate_personas_from_topic(self, topic: str) -> List[dict]:
        search_queries = self.generate_search_queries_from_topic(topic)
        # validate into pydantic object
        search_queries = [SearchQuery.model_validate(query) for query in search_queries]
        flattened_queries = []
        for query in search_queries:
            # flatten the queries
            flattened_queries.append(query.search_query)
            flattened_queries.extend([sub_query["sub_query"] for sub_query in query.sub_queries])
        papers = []
        for query in tqdm(flattened_queries, desc="Searching papers..."):
            papers.extend(search_paper_by_query(query, num_results=10))
        # rerank papers
        papers = self.rerank_papers(topic, [dict(paper) for paper in papers], topk=10)
        papers = [PaperInfo.model_validate(paper) for paper in papers]
        literature_review = self.generate_literature_review_from_papers(papers)
        return self.generate_personas(topic, literature_review), literature_review
    
    def search_papers_from_topic(self, topic: str) -> List[PaperInfo]:
        search_queries = self.generate_search_queries_from_topic(topic)
        # validate into pydantic object
        search_queries = [SearchQuery.model_validate(query) for query in search_queries]
        flattened_queries = []
        for query in search_queries:
            # flatten the queries
            flattened_queries.append(query.search_query)
            flattened_queries.extend([sub_query["sub_query"] for sub_query in query.sub_queries])
        papers = []
        for query in tqdm(flattened_queries, desc="Searching papers..."):
            papers.extend(search_paper_by_query(query, num_results=10))
            # time.sleep(1)
        # rerank papers
        papers = self.rerank_papers(topic, [dict(paper) for paper in papers], topk=10)
        papers = [PaperInfo.model_validate(paper) for paper in papers]
        # deduplicate papers by id
        seen_ids = set()
        papers = [paper for paper in papers if paper.id not in seen_ids and not seen_ids.add(paper.id)]
        return papers
    
    def generate_personas_from_papers_topic(self, topic: str, papers: List[PaperInfo]) -> Tuple[List[dict], str]:
        literature_review = self.generate_literature_review_from_papers(papers)
        personas = self.generate_personas(topic, literature_review)
        personas = [formatting_personas_for_frontend(persona) for persona in personas]
        return personas, literature_review
    
    def generate_inquisitive_questions_from_persona(self, persona: dict, topic: str) -> List[str]:
        return self.inquisitive_questions_chain.invoke({"persona": persona, "topic": topic})
    
    def generate_scheme_attribute_from_papers(self, num_attributes: int, papers: List[PaperInfo]) -> Dict[str, List[str]]:
        return self.scheme_attribute_chain.invoke({"num_attributes": num_attributes, "formatted_papers": self.format_papers_for_llm(papers)})
    
    def generate_table_values_from_papers(self, column_names: Dict[str, List[str]], papers: List[PaperInfo]) -> Dict[str, Any]:
        packed_inputs = []
        for paper in papers:
            packed_inputs.append({"column_names": column_names, "paper_content": self.format_papers_for_llm([paper])})
        return self.table_value_chain.batch(inputs=packed_inputs, config={"max_concurrency": 10})
    
    def generate_persona_additional_attributes(self, num_attributes: int, papers: List[PaperInfo], persona_description: str, past_table_values: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        return self.persona_additional_attribute_chain.invoke({"num_attributes": num_attributes, "formatted_papers": self.format_papers_for_llm(papers), "persona_description": persona_description, "past_table_values": past_table_values})
    
    def generate_persona_additional_column_values(self, column_names: Dict[str, List[str]], papers: List[PaperInfo], persona_description: str) -> Dict[str, Any]:
        packed_inputs = []
        for paper in papers:
            packed_inputs.append({"column_names": column_names, "paper_content": self.format_papers_for_llm([paper]), "persona_description": persona_description})
        return self.persona_additional_column_value_chain.batch(inputs=packed_inputs, config={"max_concurrency": 10})
    
    def generate_persona_desc_edits(self, instruction: str, original_persona: str) -> Dict[str, Any]:
        return self.persona_desc_edits_chain.invoke({"instruction": instruction, "original_persona": original_persona})
    
    def generate_persona_questions_suggestions(self, persona: dict, topic: str, dialogue_history: List[ChatMessage]) -> List[str]:
        return self.persona_questions_suggestions_chain.invoke({"persona": persona, "topic": topic, "dialogue_history": dialogue_history})

    def generate_table_from_dialogue_history(self, dialogue_history: List[ChatMessage], personas: List[dict]) -> Dict[str, Any]:
        return self.persona_table_generation_chain.invoke({"personas": personas, "dialogue_history": dialogue_history})

    def generate_thread_suggestions(self, high_level_idea: str) -> List[Dict[str, Any]]:
        return self.generate_thread_suggestions_chain.invoke({"high_level_idea": high_level_idea})

    def generate_project_summary_report(self, discussion_threads: List[Dict[str, Any]], favorited_posts: List[Dict[str, Any]]) -> ProjectSummaryReport:
        return self.project_summary_report_chain.invoke({"discussion_threads": discussion_threads, "favorited_posts": favorited_posts})

class LLMJudgeAgent:
    def __init__(self, model: str = None, temperature: float = 0.5):
        if model is None:
            model = app_settings.openai_model
        if app_settings.openai_api_type == "openai":
            self.model = ChatOpenAI(
                api_key=app_settings.openai_api_key,
                base_url=app_settings.openai_api_base,
                model=model,
                temperature=temperature
            )
        elif app_settings.openai_api_type == "azure":
            self.model = AzureChatOpenAI(
                api_key=app_settings.openai_api_key,
                azure_endpoint=app_settings.openai_api_base,
                api_version=app_settings.openai_api_version,
                azure_deployment=model, temperature=temperature)

        # templates
        self.judge_idea_all_prompt = PromptTemplate(
            template=get_judge_idea_all_prompt(),
            input_variables=["idea0", "idea1", "topic"]
        )

        # output parser
        self.judge_idea_all_parser = JsonOutputParser(pydantic_object=Dict[str, Any])

        # chains
        self.judge_idea_all_chain = self.judge_idea_all_prompt | self.model | self.judge_idea_all_parser

    def judge_idea_all(self, idea0: str, idea1: str, topic: str) -> Dict[str, Any]:
        return self.judge_idea_all_chain.invoke({"idea0": idea0, "idea1": idea1, "topic": topic})

    def judge_idea_all_batch(self, idea_pairs: List[Dict[str, Any]], topic: str) -> Dict[str, Dict[str, Any]]:
        callback = BatchCallback(len(idea_pairs))
        return self.judge_idea_all_chain.batch(
            inputs=[{"idea0": idea_pairs[i][0], "idea1": idea_pairs[i][1], "topic": topic} for i in range(len(idea_pairs))],
            config={"max_concurrency": 10, "callbacks": [callback]}
        )

    def estimate_cost(self, idea_pairs: List[Dict[str, Any]], topic: str) -> float:
        prompts = [self.judge_idea_all_prompt.format_prompt(idea0=idea_pairs[i][0], idea1=idea_pairs[i][1], topic=topic) for i in range(len(idea_pairs))]
        encoding = tiktoken.encoding_for_model(app_settings.openai_model)
        total_tokens = sum([len(encoding.encode(prompt.text)) for prompt in prompts])
        return total_tokens * 2.50 / 1_000_000 * 2 # cost per million tokens
