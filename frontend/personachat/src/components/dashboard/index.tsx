import { useEffect, useMemo, useState } from 'react'
import { Search, Book, X, MessageSquare, User, Square, SquareCheck, RefreshCcw, Loader2, MoreHorizontal, ChevronRight } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import ForceGraph2D from 'react-force-graph-2d';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useApi } from '@/controller/API';

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from '@/hooks/use-toast'

import { Persona, GraphData, Paper, ChatMessage } from '@/types';
import ChatPanel from '../chatPanel'
import { useChatStore } from '@/stores/chatStore'
import PaperSearchPanel from '../paperSearchPanel'
import LRTable from './components/LRTable'
import ChatTraitEditor from './components/ChatTraitEditor'
import { ModeToggle } from '../themes/mode-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

export default function ScholarlyPaperSearchWithExpertPersonas() {
  const getRandomDummyAvatarUrlList = useMemo(() => {
    let indexList = [1, 2, 3, 4, 5];
    indexList.sort(() => Math.random() - 0.5);
    return indexList.map(index => `https://ui.shadcn.com/avatars/0${index}.png`);
  }, []);

  const { selectedPersonaId, setSelectedPersonaId, isPersonasReady, setIsPersonasReady, 
    chatMessages, setCurrentMessage, personas, setPersonas,
    searchResults, setSearchResults, includedPapers, setIncludedPapers, selectedPaper, setSelectedPaper,
    isRefreshingGraph, setIsRefreshingGraph, isRefreshingTable, setIsRefreshingTable, graphData, setGraphData,
    lastSubmittedSearchQuery, LRTableData, setLRTableData, userPersonaId, setUserPersonaId, handleTraitChange,
    getSelectedPersona, getUserPersona, tableOfContents, setTableOfContents
  } = useChatStore();


  const { getDemoPapers, getDemoPersonas, getPersonaKG, generatePersonasFromPapersTopic, generateTableFromPapers, getPersonaDescEdits, generateTableFromDialogueHistory } = useApi();


  useEffect(() => {
    setIsPersonasReady(personas.length > 0 && searchResults.length > 0)
  }, [personas, searchResults])

  
  
  
  const [isTraitsDialogOpen, setIsTraitsDialogOpen] = useState(false);
  
  const [openTraitsCollapsibles, setOpenTraitsCollapsibles] = useState<Record<string, boolean>>({});
  const isTraitsCollapsibleOpen = (path: string) => openTraitsCollapsibles.hasOwnProperty(path) ? openTraitsCollapsibles[path] : true
  function renderTraits(traits: any, path: string[] = [], depth: number = 0) {
    return Object.entries(traits).map(([key, value]) => {
      const currentPath = [...path, key];
      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
      const pathKey = currentPath.join('.');
  
      if (typeof value === 'object' && value !== null) {
        const headingClass = depth === 0 ? "text-xl" : depth === 1 ? "text-lg" : "text-base";
        return (
          <Collapsible 
            key={pathKey} 
            open={isTraitsCollapsibleOpen(pathKey)} 
            onOpenChange={(isOpen) => setOpenTraitsCollapsibles(
              prev => ({ ...prev, [pathKey]: isOpen })
            )}
            className={`space-y-2 ${depth > 0 ? 'mt-4' : 'mt-6'}`}
          >
            <CollapsibleTrigger className="flex items-center w-full text-left">
              <ChevronRight className={`h-4 w-4 mr-2 transition-transform duration-200 ${isTraitsCollapsibleOpen(pathKey) ? 'rotate-90' : ''}`} />
              <h4 className={`${headingClass} font-semibold text-primary`}>{formattedKey}</h4>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className={`pl-4 ${depth > 0 ? 'border-l-2 border-muted' : ''}`}>
                {renderTraits(value, currentPath, depth + 1)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      } else {
        return (
          <div key={pathKey} className="flex flex-col space-y-1 mt-2">
            <Label htmlFor={pathKey} className="text-sm font-medium text-muted-foreground">
              {formattedKey}
            </Label>
            <Input
              id={pathKey}
              type="text"
              value={value}
              onChange={(e) => handleTraitChange(currentPath, e.target.value)}
              className="max-w-md"
            />
          </div>
        );
      }
    });
  }

  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);

  const fetchNewPersonas = async () => {
    setIsLoadingPersonas(true);
    await generatePersonasFromPapersTopic(lastSubmittedSearchQuery, includedPapers).then((res) => {
      let newPersonas = res.data.personas
      newPersonas.forEach((persona, index) => {
        persona.avatar = getRandomDummyAvatarUrlList[index]
      })
      setPersonas(newPersonas)
    }).catch((error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch new personas"
      })
    }).finally(() => {
      setIsLoadingPersonas(false);
      setIsRefreshingGraph(false)
    })
  }
  // Utility function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  }


  // Table Collapsible
  const [isTableCollapsibleOpen, setIsTableCollapsibleOpen] = useState(true);
  const [isChatCollapsibleOpen, setIsChatCollapsibleOpen] = useState(true);

  return (
    <div className="flex flex-col lg:flex-row justify-center">
      {/* Left Panel: Scholarly Paper Search */}
      <div className="lg:w-1/2">
        <PaperSearchPanel />
      </div>
    
      {/* Right Panel: Button to generate new personas */}
      {
        !isPersonasReady && includedPapers.length > 0 && 
        <div className="lg:w-1/2 border-l px-8 flex justify-center">
          <div className="flex items-center mb-4 gap-2">
            <Button onClick={fetchNewPersonas} disabled={isLoadingPersonas}>
              {isLoadingPersonas ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Generate New Personas"
              )}
            </Button>
          </div>
        </div>
      }
      {/* Right Panel: Expert Personas */}
      {isPersonasReady && <div className="lg:w-1/2 border-l px-8 flex flex-col">
        <div className="flex items-center mb-4 gap-2">
          <h2 className="text-2xl font-bold">Expert Personas</h2>
          <Button
            variant="default"
            onClick={() => {
              if (includedPapers.length === 0) {
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Please select at least one paper before generating personas"
                });
                return;
              }
              toast({
                title: "Generating personas...",
                description: "This may take a few minutes"
              });
            }}
          >
            Re-generate Personas
          </Button>
        </div>
        <ScrollArea>
          <div className="flex space-x-2 mb-4">
            {personas.map(persona => (
              <Button
                key={persona.id}
                variant={selectedPersonaId === persona.id ? 'default' : 'outline'}
                onClick={() => setSelectedPersonaId(persona.id)}
                className="flex items-center space-x-2 h-12"
              >
                <Avatar>
                  <AvatarImage src={persona.avatar} alt={persona.name} />
                  <AvatarFallback>{persona.name[0]}</AvatarFallback>
                </Avatar>
                <span>{persona.name}</span>
                {/* Button to open traits dialog */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-full p-2"
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setIsTraitsDialogOpen(true)}>Edit Traits</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setUserPersonaId(persona.id)}>Set as My Persona</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* {selectedPersonaId && (
          <Collapsible open={isTableCollapsibleOpen} onOpenChange={setIsTableCollapsibleOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-gray-100">
              <h3 className="text-lg font-semibold">Perspective Viewer</h3>
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isTableCollapsibleOpen ? 'rotate-90' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Tabs defaultValue="table" className="flex flex-col py-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="graph" className="flex items-center gap-2">
                    Knowledge Graph
                    <span
                      className={`hover:text-blue-500 cursor-pointer ${isRefreshingGraph ? 'animate-spin' : ''}`}
                      onClick={() => {
                        if (includedPapers.length === 0) {
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Please select at least one paper before regenerating the graph"
                          });
                          return;
                        }

                        setIsRefreshingGraph(true)
                        if (includedPapers.length > 0) {
                          if (!getSelectedPersona()) {
                            toast({
                              variant: "destructive",
                              title: "Error",
                              description: "Please select a persona before regenerating the graph"
                            });
                            return;
                          }
                          getPersonaKG(getSelectedPersona()!, lastSubmittedSearchQuery, includedPapers).then((res) => {
                            setGraphData(res.data.results)
                          }).catch((error) => {
                            console.error(error)
                          }).finally(() => {
                            setIsRefreshingGraph(false)
                          })
                        }
                      }}
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="table" className="flex items-center gap-2">
                    Table
                    <span
                      className={`hover:text-blue-500 cursor-pointer ${isRefreshingTable ? 'animate-spin' : ''}`}
                      onClick={() => {
                        if (includedPapers.length === 0) {
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Please select at least one paper before regenerating the table"
                          });
                          return;
                        }
                        setIsRefreshingTable(true)

                        // generateTableFromPapers(includedPapers.length, includedPapers, personas).then((res) => {
                        //   setLRTableData(res.data)
                        //   // console.log(res.data)
                        // }).catch((error) => {
                        //   console.error(error)
                        // }).finally(() => {
                        //   setIsRefreshingTable(false)
                        // })

                        const filteredChatMessages = chatMessages.filter((msg: ChatMessage) => typeof msg.message === 'string');
                        generateTableFromDialogueHistory(filteredChatMessages, personas).then((res) => {
                          setTableOfContents(res.data)
                          // console.log(res.data)
                        }).catch((error) => {
                          console.error(error)
                        }).finally(() => {
                          setIsRefreshingTable(false)
                        })
                      }}
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="graph" className="flex-grow">
                  <div className="h-full w-full">
                    {isRefreshingGraph ? (
                      <div className="flex items-center justify-center w-[550px] h-[300px]">
                        <div className="text-center flex flex-col items-center">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <p>Loading graph...</p>
                        </div>
                      </div>
                    ) : (
                      <ForceGraph2D
                        graphData={graphData}
                        nodeLabel="name"
                        nodeAutoColorBy="name"
                        linkDirectionalParticles={2}
                        width={550}
                        height={300}
                        backgroundColor="#F0F0F0"
                      />
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="table" className="flex-grow">
                  <LRTable axis="persona" />
                </TabsContent>
              </Tabs>
            </CollapsibleContent>
          </Collapsible>
        )} */}

        {/* Chat Panel */}
        <Collapsible className="border-t py-4" open={isChatCollapsibleOpen} onOpenChange={setIsChatCollapsibleOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-gray-100">
            <h3 className="text-lg font-semibold">Chat</h3>
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isChatCollapsibleOpen ? 'rotate-90' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ChatPanel />
          </CollapsibleContent>
        </Collapsible>



        {/* Traits Dialog */}
        <Dialog open={isTraitsDialogOpen} onOpenChange={setIsTraitsDialogOpen}>
          <DialogContent>
            <DialogHeader className="space-y-2">
              <DialogTitle>Traits</DialogTitle>
              <DialogDescription>
                Edit the traits of the selected persona.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 border-t border-b border-muted">
              <ScrollArea className="max-h-128 my-4 pb-4 px-4 rounded-md border bg-card">
                    {getSelectedPersona() && renderTraits(getSelectedPersona()!.personaDescription)}
              </ScrollArea>
              <div className="flex flex-col flex-grow my-4 p-4 rounded-md border bg-card">
                <ChatTraitEditor onClose={() => {}} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>}
      <div className="flex">
        <ModeToggle />
      </div>
    </div>
  )
}