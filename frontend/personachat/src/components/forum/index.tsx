import { useEffect, useMemo, useState } from 'react'

import { AppSidebar } from "@/components/app-sidebar"
import { NavActions } from "@/components/nav-actions"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { useUserStudyLogger } from '@/utils/userStudyLogger'

import { Thread } from './components/ForumThread'
import { PersonaInspector } from './components/PersonaInspector'
import { ProposalNotes } from './components/ProposalNotes'
import { useAppStore } from '@/stores/appStore'
import { useApi } from '@/controller/API'
import { ChatMessageChunkStreaming, ForumThread, ForumThreadChunkStreaming, ForumThreadTopic, Persona } from '@/types'
import { Button } from '../ui/button'
import { ModeToggle } from '../themes/mode-toggle'
import { Textarea } from '../ui/textarea'
import { ScrollArea, ScrollBar } from '../ui/scroll-area'
import { FileTextIcon, CheckCircle, Lightbulb } from 'lucide-react'
// import { ThreadOutline } from './threadOutline'
import { Badge } from '@/components/ui/badge'
import MindMap from './components/MindMap'
import { createProgressTask } from '../ui/progress-panel'

// Example proposal data for development mode
const exampleProposal = {
  motivation: "Climate change and increasing extreme weather events pose significant threats to agriculture and food security worldwide. There's an urgent need to develop more resilient crop varieties that can withstand environmental stresses while maintaining productivity.",
  pastResearch: "Previous research has focused on conventional breeding techniques and single-gene genetic modifications. CRISPR/Cas9 technology has been used to modify drought and salt tolerance in some crops, but mainly through individual gene modifications. Multi-gene approaches remain challenging but promising.",
  method: "We propose using advanced CRISPR/Cas systems for simultaneous editing of multiple stress-responsive gene networks in staple crops. By targeting transcription factors that regulate stress response pathways, we can potentially improve resilience against multiple stressors simultaneously. We'll combine this with high-throughput phenotyping to rapidly assess performance under various stress conditions.",
  findings: "We hypothesize that crops with optimized stress-response pathways will show 30-50% greater yield stability under drought, heat stress, and flooding compared to conventional varieties. Secondary benefits may include enhanced nutrient use efficiency and reduced pesticide requirements due to improved general plant health."
};

export default function ForumPage() {
  // Define local state variables
  const [IsCreateNewThreadDialogOpen, setIsCreateNewThreadDialogOpen] = useState(false);
  const [isInitializeThreadsDialogOpen, setIsInitializeThreadsDialogOpen] = useState(false);
  const [threadTopicSuggestions, setThreadTopicSuggestions] = useState<ForumThreadTopic[]>([]);
  const [selectedThreadTopics, setSelectedThreadTopics] = useState<ForumThreadTopic[]>([]);
  const [isGeneratingThreads, setIsGeneratingThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [mindMapPanelSize, setMindMapPanelSize] = useState(40);
  const [forumThreadsPanelSize, setForumThreadsPanelSize] = useState(60);
  const [reportStartTime, setReportStartTime] = useState<number | null>(null);
  const [lastScrollLogTime, setLastScrollLogTime] = useState<number>(0);
  const [scrollDepthMarkers, setScrollDepthMarkers] = useState<Set<number>>(new Set([25, 50, 75, 100]));
  const [hasReachedBottom, setHasReachedBottom] = useState<boolean>(false);

  // Replace single initIdeaInput with structured sections
  const [ideaInputs, setIdeaInputs] = useState({
    motivation: "",
    pastResearch: "",
    method: "",
    findings: ""
  });
  const [initIdeaError, setInitIdeaError] = useState("");

  // App store states - include all required properties
  const { 
    threads, setThreads, addThread, deleteThread, updateThread,
    selectedThreadId, setSelectedThreadId,
    projectSummaryReport, setProjectSummaryReport,
    isGeneratingReport, setIsGeneratingReport,
    isReportDialogOpen, setIsReportDialogOpen,
    isShowingPersonaProfile, setIsShowingPersonaProfile,
    personas, addPersonas,
    selectedProjectId, setSelectedProjectId,
    projects, getSelectedProject,
    threadProjectMap, getThreadsForProject, getProjectForThread, 
    addThreadToProject, removeThreadFromProject,
    threadAgentParticipantsMap, getAgentParticipantsForThread,
    addAgentToThread, removeAgentFromThread,
    currentPanel, setCurrentPanel,
    personaProfileTemplate, setPersonaProfileTemplate,
    fullPersonaProfileTemplate, setFullPersonaProfileTemplate,
    agentCatalog, setAgentCatalog,
    agentActions, setAgentActions,
    threadProgressStatus, updateThreadProgressStatus, getThreadProgressStatus, clearThreadProgressStatus,
    favoritedPostIds, setFavoritedPostIds,
    isShowingMindMap, setIsShowingMindMap,
    resetAllThreadProgressStatus,
    updateProjectProposal,
    setIsProposalNoteVisible,
  } = useAppStore();

  const { getDummyThreads, runForumThreadSimulation, getAgentCatalog, getAgentActions, 
    getPersonaProfileTemplate, getFullPersonaProfileTemplate, generateThreadSuggestions,
    generateProjectSummaryReport, getFavoriteThreads, getFavoritedPostsAll, getFavoritedPostsByThread } = useApi();

  const [defaultLayout, setDefaultLayout] = useState([60, 40])

  // Add state for tracking fake progress percentage
  const [reportProgress, setReportProgress] = useState<number>(0);
  
  // Add state for tracking which panel is active in the initialize threads dialog
  const [activeInitPanel, setActiveInitPanel] = useState<'input' | 'suggestions'>('input');
  
  // Initialize the user study logger
  const logger = useUserStudyLogger();

  // Reset progress and set up progress increment when generating report
  useEffect(() => {
    if (isGeneratingReport) {
      setReportProgress(0);
      
      let progress = 0;
      let timer: NodeJS.Timeout;
      
      const updateProgress = () => {
        const remaining = 99 - progress;
        let increment;
        
        if (progress < 30) {
          increment = 2.25;
        } else if (progress < 60) {
          increment = 1.1;
        } else if (progress < 85) {
          increment = 0.6;
        } else {
          increment = 0.22;
        }
        // Add some randomness to make it look more realistic
        increment *= (0.8 + (Math.random() * 0.4));
        
        progress += increment;
        
        // Cap at 99%
        if (progress >= 99) {
          progress = 99;
        }
        
        setReportProgress(progress);
        
        if (isGeneratingReport && progress < 99) {
          const delay = progress < 80 ? 180 : 300;
          timer = setTimeout(updateProgress, delay);
        }
      };
      
      // Start the progress updates
      timer = setTimeout(updateProgress, 100);
      
      // Cleanup function
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    } else {
      // Reset progress when done
      setReportProgress(0);
    }
  }, [isGeneratingReport]);

  useEffect(() => {
    // Log page view when component loads
    logger.logPageView('forum-page', {
      project_id: selectedProjectId || 'none'
    });
    
    // getDummyThreads().then((res) => {
    //   addThread(res.data.threads)
    // })
    getPersonaProfileTemplate().then((res) => {
      setPersonaProfileTemplate(res.data.persona_profile_template)
    })
    getFullPersonaProfileTemplate().then((res) => {
      setFullPersonaProfileTemplate(res.data.persona_profile_template)
    })
    getAgentCatalog().then((res) => {
      setAgentCatalog(res.data.agent_catalog)
    })
    getAgentActions().then((res) => {
      setAgentActions(res.data.agent_actions)
    })
    
    loadFavoritedItems(); // Still try to load favorites even if thread fetch fails

    setIsGeneratingReport(false);

    resetAllThreadProgressStatus();
  }, [])

  const [newThreadTopic, setNewThreadTopic] = useState("");
  const [newThreadTopicDescription, setNewThreadTopicDescription] = useState("");
  const [generatedThreads, setGeneratedThreads] = useState<{topic: string, topic_description: string}[]>([]);
  const [selectedGeneratedThreads, setSelectedGeneratedThreads] = useState<{topic: string, topic_description: string}[]>([]);
  // Add state to track which thread is being edited
  const [editingThreadIndex, setEditingThreadIndex] = useState<number | null>(null);
  const [editedTopic, setEditedTopic] = useState<string>("");
  const [editedDescription, setEditedDescription] = useState<string>("");

  // Example thread suggestions for testing/fallback
  const exampleThreadSuggestions = [
    {
      topic: "The impact of large language models on creative industries",
      topic_description: "Exploring how AI tools like GPT-4 are transforming creative fields such as writing, art, music, and design."
    },
    {
      topic: "Ethical considerations in AI development",
      topic_description: "Discussing the ethical challenges that arise from developing increasingly capable AI systems and potential frameworks for addressing them."
    },
    {
      topic: "AI alignment research directions",
      topic_description: "Analyzing current approaches to ensuring AI systems remain aligned with human values and intentions as they become more powerful."
    },
    {
      topic: "Risks of AI automation on employment",
      topic_description: "Examining the potential effects of increased AI automation on job markets and strategies for workforce adaptation."
    }
  ];

  const suggestionTopics = [
    "AI for creative writing",
    "Machine learning in healthcare",
    "Future of autonomous vehicles",
    "Blockchain technology",
    "Ethics in AI"
  ];

  // Get filtered threads based on selected project
  const filteredThreads = useMemo(() => {
    // Reset scroll markers when project changes
    setScrollDepthMarkers(new Set([25, 50, 75, 100]));
    setHasReachedBottom(false);
    
    return getThreadsForProject(selectedProjectId);
  }, [threads, selectedProjectId, getThreadsForProject]);

  // Get the currently selected project
  const selectedProject = useMemo(() => {
    return getSelectedProject();
  }, [selectedProjectId, getSelectedProject]);

  // Function to generate the project summary report
  const handleGenerateReport = async (): Promise<void> => {
    if (!selectedProjectId || selectedProjectId === 'all' || filteredThreads.length === 0) {
      toast({
        title: "Cannot generate report",
        description: "Please select a project with threads first",
        variant: "destructive"
      });
      return;
    }

    // Log the button click
    logger.logInteraction('click', 'generate-report-button', {
      project_id: selectedProjectId,
      thread_count: filteredThreads.length,
      only_favorites: onlyFavorites
    });

    // Set flag to indicate report generation is in progress
    setIsGeneratingReport(true);
    const startTime = Date.now();
    setReportStartTime(startTime);

    // Log feature usage start
    logger.logFeatureUsage('report-generation', 'start', {
      project_id: selectedProjectId,
      thread_count: filteredThreads.length,
      only_favorites: onlyFavorites
    });

    try {
      const threads = filteredThreads;
      const threadIds = threads.map(thread => thread.discussion.id);
      
      // Only generate report for threads in the selected project
      const projectThreadIds = threadIds.filter(id => {
        const threadProjectId = getProjectForThread(id);
        return threadProjectId === selectedProjectId;
      });

      // Get agent participants for all threads in this project
      const allAgentParticipants = new Set<string>();
      projectThreadIds.forEach(threadId => {
        const participants = getAgentParticipantsForThread(threadId);
        participants.forEach(participant => {
          allAgentParticipants.add(participant.name);
        });
      });
    
      // Check if there are any favorited threads or posts when onlyFavorites is true
      if (onlyFavorites) {
        // Check if any of the project threads are favorited
        const anyThreadFavorited = threads.some(thread => 
          thread.is_favorited && projectThreadIds.includes(thread.discussion.id)
        );
        
        // Check if any posts in these threads are favorited
        const anyPostsFavorited = projectThreadIds.some(threadId => {
          const thread = threads.find(t => t.discussion.id === threadId);
          if (!thread) return false;
          
          // Go through all discussion threads and their replies
          return thread.discussion.discussion_thread.some(discussionThread => {
            // Check if the main message is favorited
            if (favoritedPostIds.includes(discussionThread.message.id)) {
              return true;
            }
            
            // Check if any reply is favorited
            return discussionThread.replies.some(reply => 
              favoritedPostIds.includes(reply.message.id)
            );
          });
        });
        
        if (!anyThreadFavorited && !anyPostsFavorited) {
          toast({
            title: "Cannot generate report",
            description: "No favorited threads or posts found. Please favorite some content first or disable the 'Only include favorites' option.",
            variant: "destructive"
          });
          setIsGeneratingReport(false);
          
          // Log cancelled report generation
          logger.logFeatureUsage('report-generation', 'cancelled', {
            project_id: selectedProjectId,
            reason: 'no_favorites_found',
            thread_count: filteredThreads.length
          });
          
          return;
        }
      }

      const response = await generateProjectSummaryReport(projectThreadIds, onlyFavorites);
      
      if (response.data) {
        setProjectSummaryReport(response.data);
        // Show the report in the side panel
        setIsShowingPersonaProfile(true);
        setCurrentPanel('report');
        toast({
          title: "Report Generated",
          description: "Project summary report has been generated successfully"
        });
        
        // Log successful report generation and time taken
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        logger.logTimeSpent('report-generation', duration, {
          project_id: selectedProjectId,
          thread_count: filteredThreads.length,
          only_favorites: onlyFavorites,
          status: 'success',
          characters: JSON.stringify(response.data).length
        });
        
        // Log the entire report data
        logger.logCustomEvent('report-output', {
          project_id: selectedProjectId,
          thread_count: filteredThreads.length,
          only_favorites: onlyFavorites,
          report_data: response.data
        });
      }
    } catch (error) {
      console.error("Error generating project summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate project summary report",
        variant: "destructive"
      });
      
      // Log error in report generation
      logger.logFeatureUsage('report-generation', 'error', {
        project_id: selectedProjectId,
        thread_count: filteredThreads.length,
        only_favorites: onlyFavorites,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsGeneratingReport(false);
      setReportStartTime(null);
    }
  };

  const handleViewReport = async (): Promise<void> => {
    // Log the view report button click
    logger.logInteraction('click', 'view-report-button', {
      project_id: selectedProjectId
    });
    
    // Show the existing report in the side panel
    setIsShowingPersonaProfile(true);
    setCurrentPanel('report');
  };

  const handleIncomingMessage = (chunk: ForumThreadChunkStreaming, progressTask: any) => {
    if (chunk.type === "NEW_THREAD") {
      // create a new empty thread
      const threadId = chunk.body["thread_id"];
      addThread({
        discussion: {
          id: threadId,
          topic: chunk.body["topic"],
          topic_description: chunk.body["topic_description"],
          discussion_thread: [],
        },
        citations: chunk.body["citations"],
      });
      
      // Assign the new thread to the currently selected project
      if (selectedProjectId && selectedProjectId !== 'all') {
        addThreadToProject(threadId, selectedProjectId);
      } else {
        // If no project is selected or 'all' is selected, add to default project
        addThreadToProject(threadId, 'default');
      }
      
      updateThreadProgressStatus(threadId, "Generating thread...");

      // update the progress task
      progressTask.updateProgress(0, `Generating thread ${threadId} ...`);
    } else if (chunk.type === "AGENT_MESSAGE") {
      // add a message to the thread
      if (chunk.body["message"]["source"] !== "user") {
        try {
          const parsedContent = JSON.parse(chunk.body["message"]["content"]);
          const forumThread: ForumThread = parsedContent as ForumThread;
          forumThread.discussion.id = chunk.body["thread_id"];
          updateThread(chunk.body["thread_id"], forumThread);
        } catch (error) {
          console.error("Failed to parse JSON into ForumThread:", error);
        }
      }
    } else if (chunk.type === "NEW_PERSONAS") {
      // update the personas
      const threadId = chunk.body["thread_id"];
      addPersonas(chunk.body["personas"]);

      // update the progress task
      progressTask.updateProgress(0, `Generating personas for thread ${threadId} ...`);

      // also add the personas to the threadAgentParticipantsMap
      chunk.body["personas"].forEach((persona: Persona) => {
        addAgentToThread(threadId, persona.name);
      });
    } else if (chunk.type === "PROGRESS_UPDATE") {
      // handle intermediate progress messages
      const threadId = chunk.body["thread_id"];
      // add UI feedback here based on the status
      // e.g. "Generating response", "Surveying literature", etc.
      updateThreadProgressStatus(threadId, chunk.body["status"]);
    } else if (chunk.type === "TERMINATE") {
      // TODO: set the thread state to stopped
      clearThreadProgressStatus(chunk.body["thread_id"]);
      progressTask.complete(`Thread ${chunk.body["thread_id"]} completed`);
    }
  }
  const handleError = (type: string, error: any, progressTask: any) => {
    console.error("Error:", error);
    if (type === "ERROR") {
      clearThreadProgressStatus(error.thread_id);
      progressTask.error(`Thread ${error.thread_id} error: ${error.message}`);
    }
  }
  const handleCreateNewThread = async (newThreadTopic: ForumThreadTopic): Promise<void> => {
    // Log thread creation
    logger.logInteraction('click', 'create-new-thread', {
      topic: newThreadTopic.topic,
      project_id: selectedProjectId || 'none'
    });
    
    logger.logFeatureUsage('thread-creation', 'start', {
      topic: newThreadTopic.topic,
      project_id: selectedProjectId || 'none'
    });
    
    const progressTask = createProgressTask(`${newThreadTopic.topic} ...`);
    runForumThreadSimulation(newThreadTopic, progressTask, handleIncomingMessage, handleError);
    setIsCreateNewThreadDialogOpen(false);
  };

  // Get the name of the currently selected project for the breadcrumb
  const selectedProjectName = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') {
      return 'All Projects';
    }
    const project = useAppStore.getState().projects.find(p => p.id === selectedProjectId);
    return project?.name || 'Research Discussion Forum';
  }, [selectedProjectId]);

  const handleInitializeThreads = async (): Promise<void> => {
    // Validate idea inputs
    if (!ideaInputs.motivation.trim() || !ideaInputs.pastResearch.trim() || !ideaInputs.method.trim() || !ideaInputs.findings.trim()) {
      setInitIdeaError("Please fill in all sections");
      return;
    }
    
    // Log initialize threads action
    logger.logInteraction('click', 'initialize-threads', {
      project_id: selectedProjectId || 'none'
    });
    
    setInitIdeaError("");
    setIsGeneratingThreads(true);
    setGeneratedThreads([]);

    try {
      // Combine all sections into a structured input for the API
      const structuredInput = `
      Motivation: ${ideaInputs.motivation}

      Past Research: ${ideaInputs.pastResearch}

      Method: ${ideaInputs.method}

      Hypothetical Findings: ${ideaInputs.findings}
      `;

      // Log feature usage
      logger.logFeatureUsage('thread-suggestion-generation', 'start', {
        project_id: selectedProjectId || 'none',
        input_length: structuredInput.length
      });
      
      const startTime = Date.now();

      // Use the API utility from the top level
      const response = await generateThreadSuggestions(structuredInput);
      
      // Log time taken
      const duration = Date.now() - startTime;
      logger.logTimeSpent('thread-suggestion-generation', duration, {
        project_id: selectedProjectId || 'none',
        status: 'success'
      });
      
      // Store the proposal in the appStore if a project is selected
      if (selectedProjectId) {
        updateProjectProposal(selectedProjectId, {
          motivation: ideaInputs.motivation,
          relatedWork: ideaInputs.pastResearch,
          methods: ideaInputs.method,
          potentialOutcomes: ideaInputs.findings,
          notes: ''
        });
        
        // Show the proposal notes component
        setIsProposalNoteVisible(true);
      }
      
      const threadSuggestions = response.data.thread_suggestions || [];
      if (threadSuggestions.length === 0) {
        // If no suggestions returned, use example suggestions for demo purposes
        toast({
          title: "Using example suggestions",
          description: "The API returned no suggestions. Using example data for demonstration.",
        });
        setGeneratedThreads(exampleThreadSuggestions);
        setSelectedGeneratedThreads(exampleThreadSuggestions);
        
        // Log fallback to examples
        logger.logCustomEvent('thread-suggestion-fallback', {
          project_id: selectedProjectId || 'none',
          reason: 'empty_response'
        });
      } else {
        setGeneratedThreads(threadSuggestions);
        // Initially select all generated threads
        setSelectedGeneratedThreads(threadSuggestions);
        
        // Log suggestion count
        logger.logCustomEvent('thread-suggestions-received', {
          project_id: selectedProjectId || 'none',
          suggestion_count: threadSuggestions.length
        });
      }
      
      // Transition to suggestions panel
      setActiveInitPanel('suggestions');
    } catch (error) {
      console.error("Error generating thread suggestions:", error);
      // For demonstration purposes, fall back to example suggestions in case of API error
      setGeneratedThreads(exampleThreadSuggestions);
      setSelectedGeneratedThreads(exampleThreadSuggestions);
      
      // Log error
      logger.logFeatureUsage('thread-suggestion-generation', 'error', {
        project_id: selectedProjectId || 'none',
        error: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate thread suggestions. Using example data for demonstration.",
      });
      
      // Transition to suggestions panel even in case of error (using fallback data)
      setActiveInitPanel('suggestions');
    } finally {
      setIsGeneratingThreads(false);
    }
  };

  const toggleThreadSelection = (thread: {topic: string, topic_description: string}) => {
    if (selectedGeneratedThreads.some(t => t.topic === thread.topic)) {
      setSelectedGeneratedThreads(selectedGeneratedThreads.filter(t => t.topic !== thread.topic));
    } else {
      setSelectedGeneratedThreads([...selectedGeneratedThreads, thread]);
    }
  };

  const handleCreateSelectedThreads = async (): Promise<void> => {
    // Log the creation of multiple threads
    logger.logInteraction('click', 'create-selected-threads', {
      project_id: selectedProjectId || 'none',
      thread_count: selectedGeneratedThreads.length
    });
    
    // Create each selected thread
    selectedGeneratedThreads.forEach(thread => {
      handleCreateNewThread({topic: thread.topic, topic_description: thread.topic_description});
    });
    
    // Close the dialog
    setIsInitializeThreadsDialogOpen(false);
    // Reset the state
    setIdeaInputs({
      motivation: "",
      pastResearch: "",
      method: "",
      findings: ""
    });
    setGeneratedThreads([]);
    setSelectedGeneratedThreads([]);
  };

  // Function to load favorited items
  const loadFavoritedItems = async (): Promise<void> => {
    try {
      // Load favorited threads
      const favThreadsResponse = await getFavoriteThreads();
      if (favThreadsResponse.data.threads && Array.isArray(favThreadsResponse.data.threads)) {
        // Update thread.is_favorited values in existing threads
        const updatedThreads = threads.map(thread => {
          const matchingThread = favThreadsResponse.data.threads.find(
            (t) => t.discussion && t.discussion.id === thread.discussion.id
          );
          if (matchingThread) {
            return { ...thread, is_favorited: true };
          }
          return { ...thread, is_favorited: false };
        });
        setThreads(updatedThreads);
      }
      
      // Load favorited posts
      const favPostsResponse = await getFavoritedPostsAll();
      const allFavoritedPostIds: string[] = [];
      
      if (favPostsResponse.data.favorited_posts_by_thread) {
        // Flatten the post IDs from all threads
        favPostsResponse.data.favorited_posts_by_thread.forEach(item => {
          if (item.post_ids && Array.isArray(item.post_ids)) {
            allFavoritedPostIds.push(...item.post_ids);
          }
        });
      }
      
      setFavoritedPostIds(allFavoritedPostIds);
    } catch (error) {
      console.error('Error loading favorited items:', error);
    }
  };

  // Load panel sizes from localStorage on initial render
  useEffect(() => {
    const savedMindMapSize = localStorage.getItem('mindMapPanelSize');
    const savedForumThreadsSize = localStorage.getItem('forumThreadsPanelSize');
    
    if (savedMindMapSize) {
      setMindMapPanelSize(parseInt(savedMindMapSize));
    }
    
    if (savedForumThreadsSize) {
      setForumThreadsPanelSize(parseInt(savedForumThreadsSize));
    }
  }, []);
  
  // Save panel sizes to localStorage when they change
  useEffect(() => {
    localStorage.setItem('mindMapPanelSize', mindMapPanelSize.toString());
    localStorage.setItem('forumThreadsPanelSize', forumThreadsPanelSize.toString());
  }, [mindMapPanelSize, forumThreadsPanelSize]);

  const handleThreadListScroll = async (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    // Get scroll position information
    const target = event.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // Calculate scroll percentage (0-100)
    const scrollPercentage = Math.floor((scrollTop / (scrollHeight - clientHeight)) * 100);
    
    // Check if we've reached the bottom
    const isAtBottom = scrollPercentage >= 99;
    
    // Throttle logging to avoid excessive calls (300ms)
    const now = Date.now();
    if (now - lastScrollLogTime < 300) {
      return;
    }
    
    // Check if this is a significant scroll depth to log
    // We'll log at 25%, 50%, 75% and 100% scroll depth
    const depthToLog = [25, 50, 75, 100].find(depth => 
      scrollPercentage >= depth && scrollDepthMarkers.has(depth)
    );
    
    // Log reaching the bottom if we haven't logged it yet in this session
    if (isAtBottom && !hasReachedBottom) {
      logger.logInteraction('scroll', 'reached-thread-list-bottom', {
        scroll_percentage: scrollPercentage,
        project_id: selectedProjectId || 'none',
        visible_thread_count: filteredThreads.length
      });
      setHasReachedBottom(true);
      setLastScrollLogTime(now);
      return;
    }
    
    // Log specific scroll depth milestones
    if (depthToLog) {
      logger.logInteraction('scroll', 'thread-list-scroll-depth', {
        scroll_percentage: depthToLog,
        project_id: selectedProjectId || 'none',
        visible_thread_count: filteredThreads.length
      });
      
      // Remove this marker so we don't log it again until reset
      const updatedMarkers = new Set(scrollDepthMarkers);
      updatedMarkers.delete(depthToLog);
      setScrollDepthMarkers(updatedMarkers);
      setLastScrollLogTime(now);
    }
    // For general scrolling, log less frequently (every 2 seconds)
    // else if (now - lastScrollLogTime > 2000) {
    //   await logger.logInteraction('scroll', 'thread-list-scrolling', {
    //     scroll_percentage: scrollPercentage,
    //     project_id: selectedProjectId || 'none', 
    //     visible_thread_count: filteredThreads.length
    //   });
    //   setLastScrollLogTime(now);
    // }
  };

  // Function to populate example proposal data for development mode
  const populateExampleProposal = () => {
    setIdeaInputs({
      motivation: exampleProposal.motivation,
      pastResearch: exampleProposal.pastResearch,
      method: exampleProposal.method,
      findings: exampleProposal.findings
    });
    setInitIdeaError('');
  };

  return (
    <div className="min-w-[1200px]">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <ResizablePanelGroup
            direction="horizontal"
            onLayout={(sizes: number[]) => {
              document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`
            }}
            className="max-h-screen items-stretch"
          >
            <ResizablePanel defaultSize={defaultLayout[0]} minSize={50} maxSize={70}>
              <div className="flex h-full flex-col">
                <header className="flex h-14 shrink-0 items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 px-3">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbPage className="line-clamp-1">
                            {selectedProject?.name || 'All Projects'} - Research Discussion Forum
                          </BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                  </div>
                  <div className="flex gap-2 pr-4">

                    
                    {/* Favorites Checkbox */}
                    <div className="flex flex-col items-center gap-2 bg-slate-100 p-2 rounded-md">
                      {/* Generate Report Button - always visible */}
                      <Button 
                        onClick={handleGenerateReport}
                        variant="default"
                        className="mt-4 flex items-center gap-1 bg-blue-500/90 hover:bg-blue-500/100 text-white"
                        disabled={!selectedProjectId || selectedProjectId === 'all' || filteredThreads.length === 0 || isGeneratingReport}
                      >
                        {isGeneratingReport ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent shadow-sm relative">
                              <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-white"></div>
                            </div>
                            <span className="mr-1">Generating</span>
                            <span className="tabular-nums text-white/90 font-medium">
                              {Math.round(reportProgress)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <FileTextIcon className="h-4 w-4" />
                            <span>Generate Report</span>
                          </>
                        )}
                      </Button>
                      <div className="flex flex-row items-center gap-2">
                        <Checkbox 
                          id="favorites-only" 
                          checked={onlyFavorites}
                          onCheckedChange={(checked) => {
                            const newValue = checked as boolean;
                            // Log favorites checkbox toggle
                            logger.logInteraction('click', 'favorites-only-checkbox', {
                              new_value: newValue,
                              project_id: selectedProjectId || 'none'
                            });
                            setOnlyFavorites(newValue);
                          }}
                        />
                        <label 
                          htmlFor="favorites-only"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Only include favorites
                        </label>
                      </div>
                    </div>
                    
                    {/* View Report Button - only visible when a report exists */}
                    {projectSummaryReport && (
                      <div className="flex flex-col p-2 rounded-md">
                        <Button 
                          onClick={handleViewReport}
                          variant="default"
                          className="mt-4 flex items-center gap-1 bg-green-500/90 hover:bg-green-500/100 text-white"
                        >
                          <FileTextIcon className="h-4 w-4" />
                          <span>View Report</span>
                        </Button>
                      </div>
                    )}

                    <Dialog open={IsCreateNewThreadDialogOpen} onOpenChange={setIsCreateNewThreadDialogOpen}>
                      <DialogTrigger asChild>
                        <div className="flex flex-col p-2 rounded-md">
                          <Button className="mt-4" variant="outline">Create New Thread</Button>
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Thread</DialogTitle>
                          <DialogDescription>
                            {selectedProjectId && selectedProjectId !== 'all' ? (
                              <>
                                Creating a new thread in project: <strong>{selectedProjectName}</strong>
                              </>
                            ) : (
                              <>Enter the topic for your new thread.</>
                            )}
                          </DialogDescription>
                        </DialogHeader>
                        <Input
                          type="text"
                          value={newThreadTopic}
                          onChange={(e) => setNewThreadTopic(e.target.value)}
                          placeholder="Enter topic"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {suggestionTopics.map((topic) => (
                            <Button key={topic} onClick={() => setNewThreadTopic(topic)}>
                              {topic}
                            </Button>
                          ))}
                        </div>
                        <Textarea
                          value={newThreadTopicDescription}
                          onChange={(e) => setNewThreadTopicDescription(e.target.value)}
                          placeholder="Enter topic description"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                        
                        <Button onClick={() => handleCreateNewThread({topic: newThreadTopic, topic_description: newThreadTopicDescription})} className="mt-4">
                          Submit
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </header>
                <div className="flex flex-row gap-2 h-[calc(100vh-100px)] mt-4">
                  {/* <ScrollArea className="space-y-6 p-4 w-1/4">
                    {
                      filteredThreads.length > 0 ? (
                        filteredThreads.map((thread) => (
                          <ThreadOutline key={thread.discussion.id} thread={thread} />
                        ))
                      ) : (
                        <div className="text-center p-8 bg-muted rounded-lg">
                          <h3 className="text-lg font-medium">No threads in this project</h3>
                          <p className="text-muted-foreground mt-2">
                            Initialize threads with a high-level idea or create a single thread.
                          </p>
                        </div>
                      )
                    }
                  </ScrollArea> */}
                  <div className="flex flex-col flex-grow">
                    {isShowingMindMap && (
                      <ResizablePanelGroup
                        direction="vertical"
                        className="min-h-[200px]"
                        onLayout={(sizes) => {
                          setMindMapPanelSize(sizes[0]);
                          setForumThreadsPanelSize(sizes[1]);
                        }}
                      >
                        {/* MindMap Panel */}
                        <ResizablePanel defaultSize={mindMapPanelSize} minSize={20}>
                          <div className="h-full px-4 pb-2">
                            <MindMap />
                          </div>
                        </ResizablePanel>
                        
                        {/* Resizable Handle */}
                        <ResizableHandle withHandle className="h-2 bg-gray-100 hover:bg-gray-200 transition-colors" />
                        
                        {/* Forum Threads Panel */}
                        <ResizablePanel defaultSize={forumThreadsPanelSize} minSize={30}>
                          <div className="h-full">
                            <h2 className="text-2xl font-bold mx-8 mt-2">Forum Threads</h2>
                            <ScrollArea 
                              className="px-4 h-[calc(100%-3rem)]"
                              onScrollCapture={handleThreadListScroll}
                            >
                              <div className="space-y-6 p-4 mb-4">
                                {filteredThreads.length > 0 ? (
                                  filteredThreads.map((thread) => (
                                    <Thread
                                      key={thread.discussion.id}
                                      thread={thread}
                                      onDelete={() => deleteThread(thread.discussion.id)}
                                      onCreateNewThread={handleCreateNewThread}
                                    />
                                  ))
                                ) : (
                                  <div className="text-center p-8 bg-muted rounded-lg">
                                    <h3 className="text-lg font-medium">No threads in this project</h3>
                                    <p className="text-muted-foreground mt-2">
                                      Initialize threads with a high-level idea or create a single thread.
                                    </p>
                                    <div className="flex justify-center gap-3 mt-4">
                                      <Button 
                                        className="mt-4" 
                                        variant="default"
                                        onClick={() => setIsInitializeThreadsDialogOpen(true)}
                                      >
                                        Initialize Threads
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <ScrollBar orientation="vertical" />
                            </ScrollArea>
                          </div>
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    )}
                    
                    {!isShowingMindMap && (
                      <>
                        <h2 className="text-2xl font-bold mx-8">Forum Threads</h2>
                        <ScrollArea 
                          className="px-4"
                          onScrollCapture={handleThreadListScroll}
                        >
                          <div className="space-y-6 p-4 mb-4">
                            {filteredThreads.length > 0 ? (
                              filteredThreads.map((thread) => (
                                <Thread
                                  key={thread.discussion.id}
                                  thread={thread}
                                  onDelete={() => deleteThread(thread.discussion.id)}
                                  onCreateNewThread={handleCreateNewThread}
                                />
                              ))
                            ) : (
                              <div className="text-center p-8 bg-muted rounded-lg">
                                <h3 className="text-lg font-medium">No threads in this project</h3>
                                <p className="text-muted-foreground mt-2">
                                  Initialize threads with a high-level idea or create a single thread.
                                </p>
                                <div className="flex justify-center gap-3 mt-4">
                                  <Button 
                                    className="mt-4" 
                                    variant="default"
                                    onClick={() => setIsInitializeThreadsDialogOpen(true)}
                                  >
                                    Initialize Threads
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                          <ScrollBar orientation="vertical" />
                        </ScrollArea>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </ResizablePanel>
            
            {isShowingPersonaProfile && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={defaultLayout[1]} minSize={20}>
                  <PersonaInspector />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </SidebarInset>
        <div className="flex flex-col items-end fixed top-4 right-4 space-y-4">
          <ModeToggle />
          
          {/* Development only - Test button to show report with mock data */}
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewReport}
              className="mt-2"
            >
              Test Report
            </Button>
          )}
        </div>
      </SidebarProvider>

      {/* Initialize Discussion Threads Dialog */}
      <Dialog 
        open={isInitializeThreadsDialogOpen} 
        onOpenChange={(open) => {
          setIsInitializeThreadsDialogOpen(open);
          if (!open) {
            // Reset to input panel when dialog is closed
            setActiveInitPanel('input');
            setGeneratedThreads([]);
            // Reset editing state
            setEditingThreadIndex(null);
            setEditedTopic("");
            setEditedDescription("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Initialize Discussion Threads</DialogTitle>
            <DialogDescription>
              {activeInitPanel === 'input' ? (
                <>
                  Fill in the research sections below to generate multiple focused discussion threads.
                  <br />
                  (Providing structured information helps create more relevant and diverse threads.)
                </>
              ) : (
                <>
                  Select the thread topics you'd like to create based on your research outline.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative overflow-hidden" style={{ height: activeInitPanel === 'input' ? 'auto' : 'auto' }}>
            {/* Panel container with sliding animation */}
            <div 
              className="flex transition-transform duration-300 ease-in-out"
              style={{ 
                width: '200%',
                transform: activeInitPanel === 'input' ? 'translateX(0%)' : 'translateX(-50%)'
              }}
            >
              {/* Panel 1: Input Form */}
              <div className="w-1/2 flex-shrink-0 pr-4">
                {/* Development mode quick-fill button */}
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      populateExampleProposal();
                      logger.logInteraction('click', 'populate-example', {});
                    }}
                    className="mb-4"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Fill Example Proposal
                  </Button>
                )}
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">Motivation</h4>
                    <Textarea
                      value={ideaInputs.motivation}
                      onChange={(e) => {
                        setIdeaInputs({
                          ...ideaInputs,
                          motivation: e.target.value
                        });
                        if (e.target.value.trim()) {
                          setInitIdeaError("");
                        }
                      }}
                      placeholder="Describe why this research idea is important and relevant"
                      className={`min-h-[80px] ${initIdeaError ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">Description of Past Research</h4>
                    <Textarea
                      value={ideaInputs.pastResearch}
                      onChange={(e) => {
                        setIdeaInputs({
                          ...ideaInputs,
                          pastResearch: e.target.value
                        });
                        if (e.target.value.trim()) {
                          setInitIdeaError("");
                        }
                      }}
                      placeholder="Summarize relevant prior work in this area"
                      className={`min-h-[80px] ${initIdeaError ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">Method</h4>
                    <Textarea
                      value={ideaInputs.method}
                      onChange={(e) => {
                        setIdeaInputs({
                          ...ideaInputs,
                          method: e.target.value
                        });
                        if (e.target.value.trim()) {
                          setInitIdeaError("");
                        }
                      }}
                      placeholder="Describe potential approaches or methodologies"
                      className={`min-h-[80px] ${initIdeaError ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">Hypothetical Findings</h4>
                    <Textarea
                      value={ideaInputs.findings}
                      onChange={(e) => {
                        setIdeaInputs({
                          ...ideaInputs,
                          findings: e.target.value
                        });
                        if (e.target.value.trim()) {
                          setInitIdeaError("");
                        }
                      }}
                      placeholder="Speculate on potential outcomes or discoveries"
                      className={`min-h-[80px] ${initIdeaError ? 'border-red-500' : ''}`}
                    />
                  </div>
                  
                  {initIdeaError && (
                    <p className="text-sm text-red-500 font-medium">{initIdeaError}</p>
                  )}
                  <Button 
                    onClick={handleInitializeThreads} 
                    disabled={isGeneratingThreads || (!ideaInputs.motivation.trim() && !ideaInputs.pastResearch.trim() && !ideaInputs.method.trim() && !ideaInputs.findings.trim())}
                    className="w-full mt-4"
                  >
                    {isGeneratingThreads ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Generating...
                      </>
                    ) : (
                      "Generate Thread Suggestions"
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Panel 2: Thread Suggestions */}
              <div className="w-1/2 flex-shrink-0 pl-4">
                <div className="space-y-4 py-4">
                  <h4 className="font-medium text-lg">Generated Thread Suggestions</h4>
                  <p className="text-sm text-muted-foreground">
                    Based on your research outline, we've generated these discussion threads. Select the ones you want to create or edit them first:
                  </p>
                  
                  <ScrollArea className="h-[400px] border p-2">
                    <div className="space-y-3">
                      {generatedThreads.map((thread, index) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded-md border ${
                            selectedGeneratedThreads.some(t => t.topic === thread.topic) 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          } relative`}
                          onClick={editingThreadIndex === index ? undefined : () => toggleThreadSelection(thread)}
                        >
                          {selectedGeneratedThreads.some(t => t.topic === thread.topic) && (
                            <CheckCircle className="absolute top-3 right-3 text-green-500 h-5 w-5" />
                          )}
                          {editingThreadIndex === index ? (
                            // Edit mode
                            <div className="space-y-2">
                              <Input
                                value={editedTopic}
                                onChange={(e) => setEditedTopic(e.target.value)}
                                placeholder="Thread topic"
                                className="w-full font-medium"
                              />
                              <Textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                placeholder="Thread description"
                                className="w-full text-sm h-[100px]"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingThreadIndex(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Update the thread with edited values
                                    const updatedThreads = [...generatedThreads];
                                    updatedThreads[index] = {
                                      topic: editedTopic,
                                      topic_description: editedDescription
                                    };
                                    setGeneratedThreads(updatedThreads);
                                    
                                    // Update selected threads if this one was selected
                                    if (selectedGeneratedThreads.some(t => t.topic === thread.topic)) {
                                      const updatedSelected = selectedGeneratedThreads.map(t => 
                                        t.topic === thread.topic ? {topic: editedTopic, topic_description: editedDescription} : t
                                      );
                                      setSelectedGeneratedThreads(updatedSelected);
                                    }
                                    
                                    setEditingThreadIndex(null);
                                  }}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Display mode
                            <div className="cursor-pointer">
                              <div className="flex justify-between items-start pr-7">
                                <h4 className="font-medium">{thread.topic}</h4>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingThreadIndex(index);
                                    setEditedTopic(thread.topic);
                                    setEditedDescription(thread.topic_description);
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {thread.topic_description}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-between mt-4 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveInitPanel('input')}
                    >
                      Back to Input
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleCreateSelectedThreads}
                        disabled={selectedGeneratedThreads.length === 0}
                      >
                        Create {selectedGeneratedThreads.length} Thread{selectedGeneratedThreads.length !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    
      
      
      {/* Add the ProposalNotes component */}
      <ProposalNotes />
    </div>
  )
}
