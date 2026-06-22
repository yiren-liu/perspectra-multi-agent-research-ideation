import { Star, Trash, Info, ChevronsUpDown, ChevronsDownUp, Loader2, PlusCircle, MoreHorizontal, Copy, BookmarkPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonaAvatar } from '../PersonaAvatar'
import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { User } from '@supabase/supabase-js'
import { useApi } from '@/controller/API'
import { useAppStore } from '@/stores/appStore'
import { v4 as uuidv4 } from 'uuid'
import { AgentInfo, AgentResponse, AgentResponsePeekerData, ForumThread, Message, ForumThreadTopic, Citation } from '@/types'
import AgentResponsePeeker from './components/AgentResponsePeeker'
import { replacePaperIdWithCitation } from './utils'
import { useAuthStore } from '@/stores/authStore'
import { FolderIcon } from "lucide-react"
import { useUserStudyLogger } from '@/utils/userStudyLogger'

interface Reply {
  message: Message
  replies: Reply[]
}

interface DiscussionThread {
  message: Message
  replies: Reply[]
}

interface Discussion {
  id: string
  topic: string
  discussion_thread: DiscussionThread[]
}


interface ThreadProps {
  thread: ForumThread
}

export function Thread({ thread, onDelete, onCreateNewThread }: ThreadProps & { onDelete: () => void, onCreateNewThread: (topic: ForumThreadTopic) => void }) {
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const { 
    selectedThreadId, 
    setSelectedThreadId, 
    getThreadProgressStatus, 
    deleteMessageFromThread,
    projects,
    addThreadToProject,
    getProjectForThread,
    toggleThreadFavoriteState,
    isFavoritedThread,
    getAgentParticipantsForThread,
    addAgentToThread,
    agentCatalog,
    setSelectedPersonaId,
    setIsShowingPersonaProfileDialog
  } = useAppStore(); 
  const { toggleFavoriteThread } = useApi();

  const [isPostsOpen, setPostsOpen] = useState(false);
  const [isAgentSelectOpen, setIsAgentSelectOpen] = useState(false);
  const agentSelectRef = useRef<HTMLDivElement>(null);
  
  // For scroll tracking
  const threadContentRef = useRef<HTMLDivElement>(null);
  const [lastScrollTime, setLastScrollTime] = useState(0);
  const [scrollDepthLogged, setScrollDepthLogged] = useState<Set<number>>(new Set());
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize logger
  const logger = useUserStudyLogger();

  // Get the current project for this thread
  const currentProjectId = getProjectForThread(thread.discussion.id);
  const currentProject = projects.find(p => p.id === currentProjectId);

  // Get agent participants for this thread
  const agentParticipants = getAgentParticipantsForThread(thread.discussion.id);

  // Close the agent select dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentSelectRef.current && !agentSelectRef.current.contains(event.target as Node)) {
        setIsAgentSelectOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Cleanup scroll tracking timeout when component unmounts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const containerClasses = `${selectedThreadId === thread.discussion.id ? 'bg-blue-50' : 'bg-white'} rounded-lg shadow-md p-4`;
  
  const handleToggleFavorite = () => {
    // Log the toggling of thread favorite status without awaiting
    logger.logInteraction('click', 'toggle-favorite-thread', {
      thread_id: thread.discussion.id,
      thread_topic: thread.discussion.topic,
      new_status: !isFavoritedThread(thread.discussion.id)
    });
    
    // Toggle favorite status
    toggleThreadFavoriteState(thread.discussion.id, !isFavoritedThread(thread.discussion.id));
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Log thread deletion event
    logger.logInteraction('click', 'delete-thread', {
      thread_id: thread.discussion.id,
      thread_topic: thread.discussion.topic
    });
    
    onDelete();
  };

  const handleClick = () => {
    // If this thread is already selected and expanded, do nothing
    if (selectedThreadId === thread.discussion.id && isPostsOpen) {
      return;
    }
    
    // Log thread selection without awaiting
    logger.logInteraction('click', 'forum-thread', {
      thread_id: thread.discussion.id,
      thread_topic: thread.discussion.topic,
      is_expanded: isPostsOpen
    });
    
    // Toggle expanded state
    setPostsOpen(!isPostsOpen);
    
    // Set as selected thread
    setSelectedThreadId(thread.discussion.id);
    
    // Reset scroll tracking when opening a thread
    if (!isPostsOpen) {
      setScrollDepthLogged(new Set());
    }
  };

  // Handle scrolling in thread content
  const handleThreadScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // Don't proceed if the content is too small to scroll
    if (scrollHeight <= clientHeight) return;
    
    const scrollPercentage = Math.floor((scrollTop / (scrollHeight - clientHeight)) * 100);
    
    // Throttle logging
    const now = Date.now();
    if (now - lastScrollTime < 300) return;
    
    // Set scrolling state and clear any existing timeout
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a timeout to detect when scrolling stops
    scrollTimeoutRef.current = setTimeout(async () => {
      setIsScrolling(false);
      
      // Log where the user paused (likely reading content)
      // logger.logInteraction('scroll', 'thread-content-pause', {
      //   thread_id: thread.discussion.id,
      //   scroll_percentage: scrollPercentage,
      //   scroll_position: scrollTop
      // });
    }, 1000);
    
    // Check for important scroll depths (25%, 50%, 75%, 100%)
    const depthsToLog = [25, 50, 75, 100];
    for (const depth of depthsToLog) {
      if (scrollPercentage >= depth && !scrollDepthLogged.has(depth)) {
        // Add this depth to the set of logged depths
        const newLogged = new Set(scrollDepthLogged);
        newLogged.add(depth);
        setScrollDepthLogged(newLogged);
        
        // Log reaching this scroll depth
        logger.logInteraction('scroll', 'thread-content-depth', {
          thread_id: thread.discussion.id,
          thread_topic: thread.discussion.topic,
          scroll_percentage: depth
        });
        
        setLastScrollTime(now);
        break; // Only log one depth per scroll event
      }
    }

    // Only log scroll positions at 100% (fully scrolled to bottom of thread)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;
    const hasReachedBottom = scrollDepthLogged.has(100);
    if (isAtBottom && !hasReachedBottom) {
      // Log that user has reached bottom of thread without awaiting
      logger.logInteraction('scroll', 'forum-thread-bottom', {
        thread_id: thread.discussion.id,
        thread_topic: thread.discussion.topic
      });
      setScrollDepthLogged(new Set([100]));
    }
  };

  return (
    <div className={containerClasses} onClick={handleClick}>
      <Collapsible open={isPostsOpen} onOpenChange={setPostsOpen}>
        <div className="flex flex-col gap-2">
          {/* Header: topic title + actions */}
          <div className="flex items-center w-full gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="link" size="sm">
                {isPostsOpen ? <ChevronsDownUp className="w-4 h-4" /> : <ChevronsUpDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            {/* The title is placed in a flex-1 container so it starts immediately after the toggle */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {thread.discussion.topic}
              </h2>
              
              {/* Topic description */}
              {thread.discussion.topic_description && (
                <p className="text-sm text-gray-600 mt-1">
                  {thread.discussion.topic_description}
                </p>
              )}
            </div>
            
            {/* Agent Avatars */}
            <div className="flex items-center mr-4">
              {agentParticipants.map((agent) => (
                agent && (
                  <TooltipProvider key={agent.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="rounded-full bg-gray-200 flex items-center justify-center w-7 h-7 -ml-1 first:ml-0 text-sm border-2 border-white cursor-pointer"
                          onClick={(e) => {
                            // Log agent profile view
                            logger.logInteraction('click', 'view-agent-profile-thumbnail', {
                              thread_id: thread.discussion.id,
                              agent_name: agent.name,
                              project_id: currentProjectId || 'none'
                            });
                            
                            setSelectedPersonaId(agent.name)
                            setIsShowingPersonaProfileDialog(true)
                          }}
                        >
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="p-3 max-w-xs">
                        <div className="space-y-2">
                          <h4 className="font-bold">{agent.name}</h4>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              ))}
              
              {/* Add agent button */}
              <div className="relative" ref={agentSelectRef}>
                <Button
                  variant="ghost"
                  className="rounded-full w-7 h-7 p-0 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAgentSelectOpen(!isAgentSelectOpen);
                  }}
                >
                  <PlusCircle className="h-5 w-5" />
                </Button>
                
                {isAgentSelectOpen && (
                  <div className="absolute z-10 top-full mt-1 right-0 bg-white rounded-md shadow-lg p-2 w-48">
                    <h3 className="text-sm font-medium mb-2">Add agent to discussion</h3>
                    <div className="max-h-40 overflow-y-auto">
                      {agentCatalog
                        .filter(agent => !agentParticipants.some(p => p?.name === agent.name))
                        .map(agent => (
                          <div 
                            key={agent.name}
                            className="flex items-center p-1.5 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              addAgentToThread(thread.discussion.id, agent.name);
                              setIsAgentSelectOpen(false);
                            }}
                          >
                            <div className="rounded-full bg-gray-200 flex items-center justify-center w-6 h-6 mr-2">
                              {agent.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{agent.name}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Project badge */}
            {currentProject && (
              <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-full text-xs mr-2">
                <span>{currentProject.emoji}</span>
                <span>{currentProject.name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleToggleFavorite} size="icon" className="h-7 w-7">
                <Star className={isFavoritedThread(thread.discussion.id) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'} />
              </Button>
              
              {/* Project assignment dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Move to Project</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {projects.map(project => (
                    <DropdownMenuItem
                      key={project.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        addThreadToProject(thread.discussion.id, project.id);
                      }}
                    >
                      <span className="mr-2">{project.emoji}</span>
                      <span>{project.name}</span>
                      {currentProjectId === project.id && (
                        <span className="ml-auto">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="ghost" onClick={handleDelete} size="icon" className="h-7 w-7">
                <Trash className="text-red-500" />
              </Button>
              {getThreadProgressStatus(thread.discussion.id) && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p>{getThreadProgressStatus(thread.discussion.id)}</p>
                </>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <CollapsibleContent>
            <div 
              ref={threadContentRef}
              className="ml-8 space-y-4 mt-2 overflow-auto max-h-[70vh]"
              onScroll={handleThreadScroll}
            >
              {thread.discussion.discussion_thread.map((discussionThread) => (
                <Post
                  key={discussionThread.message.id}
                  thread_id={thread.discussion.id}
                  post={discussionThread.message}
                  replies={discussionThread.replies}
                  citations={thread.citations}
                  activeReplyId={activeReplyId}
                  setActiveReplyId={setActiveReplyId}
                  isRoot={true}
                  onCreateNewThread={onCreateNewThread}
                />
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  )
}

function Post({ post, replies, citations, activeReplyId, setActiveReplyId, thread_id, isRoot = false, onCreateNewThread}: { 
  post: Message, 
  thread_id: string,
  replies: Reply[], 
  citations: Citation[], 
  activeReplyId: string | null, 
  setActiveReplyId: (id: string | null) => void,
  isRoot?: boolean,
  onCreateNewThread?: (topic: ForumThreadTopic) => void
}) {
  const { getAgentCatalog, getAgentResponse, toggleFavoritePost } = useApi();
  const { 
    agentCatalog, 
    setAgentCatalog, 
    agentActions, 
    getThreadById, 
    addReply, 
    deleteMessageFromThread, 
    getAgentInfoByName,
    togglePostFavoriteState,
    isFavoritedPost,
    highlightedPostId,
    setHighlightedPostId,
    getProjectForThread,
    updateProjectProposal,
    getProjectProposal,
    setIsProposalNoteVisible,
    setIsExpandedProposalNote,
    setActiveProposalTab,
    addCitationsToThread
  } = useAppStore();
  const { getCurrentUser } = useAuthStore();
  // Get the logger at component level
  const logger = useUserStudyLogger();

  const [agentResponsePeekerData, setAgentResponsePeekerData] = useState<AgentResponsePeekerData | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const processedContent = replacePaperIdWithCitation(post.content, citations);
  const [replyText, setReplyText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRepliesOpen, setRepliesOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // New state for mention functionality
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionedAgents, setMentionedAgents] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Add ref for the post element
  const postRef = useRef<HTMLDivElement>(null);
  
  // Add state for text selection popup
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPos, setSelectionPos] = useState<{x: number, y: number} | null>(null);
  const selectionPopupRef = useRef<HTMLDivElement>(null);
  
  // Scroll to this post when it's highlighted
  useEffect(() => {
    if (highlightedPostId === post.id && postRef.current) {
      postRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Clear the highlighted post ID after a short delay to make the highlight more noticeable
      const timer = setTimeout(() => {
        setHighlightedPostId(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightedPostId, post.id, setHighlightedPostId]);
  
  useEffect(() => {
    getCurrentUser().then((user) => {
      setCurrentUser(user);
    });
  }, [getCurrentUser]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent collapsing when clicking the star
    try {
      const isCurrentlyFavorited = isFavoritedPost(post.id);
      
      // Use the logger instance from the component level
      logger.logInteraction('click', 'toggle-post-favorite', {
        thread_id: thread_id,
        post_id: post.id,
        post_author: post.author,
        previous_state: isCurrentlyFavorited ? 'favorited' : 'not-favorited',
        new_state: isCurrentlyFavorited ? 'not-favorited' : 'favorited'
      });
      
      const response = await toggleFavoritePost(thread_id, post.id);
      if (response.status === 200) {
        // Update local state
        togglePostFavoriteState(post.id, !isCurrentlyFavorited);
      }
    } catch (error) {
      console.error('Error toggling post favorite:', error);
    }
  };

  const handleReplyClick = () => {
    getAgentCatalog().then((res) => {
      setAgentCatalog(res.data.agent_catalog);
    });

    if (activeReplyId === post.id) {
      setActiveReplyId(null);
      setSelectedAgent('');
      // Reset mention state
      setMentionedAgents([]);
    } else {
      setActiveReplyId(post.id);
    }
  };

  const handlePostReply = async () => {
    if (!replyText.trim()) return;
    setIsGenerating(true);
    
    const userName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'User';
    const newUserReplyId = uuidv4();
    
    // Determine which agents to query
    // Start with the parent message author if not already mentioned
    const agentsToQuery = [...mentionedAgents];
    if (!agentsToQuery.includes(post.author)) {
      agentsToQuery.push(post.author);
    }
    
    // Create the user message
    const newMessage: Message = {
      id: newUserReplyId,
      author: userName,
      chosen_action: '',
      reason: '',
      content: replyText, // Keep original text with @mentions
      multi_level_summary: null
    };
    
    // Add the user reply to the thread
    addReply(thread_id, post.id, newMessage);
    setReplyText('');
    setActiveReplyId(null);
    
    const thread = getThreadById(thread_id);
    if (!thread) {
      setIsGenerating(false);
      return;
    }
    
    // Create a function to process a single agent response
    const processAgentResponse = async (agentName: string) => {
      const targetAgent = getAgentInfoByName(agentName);
      if (!targetAgent) return;
      
      const targetMessage = `@${userName}: ${replyText}`;
      try {
        const res = await getAgentResponse(targetAgent.name, targetMessage, null, thread);

        // Use the logger instance from the component level
        logger.logInteraction('receive', 'agent-response', {
          thread_id: thread_id,
          post_id: newUserReplyId,
          agent_name: targetAgent.name,
          action: res.data.agent_response.chosen_action || 'none',
          user_message: replyText
        });
        

        // add citation
        const citations = res.data.agent_response.citations;
        if (citations) {
          addCitationsToThread(thread_id, citations);
        }

        // Add the agent's reply
        addReply(thread_id, newUserReplyId, {
          id: uuidv4(),
          author: targetAgent.name,
          content: res.data.agent_response.next_response.content,
          chosen_action: res.data.agent_response.chosen_action,
          reason: res.data.agent_response.reason,
          multi_level_summary: res.data.agent_response.multi_level_summary
        });
      } catch (error) {
        console.error(`Error getting response from ${agentName}:`, error);
      }
    };
    
    // Process all agent responses in parallel
    try {
      await Promise.all(agentsToQuery.map(agentName => processAgentResponse(agentName)));
    } finally {
      setIsGenerating(false);
      setMentionedAgents([]);
    }
  };

  // Handle text changes in reply textarea
  const handleReplyTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setReplyText(value);
    
    const position = e.target.selectionStart || 0;
    setCursorPosition(position);
    
    // Check if we should show the mention dropdown
    const textBeforeCursor = value.substring(0, position);
    const atSignIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atSignIndex !== -1) {
      // Check if there's a space between the last @ and the cursor
      const textBetweenAtAndCursor = textBeforeCursor.substring(atSignIndex + 1);
      
      if (!textBetweenAtAndCursor.includes(' ')) {
        setShowMentionDropdown(true);
        setMentionSearchText(textBetweenAtAndCursor);
        return;
      }
    }
    
    setShowMentionDropdown(false);
  };
  
  // Apply mention from dropdown
  const applyMention = (agentName: string) => {
    if (textareaRef.current) {
      const textBeforeCursor = replyText.substring(0, cursorPosition);
      const textAfterCursor = replyText.substring(cursorPosition);
      
      const atSignIndex = textBeforeCursor.lastIndexOf('@');
      const newText = textBeforeCursor.substring(0, atSignIndex + 1) + agentName + ' ' + textAfterCursor;
      
      setReplyText(newText);
      
      // Add to mentioned agents list if not already included
      if (!mentionedAgents.includes(agentName)) {
        setMentionedAgents([...mentionedAgents, agentName]);
      }
      
      setShowMentionDropdown(false);
      
      // Focus back on textarea and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPosition = atSignIndex + agentName.length + 2; // +2 for @ and space
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };
  
  // Filter agents for mention dropdown
  const filteredAgents = useMemo(() => {
    if (!mentionSearchText) return agentCatalog;
    return agentCatalog.filter(agent => 
      agent.name.toLowerCase().includes(mentionSearchText.toLowerCase())
    );
  }, [agentCatalog, mentionSearchText]);

  // Add back the handleRequestAgentAction function that was removed
  const handleRequestAgentAction = async (action: string, agent: AgentInfo) => {
    const thread = getThreadById(thread_id);
    if (!thread) return;
    setIsGenerating(true);
    const targetMessage = `@${agent.name} (${action}): ${post.content}`;
    await getAgentResponse(agent.name, targetMessage, action, thread)
      .then((res) => {
        setAgentResponsePeekerData({
          reply_to_msg_id: post.id,
          agent_response: res.data.agent_response,
          agent: agent
        });
      })
      .finally(() => {
        setIsGenerating(false);
      });
  };

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectedText(selection.toString());
      
      // Position directly below the selection with a small offset
      setSelectionPos({
        x: rect.left + (rect.width / 2),
        y: rect.bottom + 5 // Add a small offset from the selection
      });
    } else {
      // Close popup if there's no selection
      setSelectionPos(null);
    }
  };
  
  // Close selection popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectionPopupRef.current && !selectionPopupRef.current.contains(e.target as Node)) {
        setSelectionPos(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Add selected text to project notes
  const addToProjectNotes = () => {
    if (!selectedText) return;
    
    // Get current project ID for this thread
    const projectId = useAppStore.getState().getProjectForThread(thread_id);
    if (!projectId) return;
    
    // Get current project proposal
    const currentProposal = useAppStore.getState().getProjectProposal(projectId) || {
      motivation: '',
      relatedWork: '',
      methods: '',
      potentialOutcomes: '',
      notes: ''
    };
    
    // Format the note with attribution
    const formattedNote = `"${selectedText}" - from ${post.author}'s post`;
    
    // Append to notes section
    const updatedNotes = currentProposal.notes 
      ? `${currentProposal.notes}\n\n${formattedNote}` 
      : formattedNote;
    
    // Update project proposal
    useAppStore.getState().updateProjectProposal(projectId, {
      notes: updatedNotes
    });
    
    // Make the proposal notes panel visible and expanded, and switch to the notes tab
    useAppStore.getState().setIsProposalNoteVisible(true);
    useAppStore.getState().setIsExpandedProposalNote(true);
    useAppStore.getState().setActiveProposalTab('notes');
    
    // Log the take note action
    logger.logFeatureUsage('take_note', 'add_to_project_notes', {
      project_id: projectId,
      project_name: useAppStore.getState().projects.find(p => p.id === projectId)?.name,
      thread_id: thread_id,
      post_author: post.author,
      selection_length: selectedText.length,
      note_content: formattedNote
    });
    
    // Close the popup
    setSelectionPos(null);
    
    // Optional: show a confirmation toast
    // toast.success("Added to project notes");
  };

  const containerClass = isRoot
    ? "mb-4"
    : "border-l-2 border-gray-200 pl-4 ml-10";

  return (
    <div className={containerClass}>
      <div 
        ref={postRef}
        className={`${highlightedPostId === post.id ? 'border-yellow-400 bg-yellow-50 animate-pulse border-slate-200' : 'border-slate-200'}`}
      >
        <div className="flex items-start space-x-3 mb-2">
          <PersonaAvatar persona={{ id: post.author, name: post.author, avatar: '' }} />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{post.author}</p>
              <Button
                variant="ghost"
                onClick={() => {
                  if (onCreateNewThread) {
                    onCreateNewThread({
                      topic: post.content.slice(0, 30) 
                        + (post.content.length > 30 ? '...' : ''),
                      topic_description: post.content,
                    })
                  }
                }}
                size="icon"
                className="h-7 w-7"
              >
                <PlusCircle className="text-green-500" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleToggleFavorite}
                size="icon"
                className="h-7 w-7"
              >
                <Star className={isFavoritedPost(post.id) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => deleteMessageFromThread(thread_id, post.id)}
                size="icon"
                className="h-7 w-7"
              >
                <Trash className="text-red-500" />
              </Button>
            </div>
            <div>
              {post.chosen_action && (
                <div className="text-sm flex items-center gap-2 mb-1">
                  <span className="text-gray-600 font-medium">Action:</span>
                  <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                    <span className="text-gray-800">{post.chosen_action}</span>
                    {post.reason && (
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center cursor-help">
                              <Info className="w-4 h-4 text-blue-500" />
                              <span className="text-xs text-blue-500 ml-1">why?</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs bg-blue-50 border-blue-200">
                            <div className="p-1">
                              <p className="font-medium text-blue-700 mb-1">Reasoning:</p>
                              <p className="text-gray-700">{post.reason}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p onMouseUp={handleTextSelection}>{processedContent}</p>
            
            {/* Selection popup */}
            {selectionPos && (
              <div 
                ref={selectionPopupRef}
                className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200"
                style={{
                  left: `${selectionPos.x}px`,
                  top: `${selectionPos.y}px`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="p-1 flex">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1" 
                    onClick={addToProjectNotes}
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    <span>Take Note</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedText);
                      setSelectionPos(null);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </Button>
                </div>
              </div>
            )}
            
            {!agentResponsePeekerData && <div className="flex justify-end space-x-2">
              <DropdownMenu
                modal={false}
                onOpenChange={(open: boolean) => {
                  if (open && (!agentCatalog || agentCatalog.length === 0)) {
                    getAgentCatalog().then((res) => setAgentCatalog(res.data.agent_catalog))
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="mt-2">
                    <span>@</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <ScrollArea className="h-64">
                    {agentCatalog && agentCatalog.length > 0 ? (
                      agentCatalog.map((agent: AgentInfo) => (
                        <DropdownMenuSub key={agent.name}>
                          <DropdownMenuSubTrigger>
                            {agent.name}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {agentActions.map((action) => (
                                <DropdownMenuItem key={action.action} className="flex justify-between">
                                  <DropdownMenuItem onClick={
                                    () => handleRequestAgentAction(action.action, agent)
                                  }>{action.action}</DropdownMenuItem>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-pointer">
                                        <Info className="w-4 h-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{action.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No Agents Available Yet</DropdownMenuItem>
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="link" onClick={handleReplyClick} className="mt-2">
                {activeReplyId === post.id ? 'Cancel' : 'Reply'}
              </Button>
            </div>}
            {activeReplyId === post.id && (
              <div className="mt-2 relative">
                <p className="font-medium">{currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'User'}:</p>
                <textarea
                  ref={textareaRef}
                  className="w-full border border-gray-300 rounded p-2 mb-2 bg-white text-gray-900"
                  rows={2}
                  value={replyText}
                  onChange={handleReplyTextChange}
                  placeholder="Type @ to mention agents (parent agent will be notified by default)"
                />
                
                {/* Mention dropdown */}
                {showMentionDropdown && filteredAgents.length > 0 && (
                  <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto w-64">
                    {filteredAgents.map(agent => (
                      <div 
                        key={agent.name}
                        className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => applyMention(agent.name)}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                          {agent.name[0]}
                        </div>
                        <div>{agent.name}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Display mentioned agents as tags */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-sm font-medium mr-1">Will notify:</span>
                  {mentionedAgents.length > 0 ? (
                    mentionedAgents.map(agent => (
                      <span 
                        key={agent} 
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                        title={`${agent} will be notified`}
                      >
                        @{agent}
                      </span>
                    ))
                  ) : (
                    <span 
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                      title={`${post.author} will be notified (parent post author)`}
                    >
                      @{post.author} (default)
                    </span>
                  )}
                </div>
                
                <Button onClick={handlePostReply}>Post Reply</Button>
              </div>
            )}
            {agentResponsePeekerData && (
              <AgentResponsePeeker agentResponsePeekerData={agentResponsePeekerData} 
                threadId={thread_id} parentMessageId={post.id} setAgentResponsePeekerData={setAgentResponsePeekerData} 
                onAgentOrActionChange={handleRequestAgentAction} onCancel={() => {
                  setAgentResponsePeekerData(null);
                  setIsGenerating(false);
                }} />
            )}
          </div>
        </div>

        {/* Display spinner if generating a response */}
        {isGenerating && (
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p>generating response ...</p>
          </div>
        )}

        {replies.length > 0 && (
          <Collapsible open={isRepliesOpen} onOpenChange={setRepliesOpen}>
            <div className="flex justify-start">
              <CollapsibleTrigger asChild>
                <Button variant="link" size="sm">
                  {isRepliesOpen ? <ChevronsDownUp className="w-4 h-4" /> : <ChevronsUpDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="ml-8 space-y-4 mt-2">
                {replies.map((reply) => (
                  <Post 
                    key={reply.message.id} 
                    thread_id={thread_id}
                    post={reply.message} 
                    replies={reply.replies} 
                    citations={citations} 
                    activeReplyId={activeReplyId}
                    setActiveReplyId={setActiveReplyId}
                    onCreateNewThread={onCreateNewThread}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

