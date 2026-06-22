import React, { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Persona, PersonaLiterature as OriginalPersonaLiterature } from "@/types"
import { useUserStudyLogger } from '@/utils/userStudyLogger'

// Define a type for author objects
type Author = string | { name: string; [key: string]: any };

// Extend the PersonaLiterature type to correctly handle authors
interface PersonaLiterature extends Omit<OriginalPersonaLiterature, 'authors'> {
  authors: Author[];
}

import { CircleX, Trash2, FileTextIcon, InfoIcon, EyeIcon, GitBranchIcon, LayoutGridIcon, BookmarkIcon, CheckCircle } from "lucide-react"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { useApi } from "@/controller/API"
import { Dialog, DialogDescription, DialogTitle, DialogHeader, DialogContent, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAppStore } from "@/stores/appStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator as SeparatorUI } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  ProjectSummaryReport, 
  PerspectivesSummary,
  PerspectiveSummarySection,
  PerspectiveSummaryPoint,
  RelevantLiterature,
  ResearchProposal,
  ResearchProposalMotivation,
  ResearchProposalRelatedWorkCategory,
  ResearchProposalRelatedWork,
  ResearchProposalMethod 
} from "@/stores/appStore"

// Define a type for the memory node with children
type MemoryNode = {
  id: string;
  title: string;
  snippet: string;
  parent_id: string[];
  children: MemoryNode[];
};

export function PersonaInspector() {
  const { 
    selectedPersonaId, 
    setSelectedPersonaId, 
    getPersonaById, 
    isShowingPersonaProfile,
    setIsShowingPersonaProfile,
    projectSummaryReport,
    selectedProjectId,
    getSelectedProject,
    currentPanel,
    setCurrentPanel,
    updateProjectProposal
  } = useAppStore()

  const { getPersonaLiterature, getAgentMemories } = useApi();
  // Initialize the user study logger
  const logger = useUserStudyLogger();

  const [isPersonaLiteratureLoading, setIsPersonaLiteratureLoading] = useState(false);
  const [selectedPersonaLiterature, setSelectedPersonaLiterature] = useState<PersonaLiterature[]>([]);
  const [activeTab, setActiveTab] = useState<'literature' | 'memories'>('literature');
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(false);
  const [agentMemories, setAgentMemories] = useState<Array<{id: string, title: string, snippet: string, parent_id: string[]}>>([]);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);
  const [memoryViewMode, setMemoryViewMode] = useState<'grid' | 'tree'>('grid');
  const [collectedPapers, setCollectedPapers] = useState<Set<string>>(new Set());

  // if (!selectedPersonaId) {
  //   return <div className="h-full flex items-center justify-center text-muted-foreground">No persona selected</div>
  // }

  useEffect(() => {
    if (!selectedPersonaId) return;
    
    if (activeTab === 'literature') {
      setIsPersonaLiteratureLoading(true);
      getPersonaLiterature(selectedPersonaId.replace("_", " "))
        .then((res) => {
          setSelectedPersonaLiterature(res.data.literature);
          setIsPersonaLiteratureLoading(false);
        });
    } else if (activeTab === 'memories') {
      setIsMemoriesLoading(true);
      getAgentMemories(selectedPersonaId)
        .then((res) => {
          setAgentMemories(res.data.memories);
          setIsMemoriesLoading(false);
        })
        .catch((error) => {
          console.error("Failed to fetch agent memories:", error);
          setIsMemoriesLoading(false);
        });
    }
  }, [selectedPersonaId, activeTab]);

  const selectedProject = getSelectedProject();

  // Memory Tree Helper Functions
  const buildMemoryTree = () => {
    // Create a map of all memories by ID for quick lookup
    const memoryMap = new Map(
      agentMemories.map(memory => [
        memory.id, 
        { ...memory, children: [] as MemoryNode[] }
      ])
    );
    
    // Set of root nodes (memories with no parents in our dataset)
    const rootNodes: MemoryNode[] = [];
    
    // For each memory, add it as a child to its parents
    agentMemories.forEach(memory => {
      const memoryWithChildren = memoryMap.get(memory.id);
      if (!memoryWithChildren) return;
      
      // If memory has no parents or parents aren't in our dataset, it's a root node
      if (!memory.parent_id || memory.parent_id.length === 0) {
        rootNodes.push(memoryWithChildren);
      } else {
        // Add this memory as a child to each of its parents
        let addedToParent = false;
        memory.parent_id.forEach(parentId => {
          const parent = memoryMap.get(parentId);
          if (parent) {
            parent.children.push(memoryWithChildren);
            addedToParent = true;
          }
        });
        
        // If none of the parents were found in our dataset, treat as root node
        if (!addedToParent && !rootNodes.includes(memoryWithChildren)) {
          rootNodes.push(memoryWithChildren);
        }
      }
    });
    
    return rootNodes;
  };

  // Recursive Tree Node Component
  const MemoryTreeNode = ({ node, level = 0 }: { node: MemoryNode, level?: number }) => {
    if (!node) return null;
    
    return (
      <div className="ml-5 pl-4 border-l border-gray-300">
        <Card className="mb-3 border border-gray-200 hover:shadow-md transition-shadow relative">
          <CardContent className="pt-4">
            <Collapsible 
              className="w-full"
              open={expandedMemoryId === node.id}
              onOpenChange={(open) => {
                if (open) {
                  // Log memory expansion with complete memory information
                  logger.logInteraction('click', 'expand-memory', {
                    agent_id: selectedPersonaId || 'none',
                    memory: {
                      id: node.id,
                      title: node.title, 
                      snippet: node.snippet,
                      parent_id: node.parent_id,
                      children_count: node.children?.length || 0
                    }
                  });
                  setExpandedMemoryId(node.id);
                } else if (expandedMemoryId === node.id) {
                  // Log memory collapse with complete memory information
                  logger.logInteraction('click', 'collapse-memory', {
                    agent_id: selectedPersonaId || 'none',
                    memory: {
                      id: node.id,
                      title: node.title, 
                      snippet: node.snippet,
                      parent_id: node.parent_id,
                      children_count: node.children?.length || 0
                    }
                  });
                  setExpandedMemoryId(null);
                }
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <TooltipProvider>
                  <Tooltip delayDuration={10}>
                    <TooltipTrigger asChild>
                      <h2 className="text-gray-800 text-sm font-bold line-clamp-2 flex-1 my-0">{node.title}</h2>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{node.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:scale-105 transition-transform">
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  {node.children && node.children.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Children: {node.children.length}
                    </Badge>
                  )}
                </div>
              </div>
              <CollapsibleContent className="mt-3 absolute left-0 right-0 z-10 bg-white p-3 rounded-b-md shadow-lg border-x border-b border-gray-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 transition-all duration-300 ease-in-out">
                <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                  <p className="text-gray-700 text-sm italic">"{node.snippet}"</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
        
        {node.children && node.children.length > 0 && (
          <div className="ml-2">
            {node.children.map((child: any, index: number) => (
              <MemoryTreeNode key={index} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const paperComponent = (paper: PersonaLiterature): React.ReactNode => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center space-x-3">
              <div className="flex flex-col text-left">
                <div className="flex items-center">
                  <h3 className="font-semibold text-gray-900 max-w-128">
                    {paper.title}
                  </h3>
                  <a
                    href={paper.url}
                    target="_blank"
                    className="ml-2 flex-shrink-0"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Semantic_scholar_logo.png?20220923184403"
                      alt="Semantic Scholar"
                      className="w-6 h-6 max-w-none"
                    />
                  </a>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                {paper.authors.map((author: Author) => typeof author === 'string' ? author : author.name).join(', ')} ({paper.year})
                </p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{paper.title} <br /> by {paper.authors.map((author: Author) => typeof author === 'string' ? author : author.name).join(', ')} ({paper.year})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleCollectPaper = async (paper: PersonaLiterature) => {
    if (!selectedProjectId) return;
    
    // Log paper collection without awaiting
    logger.logInteraction('click', 'collect-paper', {
      agent_id: selectedPersonaId || 'none',
      paper_id: paper.paperId,
      paper_title: paper.title,
      project_id: selectedProjectId
    });
    
    // Format the paper information
    const authors = paper.authors.map((author: Author) => 
      typeof author === 'string' ? author : author.name
    ).join(', ');
    
    const paperInfo = `${paper.title} (${paper.year}) by ${authors}. ${paper.url}`;
    
    // Get the current project proposal
    const currentProposal = useAppStore.getState().getProjectProposal(selectedProjectId) || {
      motivation: '',
      relatedWork: '',
      methods: '',
      potentialOutcomes: '',
      notes: ''
    };
    
    // Append paper info to the relatedWork section
    const updatedRelatedWork = currentProposal.relatedWork 
      ? `${currentProposal.relatedWork}\n\n${paperInfo}` 
      : paperInfo;
    
    // Update the project proposal
    useAppStore.getState().updateProjectProposal(selectedProjectId, {
      relatedWork: updatedRelatedWork
    });
    
    // Make the proposal notes panel visible and expanded, and switch to the relatedWork tab
    useAppStore.getState().setIsProposalNoteVisible(true);
    useAppStore.getState().setIsExpandedProposalNote(true);
    useAppStore.getState().setActiveProposalTab('relatedWork');
    
    // Update state to mark this paper as collected
    setCollectedPapers(prev => {
      const updated = new Set(prev);
      updated.add(paper.paperId);
      return updated;
    });
  };

  const LiteraturePanel = (): React.ReactNode => (
    <div className="flex flex-col h-full justify-center items-center">
      <div className="flex flex-col mx-4 my-4 p-6 rounded-lg shadow-md bg-white h-[85vh] w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex-none">Agent Profile</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              // Log closing the profile without awaiting
              logger.logInteraction('click', 'close-agent-profile', {
                agent_id: selectedPersonaId || 'none',
                project_id: selectedProjectId || 'none'
              });
              
              setIsShowingPersonaProfile(false);
              setSelectedPersonaId(null);
            }}
            className="hover:scale-105 transition-transform"
          >
            <CircleX className="h-5 w-5" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b mb-4">
          <button
            className={cn(
              "py-2 px-4 font-medium text-sm transition-all",
              activeTab === 'literature'
                ? "border-b-2 border-primary text-primary bg-muted"
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => {
              if (activeTab !== 'literature') {
                // Log tab change without awaiting
                logger.logInteraction('click', 'switch-to-literature-tab', {
                  agent_id: selectedPersonaId || 'none',
                  previous_tab: activeTab
                });
                setActiveTab('literature');
              }
            }}
          >
            Literature
          </button>
          <button
            className={cn(
              "py-2 px-4 font-medium text-sm transition-all",
              activeTab === 'memories'
                ? "border-b-2 border-primary text-primary bg-muted"
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => {
              if (activeTab !== 'memories') {
                // Log tab change without awaiting
                logger.logInteraction('click', 'switch-to-memories-tab', {
                  agent_id: selectedPersonaId || 'none',
                  previous_tab: activeTab
                });
                setActiveTab('memories');
              }
            }}
          >
            Memories
          </button>
        </div>

        <ScrollArea className="flex flex-col gap-2 flex-grow">
          <div className="flex flex-col gap-2 mx-4 flex-grow">
            {/* Literature Tab Content */}
            {activeTab === 'literature' && (
              <>
                {isPersonaLiteratureLoading && <div className="space-y-2">
                  <Skeleton className="h-4 w-[350px]" />
                  <Skeleton className="h-4 w-[300px]" />
                  <Skeleton className="h-4 w-[350px]" />
                  <Skeleton className="h-4 w-[300px]" />
                </div>}
                {!isPersonaLiteratureLoading && selectedPersonaLiterature.length === 0 && <div className="text-muted-foreground">No literature found</div>}
                {!isPersonaLiteratureLoading && selectedPersonaLiterature.length > 0 && <ul className="space-y-2">
                  {selectedPersonaLiterature.map((paper) => (
                    <li
                      key={paper.paperId}
                      className="border border-gray-200 hover:shadow-lg rounded-lg p-4 transition-shadow bg-white"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 gap-2">
                        {paperComponent(paper)}
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="hover:scale-105 transition-transform"
                                onClick={() => {
                                  // Log viewing paper details without awaiting
                                  logger.logInteraction('click', 'view-paper-details', {
                                    agent_id: selectedPersonaId || 'none',
                                    paper_id: paper.paperId,
                                    paper_title: paper.title
                                  });
                                }}
                              >
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="pr-4">{paper.title}</DialogTitle>
                                <DialogDescription>
                                {paper.authors.map((author: Author) => typeof author === 'string' ? author : author.name).join(', ')} ({paper.year})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="mt-4">
                                <h4 className="font-semibold mb-2">Abstract</h4>
                                <p className="text-sm">{paper.abstract}</p>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant={collectedPapers.has(paper.paperId) ? "secondary" : "outline"} 
                            size="sm" 
                            className="hover:scale-105 transition-transform"
                            onClick={() => handleCollectPaper(paper)}
                            title="Add to research proposal"
                          >
                            {collectedPapers.has(paper.paperId) ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <BookmarkIcon className="w-4 h-4" />
                            )}
                          </Button>
                          <Button variant="destructive" size="sm" className="hover:scale-105 transition-transform" onClick={() => { }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>}
              </>
            )}

            {/* Memories Tab Content */}
            {activeTab === 'memories' && (
              <>
                {isMemoriesLoading && <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>}
                {!isMemoriesLoading && agentMemories.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-muted-foreground">No memories found for this agent.</p>
                    <p className="text-sm text-muted-foreground mt-2">Memories are created when an agent participates in discussions.</p>
                  </div>
                )}
                {!isMemoriesLoading && agentMemories.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">
                        Agent's Internal Thoughts
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant={memoryViewMode === 'grid' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => {
                            if (memoryViewMode !== 'grid') {
                              // Log view mode change without awaiting
                              logger.logInteraction('click', 'switch-to-grid-view', {
                                agent_id: selectedPersonaId || 'none',
                                previous_view: memoryViewMode
                              });
                              setMemoryViewMode('grid');
                            }
                          }}
                          className="hover:scale-105 transition-transform"
                        >
                          <LayoutGridIcon className="h-4 w-4 mr-1" />
                          Grid
                        </Button>
                        <Button 
                          variant={memoryViewMode === 'tree' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => {
                            if (memoryViewMode !== 'tree') {
                              // Log view mode change without awaiting
                              logger.logInteraction('click', 'switch-to-tree-view', {
                                agent_id: selectedPersonaId || 'none',
                                previous_view: memoryViewMode
                              });
                              setMemoryViewMode('tree');
                            }
                          }}
                          className="hover:scale-105 transition-transform"
                        >
                          <GitBranchIcon className="h-4 w-4 mr-1" />
                          Tree
                        </Button>
                      </div>
                    </div>
                    
                    {memoryViewMode === 'grid' ? (
                      <div className="grid grid-cols-2 gap-4">
                        {agentMemories.map((memory, index) => (
                          <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow relative">
                            <CardContent className="pt-4">
                              <Collapsible 
                                className="w-full"
                                open={expandedMemoryId === memory.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    // Log memory expansion with complete memory information
                                    logger.logInteraction('click', 'expand-memory', {
                                      agent_id: selectedPersonaId || 'none',
                                      memory: {
                                        id: memory.id,
                                        title: memory.title,
                                        snippet: memory.snippet,
                                        parent_id: memory.parent_id
                                      }
                                    });
                                    setExpandedMemoryId(memory.id);
                                  } else if (expandedMemoryId === memory.id) {
                                    // Log memory collapse with complete memory information
                                    logger.logInteraction('click', 'collapse-memory', {
                                      agent_id: selectedPersonaId || 'none',
                                      memory: {
                                        id: memory.id,
                                        title: memory.title,
                                        snippet: memory.snippet,
                                        parent_id: memory.parent_id
                                      }
                                    });
                                    setExpandedMemoryId(null);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <TooltipProvider>
                                    <Tooltip delayDuration={10}>
                                      <TooltipTrigger asChild>
                                        <h2 className="text-gray-800 text-sm font-bold line-clamp-2 flex-1 my-0">{memory.title}</h2>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{memory.title}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:scale-105 transition-transform">
                                        <EyeIcon className="h-4 w-4" />
                                      </Button>
                                    </CollapsibleTrigger>
                                    {memory.parent_id && memory.parent_id.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        Related: {memory.parent_id.length}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <CollapsibleContent className="mt-3 absolute left-0 right-0 z-10 bg-white p-3 rounded-b-md shadow-lg border-x border-b border-gray-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 transition-all duration-300 ease-in-out">
                                  <div className="rounded-md bg-slate-50 border border-slate-100 p-3">
                                    <p className="text-gray-700 text-sm italic">"{memory.snippet}"</p>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="border rounded-md p-4">
                        <div>
                          {buildMemoryTree().map((rootNode, index) => (
                            <MemoryTreeNode key={index} node={rootNode} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const ReportPanel = (): React.ReactNode => {
    if (!projectSummaryReport) {
      return (
        <div className="flex flex-col h-full justify-center items-center">
          <div className="flex flex-col mx-4 my-4 p-6 rounded-lg shadow-md bg-white h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex-none">Project Summary</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setIsShowingPersonaProfile(false);
                  setCurrentPanel('literature');
                }}
                className="hover:scale-105 transition-transform"
              >
                <CircleX className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-gray-500">No report available</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full justify-center items-center">
        <div className="flex flex-col mx-4 my-4 p-6 rounded-lg shadow-md bg-white h-[85vh]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <h2 className="text-2xl font-bold truncate max-w-[calc(100%-120px)]">Project Summary: {selectedProject?.name}</h2>
            <div className="flex-shrink-0 ml-auto">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  // Create and download HTML report
                  if (!projectSummaryReport) return;
                  
                  const reportHtml = generateReportHtml(projectSummaryReport, selectedProject?.name || 'Project');
                  
                  const blob = new Blob([reportHtml], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedProject?.name || 'project'}_report.html`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="hover:scale-105 transition-transform"
              >
                <FileTextIcon className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setIsShowingPersonaProfile(false);
                  setCurrentPanel('literature');
                }}
                className="hover:scale-105 transition-transform"
              >
                <CircleX className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <h3 className="font-medium text-lg mb-4">Perspectives Summary</h3>

          <ScrollArea className="flex-grow pr-4">
            <div className="space-y-8">
              {/* Perspectives Summary Content */}
              <div>
                {projectSummaryReport.perspectives_summary.sections.map((section, idx) => (
                  <Card key={idx} className="mb-4">
                    <CardHeader>
                      <CardTitle>{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {section.points.map((point, pidx) => (
                          <li key={pidx} className="flex flex-col items-start">
                            <Badge className="mr-2 mt-1 shrink-0" variant={getAgentBadgeVariant(point.agent)}>
                              {point.agent}
                            </Badge>
                            <div className="flex items-start mt-1">
                              <p>{point.point}</p>
                              {point.post_ids && point.post_ids.length > 0 && (
                                <div className="inline-flex ml-1 mt-1 gap-1">
                                  {point.post_ids.map((postId, idx) => (
                                    <TooltipProvider key={idx}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div 
                                            className="cursor-pointer" 
                                            onClick={() => useAppStore.getState().setHighlightedPostId(postId)}
                                          >
                                            <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">View post: {postId}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      {section.relevant_literature && section.relevant_literature.length > 0 && (
                        <>
                          <SeparatorUI className="my-4" />
                          <div>
                            <h4 className="font-medium mb-2">Relevant Literature</h4>
                            <ul className="space-y-2">
                              {section.relevant_literature.map((literature, lidx) => (
                                <li key={lidx}>
                                  <a 
                                    href={literature.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center"
                                  >
                                    {literature.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Helper function to get badge variant based on agent name
  const getAgentBadgeVariant = (agentName: string): "default" | "secondary" | "destructive" | "outline" => {
    const agentVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Philosopher": "default",
      "Scientist": "secondary",
      "Ethicist": "destructive",
      "Policymaker": "outline"
    };
    
    return agentVariants[agentName] || "default";
  };

  // Function to generate HTML report (copied from ProjectSummaryReportDialog)
  const generateReportHtml = (report: ProjectSummaryReport, projectName: string): string => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Research Summary Report - ${projectName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3, h4 {
            color: #1a56db;
            margin-top: 24px;
          }
          .card {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .card-title {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 12px;
          }
          ul {
            padding-left: 24px;
          }
          li {
            margin-bottom: 8px;
          }
          .badge {
            display: inline-block;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            margin-right: 8px;
          }
          .badge-default {
            background-color: #e5e7eb;
            color: #374151;
          }
          .badge-secondary {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .badge-destructive {
            background-color: #fee2e2;
            color: #b91c1c;
          }
          .badge-outline {
            border: 1px solid #d1d5db;
            color: #6b7280;
          }
          a {
            color: #2563eb;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .point-list {
            list-style-type: none;
            padding-left: 0;
          }
          .point-list li {
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 32px;
          }
          .header h1 {
            margin: 0;
          }
          .date {
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Research Summary Report</h1>
          <div class="date">${new Date().toLocaleDateString()}</div>
        </div>
        <h2>Project: ${projectName}</h2>
        
        <h2>Perspectives Summary</h2>
        ${report.perspectives_summary.sections.map((section: PerspectiveSummarySection) => `
          <div class="card">
            <div class="card-title">${section.title}</div>
            <ul class="point-list">
              ${section.points.map((point: PerspectiveSummaryPoint) => `
                <li>
                  <span class="badge badge-${getAgentBadgeVariant(point.agent)}">${point.agent}</span>
                  <span>${point.point}</span>
                </li>
              `).join('')}
            </ul>
            ${section.relevant_literature && section.relevant_literature.length > 0 ? `
              <h4>Relevant Literature</h4>
              <ul>
                ${section.relevant_literature.map((lit: RelevantLiterature) => `
                  <li><a href="${lit.url}" target="_blank">${lit.title}</a></li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
        
        <h2>Research Proposal</h2>
        <h3>Motivation</h3>
        <div class="card">
          <ul>
            ${report.research_proposal.motivation.map((item: ResearchProposalMotivation) => `
              <li>• ${item.point}</li>
            `).join('')}
          </ul>
        </div>
        
        <h3>Related Work</h3>
        <div class="card">
          ${report.research_proposal.related_works.map((category: ResearchProposalRelatedWorkCategory) => `
            <h4>${category.category}</h4>
            <ul>
              ${category.works.map((work: ResearchProposalRelatedWork) => `
                <li>
                  <strong>${work.title}</strong>
                  <p>${work.description}</p>
                </li>
              `).join('')}
            </ul>
          `).join('')}
        </div>
        
        <h3>Proposed Methods</h3>
        <div class="card">
          ${report.research_proposal.method.map((method: ResearchProposalMethod) => `
            <h4>${method.title}</h4>
            <ul>
              ${method.points.map((point: string | { text: string, post_ids?: string[] }) => `<li>${typeof point === 'string' ? point : point.text}</li>`).join('')}
            </ul>
          `).join('')}
        </div>
        
        <h3>Potential Outcomes</h3>
        <div class="card">
          <ul>
            ${report.research_proposal.potential_outcomes.map((outcome: string | { text: string, post_ids?: string[] }) => `
              <li>${typeof outcome === 'string' ? outcome : outcome.text}</li>
            `).join('')}
          </ul>
        </div>
      </body>
      </html>
    `;
  };

  if (!isShowingPersonaProfile) return null;

  // Conditional rendering based on the currentPanel state
  return currentPanel === 'literature' ? <LiteraturePanel /> : <ReportPanel />;
}

