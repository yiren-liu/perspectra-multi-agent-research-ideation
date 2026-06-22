// src/api/api.ts

import { useContext } from "react";
import axios, { AxiosResponse } from "axios";

import { 
  ChatMessage, 
  ChatMessageChunkStreaming, 
  LRTableData, Paper, Persona, PersonaTraitEdit, 
  TableOfContents, ForumThread, ForumThreadChunkStreaming, 
  PersonaLiterature, AgentInfo, AgentResponse, PersonaProfileTemplate, ForumThreadTopic,
  UserStudyLog, ChatMessageChunkStreamingWithCitation, ProgressUpdateChunk } from "@/types";

import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { ProgressTask } from "@/components/ui/progress-panel";

export function useApi() {
  // Call useAuthStore at the top level, not inside async functions
  const getToken = useAuthStore((state) => state.getToken);

  // Helper function for standardized API calls with error handling
  const apiCall = async <T>(
    url: string, 
    method: string, 
    data: any, 
    additionalHeaders: Record<string, string> = {}
  ): Promise<AxiosResponse<T>> => {
    // prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth token if available
    const authToken = await getToken();
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    // Merge additional headers, overriding existing ones if necessary
    const finalHeaders = { ...headers, ...additionalHeaders };

    try {
      const response = await axios({
        url,
        method,
        data,
        headers: finalHeaders,
      });
      return response;
    } catch (error: any) {
      if (error.response?.status === 491) {
        toast({ 
          variant: "destructive",
          title: error.response.status,
          description: error.response.data.detail,
        });
        throw error;
      }
      toast({ 
        variant: "destructive",
        title: error.response?.status || "Error",
        description: error.response?.data?.detail || "An unexpected error occurred",
      });
      throw error;
    }
  };
  // Helper function for handling JSON stream API calls
  const streamJSONChunkApiCall = async (
    url: string,
    method: string,
    data: any,
    onData: (chunk: ChatMessageChunkStreaming) => void,
    onError: (type: string, error: any) => void = () => {},
    onFinish: () => void = () => {}
  ): Promise<void> => {
    const body = method === "GET" ? undefined : JSON.stringify(data);
    const headers: Record<string, string> = { 
      "Content-Type": "application/json",
    };

    const authToken = await getToken();
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(url, { method, body: body, headers });
  
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
  
      let buffer = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
  
        // Split the buffer on newline delimiter
        let parts = buffer.split("\n");
  
        // Keep the last part (possibly incomplete) in the buffer
        buffer = parts.pop() || "";
  
        for (const part of parts) {
          if (part.trim() === "") continue;
          try {
            const jsonChunk = JSON.parse(part);
            // Handle backend-sent error messages.
            if (jsonChunk.type && jsonChunk.type === "ERROR") {
              onError(jsonChunk.type, {
                thread_id: jsonChunk.body.thread_id,
                message: jsonChunk.body.message,
              });
              toast({
                variant: "destructive",
                title: "Error",
                description: jsonChunk.body.message || "An error occurred",
              });
              break;
            }
  
            // Check for other error details (e.g., "Method Not Allowed")
            if (jsonChunk.detail && jsonChunk.detail === "Method Not Allowed") {
              onError("Method Not Allowed: Please try again later.", jsonChunk.detail);
              toast({
                variant: "destructive",
                title: "Error",
                description: "Method Not Allowed: Please try again later.",
              });
              break;
            }
  
            // Continue processing normal data.
            onData(jsonChunk);
          } catch (parseError) {
            console.error("Error parsing JSON chunk", parseError);
            // Optionally notify error handler if needed:
            // onError(parseError);
          }
        }
      }
    } catch (error) {
      onError("Error fetching stream", error);
      console.error("Error fetching stream", error);
    } finally {
      onFinish();
    }
  };

  // Forum-specific stream API call function with proper typing
  const streamForumThreadApiCall = async (
    url: string,
    method: string,
    data: any,
    progressTask: any,
    onData: (chunk: ForumThreadChunkStreaming, progressTask: any) => void,
    onError: (type: string, error: any, progressTask: any) => void = () => {},
    onFinish: (progressTask: any) => void = () => {}
  ): Promise<void> => {
    const body = method === "GET" ? undefined : JSON.stringify(data);
    const headers: Record<string, string> = { 
      "Content-Type": "application/json",
    };

    const authToken = await getToken();
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(url, { method, body: body, headers });
  
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
  
      let buffer = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
  
        // Split the buffer on newline delimiter
        let parts = buffer.split("\n");
  
        // Keep the last part (possibly incomplete) in the buffer
        buffer = parts.pop() || "";
  
        for (const part of parts) {
          if (part.trim() === "") continue;
          try {
            const jsonChunk = JSON.parse(part);
            // Handle backend-sent error messages.
            if (jsonChunk.type && jsonChunk.type === "ERROR") {
              onError(jsonChunk.type, {
                thread_id: jsonChunk.body.thread_id,
                message: jsonChunk.body.message,
              }, progressTask);
              toast({
                variant: "destructive",
                title: "Error",
                description: jsonChunk.body.message || "An error occurred",
              });
              break;
            }
  
            // Check for other error details (e.g., "Method Not Allowed")
            if (jsonChunk.detail && jsonChunk.detail === "Method Not Allowed") {
              onError("Method Not Allowed: Please try again later.", jsonChunk.detail, progressTask);
              toast({
                variant: "destructive",
                title: "Error",
                description: "Method Not Allowed: Please try again later.",
              });
              break;
            }
  
            // Continue processing normal data
            onData(jsonChunk, progressTask);
          } catch (parseError) {
            console.error("Error parsing JSON chunk", parseError);
          }
        }
      }
    } catch (error) {
      onError("Error fetching stream", error, progressTask);
      console.error("Error fetching stream", error);
    } finally {
      onFinish(progressTask);
    }
  };

  // Demo Persona APIs
  const getDemoPersonas = async (): Promise<
    AxiosResponse<Persona[]>
  > => {
    return apiCall(`/api/v1/get_demo_personas`, "GET", {});
  };

  // Demo Paper APIs
  const getDemoPapers = async (): Promise<
    AxiosResponse<Paper[]>
  > => {
    return apiCall(`/api/v1/get_demo_papers`, "GET", {});
  };

  // Search Papers from Topic APIs
  const searchPapersFromTopic = async (topic: string): Promise<
    AxiosResponse<{papers: Paper[]}>
  > => {
    return apiCall(`/api/v1/search_papers_from_topic`, "POST", {topic});
  };

  // Generate Personas from Papers and Topic APIs
  const generatePersonasFromPapersTopic = async (topic: string, papers: Paper[]): Promise<
    AxiosResponse<{personas: Persona[], literature_review: string}>
  > => {
    return apiCall(`/api/v1/generate_personas_from_papers_topic`, "POST", {topic, papers});
  };

  // Persona KG APIs
  const getPersonaKG = async (persona: Persona, topic: string, papers: Paper[]): Promise<
    AxiosResponse<{queries: string[], results: any}>
  > => {
    return apiCall(`/api/v1/get_persona_kg`, "POST", {persona, topic, papers});
  };

  // API for editing an existing persona description through chat
  // the API returns a dict of {"key_to_edit": {"old": "old_value", "new": "new_value"}}
  const getPersonaDescEdits = async (instruction: string, original_persona: Persona): Promise<
    AxiosResponse<PersonaTraitEdit>
  > => {
    return apiCall(`/api/v1/get_persona_desc_edits`, "POST", {instruction, original_persona});
  };

  // Generate Table from Papers APIs (for Paper axis)
  const generateTableFromPapers = async (num_attributes: number, papers: Paper[], personas: Persona[] = []): Promise<
    AxiosResponse<LRTableData>
  > => {
    return apiCall(`/api/v1/generate_table_from_papers`, "POST", {num_attributes, papers, personas});
  };
  // Generate Table from Dialogue History APIs (for Persona axis)
  const generateTableFromDialogueHistory = async (dialogue_history: ChatMessage[], personas: Persona[] = []): Promise<
    AxiosResponse<TableOfContents>
  > => {
    return apiCall(`/api/v1/generate_table_from_dialogue_history`, "POST", {dialogue_history, personas});
  };

  // Chat APIs
  const chatWithExperts = async (
    task: string,
    personas: Persona[] = [],
    onData: (chunk: ChatMessageChunkStreamingWithCitation) => void,
    onError: (error: any) => void = () => {},
    onFinish: () => void = () => {}
  ): Promise<void> => {
    await streamJSONChunkApiCall(`/api/v1/chat/stream_response`, "POST", {user_query: task, personas}, onData, onError, onFinish);
  };

  // Terminate Chat APIs
  const terminateCurrentChat = async (): Promise<
    AxiosResponse<{message: string}>
  > => {
    return apiCall(`/api/v1/chat/terminate`, "GET", {});
  };

  // Generate AI Persona questions suggestions APIs
  const generatePersonaQuestionsSuggestions = async (
    persona: Persona,
    topic: string,
    dialogue_history: ChatMessage[]
  ): Promise<
    AxiosResponse<{questions: string[]}>
  > => {
    return apiCall(`/api/v1/chat/generate_persona_questions_suggestions`, "POST", {persona, topic, dialogue_history});
  };

  // Generate AI Persona questions suggestions APIs
  const generatePersonasFromBaselineProposal = async (
    topic: string,
    topic_description: string
  ): Promise<
    AxiosResponse<{personas: Persona[]}>
  > => {
    return apiCall(`/api/v1/chat/generate_personas_from_baseline_proposal`, "POST", {topic, topic_description});
  };

  // Forum APIs
  const getDummyThreads = async (): Promise<
    AxiosResponse<{threads: ForumThread}>
  > => {
    return apiCall(`/api/v1/forum/testing/get_dummy_threads`, "GET", {});
  };
  const runForumThreadSimulation = async (
    topic: ForumThreadTopic,
    progressTask: any,
    onData: (chunk: ForumThreadChunkStreaming, progressTask: any) => void,
    onError: (type: string, error: any, progressTask: any) => void = () => {},
    onFinish: (progressTask: any) => void = () => {}
  ): Promise<void> => {
    await streamForumThreadApiCall(`/api/v1/forum/testing/create_new_thread`, "POST", {
      topic: {
        topic: topic.topic,
        topic_description: topic.topic_description,
      }
    }, progressTask, onData, onError, onFinish);
  };
  const getAgentResponse = async (
    agent_name: string,
    message: string | null,
    action: string | null,
    discussion_thread: ForumThread
  ): Promise<
    AxiosResponse<{agent_response: AgentResponse}>
  > => {
    return apiCall(`/api/v1/forum/testing/request_agent_response`, "POST", {agent_name, message, action, discussion_thread});
  };
  const getAgentActions = async (): Promise<
    AxiosResponse<{agent_actions: {action: string, description: string}[]}>
  > => {
    return apiCall(`/api/v1/forum/testing/get_agent_actions`, "GET", {});
  };

  // Get Persona Profile APIs
  const getPersonaProfile = async (agent_name: string): Promise<
    AxiosResponse<{persona_profile: Persona}>
  > => {
    return apiCall(`/api/v1/forum/testing/get_persona_profile`, "POST", {agent_name});
  };

  // Get Persona Literature APIs
  const getPersonaLiterature = async (agent_name: string): Promise<
    AxiosResponse<{literature: PersonaLiterature[]}>
  > => {
    return apiCall(`/api/v1/forum/testing/get_persona_literature`, "POST", {agent_name});
  };

  // Get Agent Catalog APIs
  const getAgentCatalog = async (): Promise<
    AxiosResponse<{agent_catalog: AgentInfo[]}>
  > => {
    return apiCall(`/api/v1/forum/testing/get_agent_catalog`, "GET", {});
  };

  // Get Persona Profile Template APIs
  const getPersonaProfileTemplate = async (): Promise<
    AxiosResponse<{persona_profile_template: PersonaProfileTemplate}>
  > => {
    return apiCall(`/api/v1/forum/testing/get_persona_profile_template`, "GET", {});
  };
  const getFullPersonaProfileTemplate = async (): Promise<
    AxiosResponse<{persona_profile_template: PersonaProfileTemplate}>
  > => {
    return apiCall(`/api/v1/forum/testing/get_full_persona_profile_template`, "GET", {});
  };

  // New API for deleting a forum thread
  const deleteForumThread = async (threadId: string): Promise<
    AxiosResponse<{message: string}>
  > => {
    return apiCall(`/api/v1/forum/testing/delete_thread/${threadId}`, "DELETE", {});
  };

  // New API for saving agent settings
  const saveAgentSettings = async (agentName: string, settings: any): Promise<
    AxiosResponse<{message: string}>
  > => {
    return apiCall(`/api/v1/forum/testing/save_agent_settings`, "POST", { agent_name: agentName, settings });
  };

  // Generate thread suggestions from a high-level idea
  const generateThreadSuggestions = async (highLevelIdea: string): Promise<
    AxiosResponse<{thread_suggestions: {topic: string, topic_description: string}[]}>
  > => {
    return apiCall(`/api/v1/forum/testing/generate_thread_suggestions`, "POST", { high_level_idea: highLevelIdea });
  };

  // New API for toggling favorite status of a thread
  const toggleFavoriteThread = async (threadId: string, isFavorited: boolean): Promise<
    AxiosResponse<{message: string}>
  > => {
    return apiCall(`/api/v1/forum/testing/toggle_favorite/${threadId}`, "POST", { is_favorited: isFavorited });
  };

  // New API for getting favorite threads
  const getFavoriteThreads = async (): Promise<
    AxiosResponse<{threads: ForumThread[]}>
  > => {
    return apiCall(`/api/v1/forum/testing/favorite_threads`, "GET", {});
  };

  // New API for getting favorited posts
  const getFavoritedPostsAll = async (): Promise<
    AxiosResponse<{favorited_posts_by_thread: {thread_id: string, post_ids: string[]}[]}>
  > => {
    return apiCall(`/api/v1/forum/testing/favorited_posts_by_thread`, "GET", {});
  };
  const getFavoritedPostsByThread = async (threadId: string): Promise<
    AxiosResponse<{favorited_post_ids: {post_id: string, fav_updated_at: string}[]}>
  > => {
    return apiCall(`/api/v1/forum/testing/favorited_posts`, "GET", { thread_id: threadId });
  };
  const toggleFavoritePost = async (threadId: string, postId: string): Promise<
    AxiosResponse<{message: string}>
  > => {
    return apiCall(`/api/v1/forum/testing/toggle_favorite_post`, "POST", { thread_id: threadId, post_id: postId });
  };

  
  // Generate project summary report
  const generateProjectSummaryReport = async (threadIds: string[] , only_favorites: boolean = false): Promise<
    AxiosResponse<{
      perspectives_summary: { 
        sections: Array<{
          title: string,
          points: Array<{
            agent: string,
            point: string,
            agent_role?: string,
            post_ids?: string[]
          }>,
          relevant_literature?: Array<{
            title: string,
            url: string
          }>
        }>,
      },
      research_proposal: {
        motivation: Array<{point: string}>,
        related_works: Array<{
          category: string,
          works: Array<{
            title: string,
            description: string,
            url?: string
          }>
        }>,
        method: Array<{
          title: string,
          points: Array<string>
        }>,
        potential_outcomes: Array<string>
      }
    }>
  > => {
    return apiCall(`/api/v1/forum/testing/generate_project_summary`, "POST", { thread_ids: threadIds, only_favorites });
  };

  // Get agent memories API
  const getAgentMemories = async (agentId: string): Promise<
    AxiosResponse<{
      memories: Array<{
        id: string,
        title: string,
        snippet: string,
        parent_id: string[]
      }>
    }>
  > => {
    return apiCall(`/api/v1/forum/testing/get_agent_memories`, "POST", { agent_id: agentId });
  };

  // List all agents with memories
  const listAgentsWithMemories = async (): Promise<
    AxiosResponse<{
      agents: string[]
    }>
  > => {
    return apiCall(`/api/v1/forum/testing/list_agents_with_memories`, "GET", {});
  };

  // User Study Log APIs
  const saveUserStudyLog = async (
    userId: string,
    logType: string,
    logData: any,
    timestamp?: string
  ): Promise<AxiosResponse<{status: string}>> => {
    return apiCall(`/api/v1/log/user_study`, "POST", {
      user_id: userId,
      log_type: logType,
      log_data: logData,
      timestamp
    });
  };

  const getUserStudyLogs = async (
    userId: string,
    sessionId?: string,
    logType?: string,
    startTime?: string,
    endTime?: string,
    limit?: number
  ): Promise<AxiosResponse<{logs: UserStudyLog[]}>> => {
    // Build query params
    const params = new URLSearchParams();
    if (sessionId) params.append('session_id', sessionId);
    if (logType) params.append('log_type', logType);
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/api/v1/log/user_study/${userId}${queryString}`, "GET", {});
  };

  const checkSessionId = async (): Promise<AxiosResponse<{session_id: string}>> => {
    return apiCall(`/api/v1/log/check_session_id`, "GET", {});
  };

  // General-purpose function to log user study events
  const logUserStudyEvent = async (
    userId: string,
    eventType: string,
    eventData: any
  ): Promise<void> => {
    try {
      await saveUserStudyLog(userId, eventType, eventData);
    } catch (error) {
      console.error("Failed to log user study event:", error);
    }
  };

  // Stream progress updates
  const streamProgressUpdates = async (
    url: string,
    method: string,
    data: any,
    onData: (chunk: ProgressUpdateChunk) => void,
    onError: (type: string, error: any) => void = () => {},
    onFinish: () => void = () => {}
  ): Promise<void> => {
    const body = method === "GET" ? undefined : JSON.stringify(data);
    const headers: Record<string, string> = { 
      "Content-Type": "application/json",
    };

    const authToken = await getToken();
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(url, { method, body: body, headers });
  
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
  
      let buffer = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
  
        // Split the buffer on newline delimiter
        let parts = buffer.split("\n");
  
        // Keep the last part (possibly incomplete) in the buffer
        buffer = parts.pop() || "";
  
        for (const part of parts) {
          if (part.trim() === "") continue;
          try {
            const jsonChunk = JSON.parse(part);
            // Handle backend-sent error messages.
            if (jsonChunk.type && jsonChunk.type === "ERROR") {
              onError(jsonChunk.type, {
                message: jsonChunk.data?.message || "An error occurred",
              });
              toast({
                variant: "destructive",
                title: "Error",
                description: jsonChunk.data?.message || "An error occurred",
              });
              break;
            }
  
            // Continue processing normal data
            onData(jsonChunk);
          } catch (parseError) {
            console.error("Error parsing JSON chunk", parseError);
          }
        }
      }
    } catch (error) {
      onError("Error fetching stream", error);
      console.error("Error fetching stream", error);
    } finally {
      onFinish();
    }
  };

  // Task progress API
  const streamTaskProgress = async (
    taskId: string,
    taskName: string,
    taskType: string,
    data: any,
    onData: (chunk: ProgressUpdateChunk) => void,
    onError: (error: any) => void = () => {},
    onFinish: () => void = () => {}
  ): Promise<void> => {
    await streamProgressUpdates(
      `/api/v1/tasks/stream_progress`,
      "POST",
      { task_id: taskId, task_name: taskName, task_type: taskType, ...data },
      onData,
      onError,
      onFinish
    );
  };

  // Monitor the progress of the add_papers task
  const monitorAddPapersProgress = async (
    papersData: { papers: Paper[] },
    onData: (chunk: ProgressUpdateChunk) => void,
    onError: (error: any) => void = () => {},
    onFinish: () => void = () => {}
  ): Promise<void> => {
    const taskId = `add-papers-${Date.now()}`;
    await streamTaskProgress(
      taskId,
      "Adding Papers to RAG",
      "add_papers",
      papersData,
      onData,
      onError,
      onFinish
    );
  };

  // Test task progress 
  const testTaskProgress = async (
    onData: (chunk: ProgressUpdateChunk) => void,
    onError: (error: any) => void = () => {},
    onFinish: () => void = () => {}
  ): Promise<void> => {
    await streamProgressUpdates(
      `/api/v1/tasks/test_progress`,
      "POST",
      {},
      onData,
      onError,
      onFinish
    );
  };

  return {
    getDemoPersonas,
    getDemoPapers,
    getPersonaKG,
    searchPapersFromTopic,
    generatePersonasFromPapersTopic,
    generateTableFromPapers,
    chatWithExperts,
    getPersonaDescEdits,
    terminateCurrentChat,
    generatePersonaQuestionsSuggestions,
    generateTableFromDialogueHistory,
    getDummyThreads,
    runForumThreadSimulation,
    getPersonaProfile,
    getPersonaLiterature,
    getAgentCatalog,
    getAgentResponse,
    getAgentActions,
    getPersonaProfileTemplate,
    getFullPersonaProfileTemplate,
    deleteForumThread,
    saveAgentSettings,
    generateThreadSuggestions,
    toggleFavoriteThread,
    getFavoriteThreads,
    getFavoritedPostsAll,
    getFavoritedPostsByThread,
    toggleFavoritePost,
    generateProjectSummaryReport,
    getAgentMemories,
    listAgentsWithMemories,
    saveUserStudyLog,
    getUserStudyLogs,
    checkSessionId,
    logUserStudyEvent,
    generatePersonasFromBaselineProposal,
    streamTaskProgress,
    monitorAddPapersProgress,
    testTaskProgress,
  };
}
