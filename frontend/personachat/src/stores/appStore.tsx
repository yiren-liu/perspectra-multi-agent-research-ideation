import { ChatMessage, GraphData, LRTableData, Paper, Persona, PersonaTraitEdit, ConceptSource, TableOfContents, ForumThread, AgentInfo, PersonaProfileTemplate, Citation } from "@/types";
import { create } from "zustand";
import { devtools, persist, StateStorage, createJSONStorage } from "zustand/middleware";

import { Message } from "@/types";

// Project type definitions
export interface Project {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  createdAt: Date;
}

// Project proposal type definition
export interface ProjectProposal {
  motivation: string;
  relatedWork: string;
  methods: string;
  potentialOutcomes: string;
  notes: string;
}

// Project summary report types
export interface PerspectiveSummaryPoint {
  agent: string;
  point: string;
  agent_role?: string;
  post_ids?: string[];
}

export interface RelevantLiterature {
  title: string;
  url: string;
}

export interface PerspectiveSummarySection {
  title: string;
  points: PerspectiveSummaryPoint[];
  relevant_literature?: RelevantLiterature[];
}

export interface PerspectivesSummary {
  sections: PerspectiveSummarySection[];
}

export interface ResearchProposalMotivation {
  point: string;
  post_ids?: string[];
}

export interface ResearchProposalRelatedWork {
  title: string;
  description: string;
  url?: string;
}

export interface ResearchProposalRelatedWorkCategory {
  category: string;
  works: ResearchProposalRelatedWork[];
}

export interface ResearchProposalMethod {
  title: string;
  points: Array<string | { text: string, post_ids?: string[] }>;
}

export interface ResearchProposal {
  motivation: ResearchProposalMotivation[];
  related_works: ResearchProposalRelatedWorkCategory[];
  method: ResearchProposalMethod[];
  potential_outcomes: Array<string | { text: string, post_ids?: string[] }>;
}

export interface ProjectSummaryReport {
  perspectives_summary: PerspectivesSummary;
  research_proposal: ResearchProposal;
}

const initialGraphData: GraphData = {
  nodes: [
    { id: 'quantum', name: 'Quantum Computing' },
    { id: 'ai', name: 'Artificial Intelligence' },
    { id: 'ethics', name: 'Ethics' },
    { id: 'climate', name: 'Climate Science' },
  ],
  links: [
    { source: 'quantum', target: 'ai' },
    { source: 'ai', target: 'ethics' },
    { source: 'climate', target: 'ethics' },
  ]
}

interface AppState {
  personas: Persona[];
  setPersonas: (personas: Persona[]) => void;
  updatePersona: (persona: Persona) => void;
  addPersonas: (personas: Persona[]) => void;
  selectedPersonaId: string | null;
  setSelectedPersonaId: (id: string | null) => void;
  getSelectedPersona: () => Persona | null;
  getPersonaById: (id: string) => Persona | null;
  updateSelectedPersonaWithEdits: (edits: PersonaTraitEdit) => void;
  selectedPersonaQuestionsSuggestions: string[];
  setSelectedPersonaQuestionsSuggestions: (suggestions: string[]) => void;
  
  userPersonaId: string | null;
  setUserPersonaId: (id: string | null) => void;
  getUserPersona: () => Persona | null;
  isRefreshingGraph: boolean;
  setIsRefreshingGraph: (isRefreshing: boolean) => void;
  isPersonasReady: boolean;
  setIsPersonasReady: (isReady: boolean) => void;
  graphData: GraphData | null;
  setGraphData: (data: GraphData | null) => void;
  isRefreshingTable: boolean;
  setIsRefreshingTable: (isRefreshing: boolean) => void;
  LRTableData: LRTableData | null;
  setLRTableData: (data: LRTableData | null) => void;
  tableOfContents: TableOfContents | null;
  setTableOfContents: (contents: TableOfContents | null) => void;

  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  currentMessage: string;
  setCurrentMessage: (message: string) => void;

  // Paper Search States
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lastSubmittedSearchQuery: string;
  setLastSubmittedSearchQuery: (query: string) => void;
  searchResults: Paper[];
  setSearchResults: (results: Paper[]) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  searchProgress: number;
  setSearchProgress: (progress: number) => void;
  includedPapers: Paper[];
  setIncludedPapers: (papers: Paper[]) => void;
  selectedPaper: Paper | null;
  setSelectedPaper: (paper: Paper | null) => void;
  isSearchDialogOpen: boolean;
  setIsSearchDialogOpen: (isOpen: boolean) => void;
  // state for concept source tracing
  selectedSourceConcept: ConceptSource | null;
  setSelectedSourceConcept: (conceptSource: ConceptSource | null) => void;

  handleTraitChange: (path: string[], value: string) => void;

  // Forum States
  threads: ForumThread[];
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string | null) => void;
  setThreads: (threads: ForumThread[]) => void;
  // a map of thread id to progress status
  threadProgressStatus: Map<string, string>;
  updateThreadProgressStatus: (threadId: string, status: string) => void;
  getThreadProgressStatus: (threadId: string) => string | null;
  clearThreadProgressStatus: (threadId: string) => void;
  resetAllThreadProgressStatus: () => void;
  getThreadById: (threadId: string) => ForumThread | null;
  addThread: (thread: ForumThread) => void;
  deleteThread: (threadId: string) => void;
  updateThread: (threadId: string, thread: ForumThread) => void;
  addReply: (threadId: string, parentMessageId: string, reply: Message) => void;
  deleteMessageFromThread: (threadId: string, messageId: string) => void;
  addCitationsToThread: (threadId: string, citations: Citation[]) => void;
  
  // Favorited items
  favoritedPostIds: string[];
  setFavoritedPostIds: (postIds: string[]) => void;
  toggleThreadFavoriteState: (threadId: string, isFavorited: boolean) => void;
  togglePostFavoriteState: (postId: string, isFavorited: boolean) => void;
  isFavoritedThread: (threadId: string) => boolean;
  isFavoritedPost: (postId: string) => boolean;
  
  // forumPersonas: Persona[];
  isShowingPersonaProfile: boolean;
  setIsShowingPersonaProfile: (isShowing: boolean) => void;
  isShowingPersonaProfileDialog: boolean;
  setIsShowingPersonaProfileDialog: (isShowing: boolean) => void;
  agentCatalog: AgentInfo[];
  setAgentCatalog: (catalog: AgentInfo[]) => void;
  getAgentInfoByName: (name: string) => AgentInfo | null;
  agentActions: {action: string, description: string}[];
  setAgentActions: (actions: {action: string, description: string}[]) => void;
  personaProfileTemplate: PersonaProfileTemplate | null;
  setPersonaProfileTemplate: (template: PersonaProfileTemplate | null) => void;
  fullPersonaProfileTemplate: PersonaProfileTemplate | null;
  setFullPersonaProfileTemplate: (template: PersonaProfileTemplate | null) => void;

  // Project States
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, project: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  getSelectedProject: () => Project | null;
  
  // Thread-Project Mapping
  threadProjectMap: Map<string, string>; // Maps threadId to projectId
  setThreadProjectMap: (map: Map<string, string>) => void;
  addThreadToProject: (threadId: string, projectId: string) => void;
  removeThreadFromProject: (threadId: string) => void;
  getThreadsForProject: (projectId: string | null) => ForumThread[]; // Get all threads for a project
  getProjectForThread: (threadId: string) => string | null; // Get project for a thread

  // Thread-Agent Participants Mapping
  threadAgentParticipantsMap: Map<string, Set<string>>; // Maps threadId to a set of agent names
  setThreadAgentParticipantsMap: (map: Map<string, Set<string>>) => void;
  addAgentToThread: (threadId: string, agentName: string) => void;
  removeAgentFromThread: (threadId: string, agentName: string) => void;
  getAgentParticipantsForThread: (threadId: string) => AgentInfo[]; // Get all agent participants for a thread
  getThreadsWithAgent: (agentName: string) => ForumThread[]; // Get all threads with a particular agent

  // Project summary report
  projectSummaryReport: ProjectSummaryReport | null;
  setProjectSummaryReport: (report: ProjectSummaryReport | null) => void;
  isGeneratingReport: boolean;
  setIsGeneratingReport: (isGenerating: boolean) => void;
  isReportDialogOpen: boolean;
  setIsReportDialogOpen: (isOpen: boolean) => void;

  // Panel display state
  currentPanel: 'literature' | 'report'; 
  setCurrentPanel: (panel: 'literature' | 'report') => void;
  
  // Post highlight state
  highlightedPostId: string | null;
  setHighlightedPostId: (postId: string | null) => void;

  // mindmap states
  isShowingMindMap: boolean;
  setIsShowingMindMap: (isShowing: boolean) => void;

  // Project proposal related state
  projectProposals: Map<string, ProjectProposal>;
  setProjectProposal: (projectId: string, proposal: ProjectProposal) => void;
  getProjectProposal: (projectId: string) => ProjectProposal | null;
  updateProjectProposal: (projectId: string, updates: Partial<ProjectProposal>) => void;
  
  // Note-taking mode
  isProposalNoteVisible: boolean;
  setIsProposalNoteVisible: (isVisible: boolean) => void;
  isExpandedProposalNote: boolean;
  setIsExpandedProposalNote: (isExpanded: boolean) => void;
  activeProposalTab: 'motivation' | 'relatedWork' | 'methods' | 'outcomes' | 'notes';
  setActiveProposalTab: (tab: 'motivation' | 'relatedWork' | 'methods' | 'outcomes' | 'notes') => void;
}

function updateNestedValue(obj: any, path: string[], value: string): any {
  if (path.length === 1) {
    return { ...obj, [path[0]]: value };
  }
  const [first, ...rest] = path;
  return {
    ...obj,
    [first]: updateNestedValue(obj[first], rest, value),
  };
}

function updateNestedPersonaFromEdits(persona: Persona, edits: PersonaTraitEdit): Persona {
  let newPersonaDescription = persona.personaDescription;
  Object.entries(edits).forEach(([key, edit]) => {
    newPersonaDescription = updateNestedValue(newPersonaDescription, edit.path, edit.new_value);
  });
  return {
    ...persona,
    personaDescription: newPersonaDescription
  }
}

// helper function to recursively filter nested messages from a discussion thread
function filterNestedMessages(messages: any[], targetMessageId: string): any[] {
  return messages
    .filter(messageItem => messageItem.message.id !== targetMessageId)
    .map(messageItem => ({
      ...messageItem,
      replies: filterNestedMessages(messageItem.replies, targetMessageId),
    }));
}
// helper function to recursively add a reply to the correct message (even nested ones)
function addReplyNested(messages: any[], parentMessageId: string, reply: Message): any[] {
  return messages.map(messageItem => {
    if (messageItem.message.id === parentMessageId) {
      // If we find the parent message, add the new reply at the beginning of its replies
      return {
        ...messageItem,
        replies: [{ message: reply, replies: [] }, ...messageItem.replies]
      };
    } else {
      // Otherwise, continue recursively processing any nested replies
      return {
        ...messageItem,
        replies: addReplyNested(messageItem.replies, parentMessageId, reply)
      };
    }
  });
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
      // Persona States
      personas: [],
      setPersonas: (personas: Persona[]) => set({ personas }),
      updatePersona: (persona: Persona) => set((state) => ({
        personas: state.personas.map(p => p.id === persona.id ? persona : p)
      })),
      addPersonas: (personas: Persona[]) => set((state) => {
        const updatedPersonas = [...state.personas];
        personas.forEach((newPersona) => {
          const existingPersonaIndex = updatedPersonas.findIndex(p => p.id === newPersona.id);
          if (existingPersonaIndex !== -1) {
            updatedPersonas[existingPersonaIndex] = newPersona;
          } else {
            updatedPersonas.push(newPersona);
          }
        });
        return { personas: updatedPersonas };
      }),
      selectedPersonaId: null,
      setSelectedPersonaId: (id: string | null) => set({ selectedPersonaId: id }),
      getSelectedPersona: () => get().personas.find(p => p.id.replace(/_/g, ' ').toLowerCase() === get().selectedPersonaId?.replace(/_/g, ' ').toLowerCase()) || null,
      getPersonaById: (id: string) => get().personas.find(p => 
        p.id.replace(/_/g, ' ').toLowerCase() === id.replace(/_/g, ' ').toLowerCase()
      ) || null,
      updateSelectedPersonaWithEdits: (edits: PersonaTraitEdit) => {
        set((state) => ({
          personas: state.personas.map(
            p => p.id === state.selectedPersonaId ? updateNestedPersonaFromEdits(p, edits) : p
          )
        }));
      },
      selectedPersonaQuestionsSuggestions: [],
      setSelectedPersonaQuestionsSuggestions: (suggestions: string[]) => set({ selectedPersonaQuestionsSuggestions: suggestions }),

      userPersonaId: null,
      setUserPersonaId: (id: string | null) => set({ userPersonaId: id }),
      getUserPersona: () => get().personas.find(p => p.id === get().userPersonaId) || null,
      isRefreshingGraph: false,
      setIsRefreshingGraph: (isRefreshing: boolean) => set({ isRefreshingGraph: isRefreshing }),
      isPersonasReady: false,
      setIsPersonasReady: (isReady: boolean) => set({ isPersonasReady: isReady }),
      graphData: initialGraphData,
      setGraphData: (data: GraphData | null) => set({ graphData: data }),
      isRefreshingTable: false,
      setIsRefreshingTable: (isRefreshing: boolean) => set({ isRefreshingTable: isRefreshing }),
      LRTableData: null,
      setLRTableData: (data: LRTableData | null) => set({ LRTableData: data }),
      tableOfContents: null,
      setTableOfContents: (contents: TableOfContents | null) => set({ tableOfContents: contents }),

      // Chat States
      chatMessages: [],
      setChatMessages: (messages: ChatMessage[]) => set({ chatMessages: messages }),
      addChatMessage: (message: ChatMessage) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
      clearChatMessages: () => set({ chatMessages: [] }),
      currentMessage: '',
      setCurrentMessage: (message: string) => set({ currentMessage: message }),

      // Paper Search States
      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      lastSubmittedSearchQuery: '',
      setLastSubmittedSearchQuery: (query: string) => set({ lastSubmittedSearchQuery: query }),
      searchResults: [],
      setSearchResults: (results: Paper[]) => set({ searchResults: results }),
      isSearching: false,
      setIsSearching: (isSearching: boolean) => set({ isSearching }),
      searchProgress: 0,
      setSearchProgress: (progress: number) => set({ searchProgress: progress }),
      includedPapers: [],
      setIncludedPapers: (papers: Paper[]) => set({ includedPapers: papers }),
      selectedPaper: null,
      setSelectedPaper: (paper: Paper | null) => set({ selectedPaper: paper }),
      isSearchDialogOpen: false,
      setIsSearchDialogOpen: (isOpen: boolean) => set({ isSearchDialogOpen: isOpen }),
      selectedSourceConcept: null,
      setSelectedSourceConcept: (conceptSource: ConceptSource | null) => set({ selectedSourceConcept: conceptSource }),

      handleTraitChange: (path: string[], value: string) => {
        set((state) => ({
          personas: state.personas.map(p =>
            p.id === state.selectedPersonaId
              ? {
                  ...p,
                  personaDescription: updateNestedValue(p.personaDescription, path, value),
                }
              : p
          ),
        }));
      },

      // Forum States
      threads: [],
      selectedThreadId: null,
      setSelectedThreadId: (id: string | null) => set({ selectedThreadId: id }),
      setThreads: (threads: ForumThread[]) => set({ threads }),
      threadProgressStatus: new Map([]),
      updateThreadProgressStatus: (threadId: string, status: string) =>
        set((state) => {
          // Ensure threadProgressStatus is a Map; if not, convert it.
          const currentStatus =
            state.threadProgressStatus instanceof Map
              ? new Map(state.threadProgressStatus)
              : new Map();
          currentStatus.set(threadId, status);
          return { threadProgressStatus: currentStatus };
        }),
      getThreadProgressStatus: (threadId: string) => {
        const currentStatus = get().threadProgressStatus;
        if (currentStatus instanceof Map) {
          return currentStatus.get(threadId) || null;
        }
        return (currentStatus ? currentStatus[threadId] : undefined) || null;
      },
      clearThreadProgressStatus: (threadId: string) =>
        set((state) => {
          const currentStatus =
            state.threadProgressStatus instanceof Map
              ? new Map(state.threadProgressStatus)
              : new Map();
          currentStatus.delete(threadId);
          return { threadProgressStatus: currentStatus };
        }),
      resetAllThreadProgressStatus: () => set((state) => {
        const currentStatus = state.threadProgressStatus instanceof Map
          ? new Map(state.threadProgressStatus)
          : new Map();
        currentStatus.clear();
        return { threadProgressStatus: currentStatus };
      }),
      getThreadById: (threadId: string) => get().threads.find(t => t.discussion.id === threadId) || null,
      addThread: (thread: ForumThread) => set((state) => {
        const existingThreadIndex = state.threads.findIndex(t => t.discussion.id === thread.discussion.id);
        if (existingThreadIndex !== -1) {
          // Update existing thread
          const updatedThreads = [...state.threads];
          updatedThreads[existingThreadIndex] = thread;
          return { threads: updatedThreads };
        } else {
          // Add new thread
          return { threads: [...state.threads, thread] };
        }
      }),
      deleteThread: (threadId: string) => set((state) => {
        // Safely handle threadProgressStatus
        const currentStatus = state.threadProgressStatus instanceof Map
          ? new Map(state.threadProgressStatus)
          : new Map(Object.entries(state.threadProgressStatus || {}) as [string, string][]);
        
        // Remove from threadProjectMap
        const currentThreadProjectMap = state.threadProjectMap instanceof Map
          ? new Map(state.threadProjectMap)
          : new Map(Object.entries(state.threadProjectMap || {}) as [string, string][]);
        currentThreadProjectMap.delete(threadId);

        return { 
          threads: state.threads.filter(t => t.discussion.id !== threadId),
          threadProgressStatus: currentStatus,
          threadProjectMap: currentThreadProjectMap
        };
      }),
      updateThread: (threadId: string, thread: ForumThread) => set((state) => ({ threads: state.threads.map(t => 
        t.discussion.id === threadId ? thread : t
      ) })),
      addReply: (threadId: string, parentMessageId: string, reply: Message) =>
        set((state) => ({
          threads: state.threads.map(t =>
            t.discussion.id === threadId
              ? {
                  ...t,
                  discussion: {
                    ...t.discussion,
                    discussion_thread: addReplyNested(t.discussion.discussion_thread, parentMessageId, reply)
                  }
                }
              : t
          )
        })),
      deleteMessageFromThread: (threadId: string, messageId: string) => 
        set((state) => ({ 
          threads: state.threads.map(t => 
            t.discussion.id === threadId 
              ? {
                  ...t,
                  discussion: {
                    ...t.discussion,
                    discussion_thread: filterNestedMessages(t.discussion.discussion_thread, messageId)
                  }
                }
              : t
          )
        })),
      addCitationsToThread: (threadId: string, citations: Citation[]) => set((state) => ({
        threads: state.threads.map(t =>
          t.discussion.id === threadId ? {
            ...t,
            citations: t.citations.concat(citations)
          } : t
        )
      })),
      isShowingPersonaProfile: false,
      setIsShowingPersonaProfile: (isShowing: boolean) => set({ isShowingPersonaProfile: isShowing }),
      agentCatalog: [],
      setAgentCatalog: (catalog: AgentInfo[]) => set({ agentCatalog: catalog }),
      getAgentInfoByName: (name: string) => get().agentCatalog.find(a => a.name === name.replace(/_/g, " ")) || null,
      agentActions: [],
      setAgentActions: (actions: {action: string, description: string}[]) => set({ agentActions: actions }),
      personaProfileTemplate: null,
      setPersonaProfileTemplate: (template: PersonaProfileTemplate | null) => set({ personaProfileTemplate: template }),
      fullPersonaProfileTemplate: null,
      setFullPersonaProfileTemplate: (template: PersonaProfileTemplate | null) => set({ fullPersonaProfileTemplate: template }),
      isShowingPersonaProfileDialog: false,
      setIsShowingPersonaProfileDialog: (isShowing: boolean) => set({ isShowingPersonaProfileDialog: isShowing }),

      // Project States
      projects: [
        // Default project
        {
          id: 'default',
          name: 'Default Project',
          description: 'Default project for all threads',
          emoji: '📋',
          createdAt: new Date()
        }
      ],
      setProjects: (projects: Project[]) => set({ projects }),
      addProject: (project: Project) => set((state) => ({
        projects: [...state.projects, project]
      })),
      updateProject: (projectId: string, projectUpdates: Partial<Project>) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId 
            ? { ...p, ...projectUpdates }
            : p
        )
      })),
      deleteProject: (projectId: string) => set((state) => {
        // Don't allow deleting the default project
        if (projectId === 'default') {
          return state;
        }

        // Get the current thread-project mapping
        const currentThreadProjectMap = state.threadProjectMap instanceof Map
          ? new Map(state.threadProjectMap)
          : new Map();

        // Reassign all threads from this project to the default project
        state.threads.forEach(thread => {
          if (currentThreadProjectMap.get(thread.discussion.id) === projectId) {
            currentThreadProjectMap.set(thread.discussion.id, 'default');
          }
        });

        // Update the selected project if the current one is being deleted
        const newSelectedProjectId = 
          state.selectedProjectId === projectId
            ? 'default'
            : state.selectedProjectId;

        return {
          projects: state.projects.filter(p => p.id !== projectId),
          threadProjectMap: currentThreadProjectMap,
          selectedProjectId: newSelectedProjectId
        };
      }),
      selectedProjectId: 'default', // Start with the default project
      setSelectedProjectId: (id: string | null) => set({ selectedProjectId: id }),
      getSelectedProject: () => get().projects.find(p => p.id === get().selectedProjectId) || null,
      
      // Thread-Project Mapping
      threadProjectMap: new Map<string, string>(),
      setThreadProjectMap: (map: Map<string, string>) => set({ threadProjectMap: map }),
      addThreadToProject: (threadId: string, projectId: string) => set((state) => {
        const currentThreadProjectMap = state.threadProjectMap instanceof Map
          ? new Map(state.threadProjectMap)
          : new Map(Object.entries(state.threadProjectMap || {}) as [string, string][]);
        currentThreadProjectMap.set(threadId, projectId);
        return { threadProjectMap: currentThreadProjectMap };
      }),
      removeThreadFromProject: (threadId: string) => set((state) => {
        const currentThreadProjectMap = state.threadProjectMap instanceof Map
          ? new Map(state.threadProjectMap)
          : new Map(Object.entries(state.threadProjectMap || {}) as [string, string][]);
        currentThreadProjectMap.delete(threadId);
        return { threadProjectMap: currentThreadProjectMap };
      }),
      getThreadsForProject: (projectId: string | null) => {
        const { threads, threadProjectMap } = get();
        
        // If no project is selected or if we want all threads
        if (!projectId || projectId === 'all') {
          return threads;
        }

        // Safely get the project ID for a thread, with consistent handling
        const getProjectId = (threadId: string) => {
          if (threadProjectMap instanceof Map) {
            return threadProjectMap.get(threadId) || 'default';
          } else if (threadProjectMap && typeof threadProjectMap === 'object') {
            // Cast the object access for better type safety
            return ((threadProjectMap as Record<string, string>)[threadId]) || 'default';
          }
          return 'default';
        };

        // Filter threads by the selected project
        return threads.filter(thread => {
          const threadProject = getProjectId(thread.discussion.id);
          return threadProject === projectId;
        });
      },
      getProjectForThread: (threadId: string) => {
        const { threadProjectMap } = get();
        if (threadProjectMap instanceof Map) {
          return threadProjectMap.get(threadId) || 'default';
        } else if (threadProjectMap && typeof threadProjectMap === 'object') {
          return ((threadProjectMap as Record<string, string>)[threadId]) || 'default';
        }
        return 'default';
      },

      // Thread-Agent Participants Mapping
      threadAgentParticipantsMap: new Map<string, Set<string>>(),
      setThreadAgentParticipantsMap: (map: Map<string, Set<string>>) => set({ threadAgentParticipantsMap: map }),
      addAgentToThread: (threadId: string, agentName: string) => set((state) => {
        const currentThreadAgentParticipantsMap = state.threadAgentParticipantsMap instanceof Map
          ? new Map(state.threadAgentParticipantsMap)
          : new Map();
        const currentAgents = currentThreadAgentParticipantsMap.get(threadId) || new Set<string>();
        currentAgents.add(agentName);
        currentThreadAgentParticipantsMap.set(threadId, currentAgents);
        return { threadAgentParticipantsMap: currentThreadAgentParticipantsMap };
      }),
      removeAgentFromThread: (threadId: string, agentName: string) => set((state) => {
        const currentThreadAgentParticipantsMap = state.threadAgentParticipantsMap instanceof Map
          ? new Map(state.threadAgentParticipantsMap)
          : new Map();
        const currentAgents = currentThreadAgentParticipantsMap.get(threadId) || new Set<string>();
        currentAgents.delete(agentName);
        currentThreadAgentParticipantsMap.set(threadId, currentAgents);
        return { threadAgentParticipantsMap: currentThreadAgentParticipantsMap };
      }),
      getAgentParticipantsForThread: (threadId: string) => {
        const currentThreadAgentParticipantsMap = get().threadAgentParticipantsMap;
        if (currentThreadAgentParticipantsMap instanceof Map) {
          const agents = currentThreadAgentParticipantsMap.get(threadId) || new Set<string>();
          return Array.from(agents)
            .map(name => get().agentCatalog.find(a => a.name === name))
            .filter((agent): agent is AgentInfo => agent !== null && agent !== undefined);
        }
        return [];
      },
      getThreadsWithAgent: (agentName: string) => {
        const { threads, threadAgentParticipantsMap } = get();
        return threads.filter(thread => {
          const agents = threadAgentParticipantsMap.get(thread.discussion.id) || new Set<string>();
          return agents.has(agentName);
        });
      },

      // Project summary report
      projectSummaryReport: null,
      setProjectSummaryReport: (report: ProjectSummaryReport | null) => set({ projectSummaryReport: report }),
      isGeneratingReport: false,
      setIsGeneratingReport: (isGenerating: boolean) => set({ isGeneratingReport: isGenerating }),
      isReportDialogOpen: false,
      setIsReportDialogOpen: (isOpen: boolean) => set({ isReportDialogOpen: isOpen }),

      // Favorited items
      favoritedPostIds: [],
      setFavoritedPostIds: (postIds: string[]) => set({ favoritedPostIds: postIds }),
      toggleThreadFavoriteState: (threadId: string, isFavorited: boolean) => {
        set((state) => ({
          threads: state.threads.map(t =>
            t.discussion.id === threadId ? { ...t, is_favorited: isFavorited } : t
          )
        }));
      },
      togglePostFavoriteState: (postId: string, isFavorited: boolean) => {
        set((state) => ({
          favoritedPostIds: state.favoritedPostIds.includes(postId)
            ? state.favoritedPostIds.filter(id => id !== postId)
            : [...state.favoritedPostIds, postId]
        }));
      },
      isFavoritedThread: (threadId: string) => {
        const thread = get().threads.find(t => t.discussion.id === threadId);
        return thread ? !!thread.is_favorited : false;
      },
      isFavoritedPost: (postId: string) => {
        return get().favoritedPostIds.includes(postId);
      },

      // forumPersonas: Persona[];

      // Panel display state - default to literature panel
      currentPanel: 'literature',
      setCurrentPanel: (panel) => set({ currentPanel: panel }),
      
      // Post highlight state
      highlightedPostId: null,
      setHighlightedPostId: (postId) => set({ highlightedPostId: postId }),


      // mindmap states
      isShowingMindMap: false,
      setIsShowingMindMap: (isShowing: boolean) => set({ isShowingMindMap: isShowing }),

      // Project proposal related state
      projectProposals: new Map<string, ProjectProposal>(),
      setProjectProposal: (projectId: string, proposal: ProjectProposal) => set((state) => {
        const currentProposals = state.projectProposals instanceof Map 
          ? new Map(state.projectProposals) 
          : new Map();
        currentProposals.set(projectId, proposal);
        return { projectProposals: currentProposals };
      }),
      getProjectProposal: (projectId: string) => {
        const { projectProposals } = get();
        if (projectProposals instanceof Map) {
          return projectProposals.get(projectId) || null;
        }
        return null;
      },
      updateProjectProposal: (projectId: string, updates: Partial<ProjectProposal>) => set((state) => {
        const currentProposals = state.projectProposals instanceof Map 
          ? new Map(state.projectProposals) 
          : new Map();
        
        const currentProposal = currentProposals.get(projectId) || {
          motivation: '',
          relatedWork: '',
          methods: '',
          potentialOutcomes: '',
          notes: ''
        };
        
        currentProposals.set(projectId, { ...currentProposal, ...updates });
        return { projectProposals: currentProposals };
      }),
      
      // Note-taking mode
      isProposalNoteVisible: false,
      setIsProposalNoteVisible: (isVisible: boolean) => set({ isProposalNoteVisible: isVisible }),
      isExpandedProposalNote: true,
      setIsExpandedProposalNote: (isExpanded: boolean) => set({ isExpandedProposalNote: isExpanded }),
      activeProposalTab: 'motivation',
      setActiveProposalTab: (tab: 'motivation' | 'relatedWork' | 'methods' | 'outcomes' | 'notes') => set({ activeProposalTab: tab }),
    }),
    {
      name: "app-storage",
      partialize: (state) => {
        const stateCopy = { ...state };
        
        if (stateCopy.threadProjectMap instanceof Map) {
          stateCopy.threadProjectMap = Object.fromEntries(stateCopy.threadProjectMap) as any;
        }
        
        if (stateCopy.threadProgressStatus instanceof Map) {
          stateCopy.threadProgressStatus = Object.fromEntries(stateCopy.threadProgressStatus) as any;
        }

        if (stateCopy.threadAgentParticipantsMap instanceof Map) {
          // Convert Map<string, Set<string>> to Map<string, string[]> for serialization
          const serializedMap: Record<string, string[]> = {};
          stateCopy.threadAgentParticipantsMap.forEach((value, key) => {
            if (value instanceof Set) {
              serializedMap[key] = Array.from(value);
            }
          });
          stateCopy.threadAgentParticipantsMap = serializedMap as any;
        }
        
        if (stateCopy.projectProposals instanceof Map) {
          const serializedProposals: Record<string, ProjectProposal> = {};
          stateCopy.projectProposals.forEach((value, key) => {
            serializedProposals[key] = value;
          });
          stateCopy.projectProposals = serializedProposals as any;
        }
        
        return stateCopy;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.threadProjectMap && !(state.threadProjectMap instanceof Map)) {
            state.threadProjectMap = new Map(Object.entries(state.threadProjectMap) as [string, string][]);
          }
          
          if (state.threadProgressStatus && !(state.threadProgressStatus instanceof Map)) {
            state.threadProgressStatus = new Map(Object.entries(state.threadProgressStatus) as [string, string][]);
          }

          if (state.threadAgentParticipantsMap && !(state.threadAgentParticipantsMap instanceof Map)) {
            // Convert the serialized format back to Map<string, Set<string>>
            const deserializedMap = new Map<string, Set<string>>();
            Object.entries(state.threadAgentParticipantsMap).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                deserializedMap.set(key, new Set<string>(value));
              }
            });
            state.threadAgentParticipantsMap = deserializedMap;
          }

          if (state.projectProposals && !(state.projectProposals instanceof Map)) {
            state.projectProposals = new Map(Object.entries(state.projectProposals) as [string, ProjectProposal][]);
          }
        }
      }
    }
    ),
    {
      // Add custom serialization for devtools
      serialize: {
        replacer: (_, value) => {
          if (value instanceof Map) {
            return { 
              _isMap: true, 
              data: Array.from(value.entries()) 
            };
          }
          if (value instanceof Set) {
            return { 
              _isSet: true, 
              data: Array.from(value) 
            };
          }
          return value;
        }
      }
    }
  )
);
