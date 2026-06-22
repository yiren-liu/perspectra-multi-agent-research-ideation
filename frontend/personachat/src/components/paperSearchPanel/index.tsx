import { useMemo, useState } from 'react'
import { Search, Plus, Minus, X } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatStore } from '@/stores/chatStore'
import { useApi } from '@/controller/API'
import { useTaskProgress } from '@/hooks/use-task-progress'
import { toast } from '@/hooks/use-toast'
import { Persona, Paper } from '@/types'
import PaperList from './components/paperList'


export default function PaperSearchPanel() {
  const getRandomDummyAvatarUrlList = useMemo(() => {
    let indexList = [1, 2, 3, 4, 5];
    indexList.sort(() => Math.random() - 0.5);
    return indexList.map(index => `https://ui.shadcn.com/avatars/0${index}.png`);
  }, []);

  const { 
    searchResults, setSearchResults, isSearching, setIsSearching, searchProgress, setSearchProgress, 
    includedPapers, setIncludedPapers, selectedPaper, setSelectedPaper, isSearchDialogOpen, setIsSearchDialogOpen,
    personas, setPersonas, isRefreshingGraph, setIsRefreshingGraph,
    searchQuery, setSearchQuery, setLastSubmittedSearchQuery
  } = useChatStore();

  const { getDemoPapers, getDemoPersonas, getPersonaKG, searchPapersFromTopic, generatePersonasFromPapersTopic } = useApi();
  const { addPapersWithProgress } = useTaskProgress();

  const handleSearch = async () => {
    setIsSearching(true)
    setSearchProgress(0)
    setSearchResults([])
    setLastSubmittedSearchQuery(searchQuery)

    const updateProgress = async () => {
      for (let i = 0; i <= 100; i += 10) {
        setSearchProgress(i)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const fetchPapers = async () => {
      if (searchQuery === "LLM for creative writing") {
        const res = await getDemoPapers()
        setSearchResults(res.data)
      } else {
        try {
          const res = await searchPapersFromTopic(searchQuery)
          setSearchResults(res.data.papers)
        } catch (error) {
          // Handle error if needed
        }
      }
    }

    await Promise.all([fetchPapers()])
    setIsSearching(false)
  }

  const handleIncludePaper = (paper: Paper) => {
    setIncludedPapers([...includedPapers, paper])
    setSearchResults(searchResults.filter(
      p => p.id !== paper.id
    ))
    
    // Call the addPapersWithProgress function to add the paper to RAG with progress tracking
    addPapersWithProgress([paper], `Adding paper: ${paper.title.substring(0, 30)}...`);
  }

  const handleIncludeAllPapers = () => {
    // Add all search results to included papers
    const newIncludedPapers = [...includedPapers, ...searchResults];
    setIncludedPapers(newIncludedPapers);
    setSearchResults([]);
    
    // Add all papers to RAG with progress tracking
    addPapersWithProgress(searchResults, `Adding ${searchResults.length} papers to knowledge base`);
  }

  const handleRemovePaper = (paper: Paper) => {
    setIncludedPapers(includedPapers.filter(
      p => p.id !== paper.id
    ))
    setSearchResults([...searchResults, paper])
  }

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Scholarly Paper Search</h1>

      <div className="flex space-x-2 mb-4">
        <Input
          type="text"
          placeholder="Search for papers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow"
        />
        <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { handleSearch(); setIsSearchDialogOpen(true); }} disabled={isSearching}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Search Results</DialogTitle>
              <DialogDescription>
                Click on a paper to view details or add it to your selection.
              </DialogDescription>
            </DialogHeader>
            {isSearching ? (
              <div className="space-y-2 mt-4">
                <Progress value={searchProgress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">Searching for papers...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-end my-2">
                  <Button 
                    size="sm" 
                    onClick={handleIncludeAllPapers}
                    disabled={searchResults.length === 0}
                  >
                    Add All Papers
                  </Button>
                </div>
                <ScrollArea className="h-[60vh] mt-4">
                  <ul className="space-y-2">
                    {searchResults.map((paper) => (
                      <li key={paper.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent">
                        <div>
                          <h3 className="font-medium">{paper.title}</h3>
                          <p className="text-sm text-muted-foreground">{paper.authors && paper.authors.join(', ')} ({paper.year})</p>
                        </div>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">View</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="pr-4">{paper.title}</DialogTitle>
                                <DialogDescription>
                                  {paper.authors && paper.authors.join(', ')} ({paper.year})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="mt-4">
                                <h4 className="font-semibold mb-2">Abstract</h4>
                                <p className="text-sm">{paper.abstract}</p>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button size="sm" onClick={() => handleIncludePaper(paper)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setSearchQuery("LLM for creative writing")}
          >
            LLM for creative writing
          </Button>
          <Button
            variant="outline"
            size="sm" 
            onClick={() => setSearchQuery("AI agents for scientific research")}
          >
            AI agents for scientific research
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("Knowledge graphs in education")}
          >
            Knowledge graphs in education
          </Button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Paper Knowledge Base</h2>
      <div className="flex-grow overflow-auto">
        {includedPapers.length === 0 ? (
          <p className="text-muted-foreground">No papers included yet. Use the search to find and add papers.</p>
        ) : (
          <PaperList />
        )}
      </div>
    </div>
  )
}