import { useRef, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { MessageSquare, Lightbulb, X, Save, FileText, Download, BookmarkPlus, Copy, RefreshCw } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chatStore";
import { useApi } from '@/controller/API';
import { ChatMessage, ChatMessageChunkStreaming, ForumThreadChunkStreaming, ForumThreadTopic, Persona, BaselineResearchProposal, Citation, ChatMessageChunkStreamingWithCitation } from '@/types';
import { parseConceptString } from '@/lib/utils';
import { useUserStudyLogger } from '@/utils/userStudyLogger';

// Example proposal data for development mode
const exampleProposal = {
  motivation: "Climate change and increasing extreme weather events pose significant threats to agriculture and food security worldwide. There's an urgent need to develop more resilient crop varieties that can withstand environmental stresses while maintaining productivity.",
  pastResearch: "Previous research has focused on conventional breeding techniques and single-gene genetic modifications. CRISPR/Cas9 technology has been used to modify drought and salt tolerance in some crops, but mainly through individual gene modifications. Multi-gene approaches remain challenging but promising.",
  method: "We propose using advanced CRISPR/Cas systems for simultaneous editing of multiple stress-responsive gene networks in staple crops. By targeting transcription factors that regulate stress response pathways, we can potentially improve resilience against multiple stressors simultaneously. We'll combine this with high-throughput phenotyping to rapidly assess performance under various stress conditions.",
  findings: "We hypothesize that crops with optimized stress-response pathways will show 30-50% greater yield stability under drought, heat stress, and flooding compared to conventional varieties. Secondary benefits may include enhanced nutrient use efficiency and reduced pesticide requirements due to improved general plant health.",
  notes: ""
};

// Add mock citation data for demonstration purposes
const mockCitations: Citation[] = [
  {
    paper_id: "1c7402843d8b586d945b3b030e3edd93f0ae3959",
    title: "On the Creativity of Large Language Models",
    abstract: "Large Language Models (LLMs) are revolutionizing several areas of Artificial Intelligence. One of the most remarkable applications is creative writing, e.g., poetry or storytelling: the generated outputs are often of astonishing quality. However, a natural question arises: can LLMs be really considered creative? In this article, we first analyze the development of LLMs under the lens of creativity theories, investigating the key open questions and challenges. In particular, we focus our discussion on the dimensions of value, novelty, and surprise as proposed by Margaret Boden in her work. Then, we consider different classic perspectives, namely product, process, press, and person. We discuss a set of \"easy\" and \"hard\" problems in machine creativity, presenting them in relation to LLMs. Finally, we examine the societal impact of these technologies with a particular focus on the creative industries, analyzing the opportunities offered, the challenges arising from them, and the potential associated risks, from both legal and ethical points of view.",
    authors: ["Giorgio Franceschelli", "Mirco Musolesi"],
    year: 2023,
    url: "https://www.semanticscholar.org/paper/1c7402843d8b586d945b3b030e3edd93f0ae3959"
  },
  {
    paper_id: "7b1a6db0909856a345f055a9607f43711b3df375",
    title: "Art or Artifice? Large Language Models and the False Promise of Creativity",
    abstract: "Researchers have argued that large language models (LLMs) exhibit high-quality writing capabilities from blogs to stories. However, evaluating objectively the creativity of a piece of writing is challenging. Inspired by the Torrance Test of Creative Thinking (TTCT), which measures creativity as a process, we use the Consensual Assessment Technique and propose Torrance Test of Creative Writing (TTCW) to evaluate creativity as product. TTCW consists of 14 binary tests organized into the original dimensions of Fluency, Flexibility, Originality, and Elaboration. We recruit 10 creative writers and implement a human assessment of 48 stories written either by professional authors or LLMs using TTCW. Our analysis shows that LLM-generated stories pass 3-10X less TTCW tests than stories written by professionals. In addition, we explore the use of LLMs as assessors to automate the TTCW evaluation, revealing that none of the LLMs positively correlate with the expert assessments.",
    authors: ["Tuhin Chakrabarty", "Philippe Laban", "Divyansh Agarwal", "S. Muresan", "Chien-Sheng Wu"],
    year: 2023,
    url: "https://www.semanticscholar.org/paper/7b1a6db0909856a345f055a9607f43711b3df375"
  },
  {
    paper_id: "f02c487572472dd20d064f0755b85b7e1aacf86f",
    title: "Unmet Creativity Support Needs in Computationally Supported Creative Writing",
    abstract: "Large language models (LLMs) enabled by the datasets and computing power of the last decade have recently gained popularity for their capacity to generate plausible natural language text from human-provided prompts. This ability makes them appealing to fiction writers as prospective co-creative agents, addressing the common challenge of writer's block, or getting unstuck. However, creative writers face additional challenges, including maintaining narrative consistency, developing plot structure, architecting reader experience, and refining their expressive intent, which are not well-addressed by current LLM-backed tools. In this paper, we define these needs by grounding them in cognitive and theoretical literature, then survey previous computational narrative research that holds promise for supporting each of them in a co-creative setting.",
    authors: ["Max Kreminski", "Chris Martens"],
    year: 2022,
    url: "https://www.semanticscholar.org/paper/f02c487572472dd20d064f0755b85b7e1aacf86f"
  }
];

// Notes component for baseline group chat
function BaselineProposalNotes({ 
  proposal, 
  onAddNote,
  isExpanded = true,
  forceVisible = false,
  activeTabOverride,
  notesUpdateTrigger = 0,
  onTabChange,
  onExpand,
  onVisibilityChange,
  logger
}: { 
  proposal: BaselineResearchProposal, 
  onAddNote?: (updatedProposal: BaselineResearchProposal) => void,
  isExpanded?: boolean,
  forceVisible?: boolean,
  activeTabOverride?: 'motivation' | 'pastResearch' | 'method' | 'findings' | 'notes',
  notesUpdateTrigger?: number,
  onTabChange?: (tab: 'motivation' | 'pastResearch' | 'method' | 'findings' | 'notes') => void,
  onExpand?: (isExpanded: boolean) => void,
  onVisibilityChange?: (isVisible: boolean) => void,
  logger?: ReturnType<typeof useUserStudyLogger>
}) {
  const [isNoteVisible, setIsNoteVisible] = useState(forceVisible);
  const [isExpandedNote, setIsExpandedNote] = useState(isExpanded);
  const [activeTab, setActiveTab] = useState<'motivation' | 'pastResearch' | 'method' | 'findings' | 'notes'>(
    activeTabOverride || 'motivation'
  );
  const [editedProposal, setEditedProposal] = useState<BaselineResearchProposal>({
    ...proposal,
    notes: proposal.notes || '' // Ensure notes is initialized
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Create refs for each textarea
  const motivationRef = useRef<HTMLTextAreaElement>(null);
  const pastResearchRef = useRef<HTMLTextAreaElement>(null);
  const methodRef = useRef<HTMLTextAreaElement>(null);
  const findingsRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  
  // Update when forceVisible changes
  useEffect(() => {
    if (forceVisible) {
      setIsNoteVisible(true);
    }
  }, [forceVisible]);
  
  // Update when isExpanded changes
  useEffect(() => {
    setIsExpandedNote(isExpanded);
  }, [isExpanded]);
  
  // Update when activeTabOverride changes
  useEffect(() => {
    if (activeTabOverride) {
      setActiveTab(activeTabOverride);
    }
  }, [activeTabOverride]);
  
  // Respond to notesUpdateTrigger changes
  useEffect(() => {
    // This effect runs when notesUpdateTrigger changes
    // It's a way to force the component to re-read the proposal data
    if (notesUpdateTrigger > 0) {
      setIsNoteVisible(true);
      setIsExpandedNote(true);
      setActiveTab('notes');
    }
  }, [notesUpdateTrigger]);
  
  // Update edited proposal when original proposal changes
  useEffect(() => {
    setEditedProposal({
      ...proposal,
      notes: proposal.notes || '' // Ensure notes is initialized
    });
  }, [proposal]);
  
  // Scroll to bottom of textarea when active tab changes
  useEffect(() => {
    const scrollToBottom = () => {
      let activeTextarea: HTMLTextAreaElement | null = null;
      
      switch (activeTab) {
        case 'motivation':
          activeTextarea = motivationRef.current;
          break;
        case 'pastResearch':
          activeTextarea = pastResearchRef.current;
          break;
        case 'method':
          activeTextarea = methodRef.current;
          break;
        case 'findings':
          activeTextarea = findingsRef.current;
          break;
        case 'notes':
          activeTextarea = notesRef.current;
          break;
      }
      
      if (activeTextarea) {
        setTimeout(() => {
          activeTextarea!.scrollTop = activeTextarea!.scrollHeight;
        }, 100);
      }
    };
    
    scrollToBottom();
  }, [activeTab]);
  
  // Handle changes to proposal fields
  const handleProposalChange = (field: keyof BaselineResearchProposal, value: string) => {
    // Skip if value hasn't changed to avoid unnecessary rerenders
    if (editedProposal[field] === value) return;
    
    const updated = {...editedProposal, [field]: value};
    setEditedProposal(updated);
    
    // Call onAddNote directly when changes are made
    if (onAddNote) {
      onAddNote(updated);
    }
    
    // Scroll to bottom if content was added
    if (value.length > editedProposal[field]?.length) {
      setTimeout(() => {
        let activeTextarea: HTMLTextAreaElement | null = null;
        switch (field) {
          case 'motivation':
            activeTextarea = motivationRef.current;
            break;
          case 'pastResearch':
            activeTextarea = pastResearchRef.current;
            break;
          case 'method':
            activeTextarea = methodRef.current;
            break;
          case 'findings':
            activeTextarea = findingsRef.current;
            break;
          case 'notes':
            activeTextarea = notesRef.current;
            break;
        }
        
        if (activeTextarea) {
          activeTextarea.scrollTop = activeTextarea.scrollHeight;
        }
      }, 10);
    }
  };

  // Add a note to the notes section
  const addNote = (noteText: string) => {
    const formattedNote = noteText;
    const updatedNotes = editedProposal.notes 
      ? `${editedProposal.notes}\n\n${formattedNote}` 
      : formattedNote;
    
    handleProposalChange('notes', updatedNotes);
    // Focus on the notes tab
    setActiveTab('notes');
    if (onTabChange) onTabChange('notes');
    // Make sure the notes panel is visible and expanded
    setIsNoteVisible(true);
    if (onVisibilityChange) onVisibilityChange(true);
    setIsExpandedNote(true);
    if (onExpand) onExpand(true);
  };
  
  // Export notes as HTML
  const exportAsHtml = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Proposal Notes</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    h2 { color: #444; margin-top: 30px; }
    p { margin-bottom: 15px; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Research Proposal Notes</h1>
  
  <h2>Motivation</h2>
  <div class="content">${editedProposal.motivation || 'No content'}</div>
  
  <h2>Past Research</h2>
  <div class="content">${editedProposal.pastResearch || 'No content'}</div>
  
  <h2>Method</h2>
  <div class="content">${editedProposal.method || 'No content'}</div>
  
  <h2>Hypothetical Findings</h2>
  <div class="content">${editedProposal.findings || 'No content'}</div>
  
  <h2>Additional Notes</h2>
  <div class="content">${editedProposal.notes || 'No content'}</div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_proposal_notes.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Log notes export
    if (logger) {
      // Log as feature usage to track more details about notes exports
      logger.logFeatureUsage('notes-export', 'html', {
        motivation_length: editedProposal.motivation.length,
        pastResearch_length: editedProposal.pastResearch.length,
        method_length: editedProposal.method.length,
        findings_length: editedProposal.findings.length,
        notes_length: editedProposal.notes?.length || 0,
        total_content_length: htmlContent.length,
        has_motivation: editedProposal.motivation.trim().length > 0,
        has_pastResearch: editedProposal.pastResearch.trim().length > 0,
        has_method: editedProposal.method.trim().length > 0,
        has_findings: editedProposal.findings.trim().length > 0,
        has_notes: (editedProposal.notes?.trim().length || 0) > 0,
        filename: 'research_proposal_notes.html'
      });
    }
  };
  
  // Add function to save notes with visual feedback
  const saveNotes = () => {
    if (onAddNote) {
      setSaveStatus('saving');
      
      // Call onAddNote with current edits
      onAddNote(editedProposal);
      
      // Log save action
      if (logger) {
        logger.logFeatureUsage('proposal_notes', 'saved_changes', {
          proposal_content: editedProposal,
          activeTab: activeTab
        });
      }
      
      // Show saved status briefly
      setTimeout(() => {
        setSaveStatus('saved');
        
        // Reset back to idle after a delay
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
    }
  };
  
  // If notes are not visible, show just the button
  if (!isNoteVisible) {
    return (
      <Button
        className="fixed bottom-4 right-4 bg-primary text-white rounded-full shadow-lg hover:shadow-xl z-50"
        onClick={() => {
          setIsNoteVisible(true);
          if (onVisibilityChange) onVisibilityChange(true);
        }}
      >
        <FileText size={20} />
      </Button>
    );
  }
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 transition-all duration-500 ease-in-out",
      isExpandedNote 
        ? "w-[600px] h-[550px]" 
        : "w-[50px] h-[50px]"
    )}>
      <Card className={cn(
        "shadow-xl border border-gray-200 overflow-hidden transition-all duration-500 ease-in-out",
        isExpandedNote 
          ? "opacity-100 w-full h-full" 
          : "opacity-95 w-[50px] h-[50px]"
      )}>
        <CardHeader className={cn(
          "flex flex-row items-center space-y-0 gap-2",
          isExpandedNote ? "px-4 pt-4 pb-0" : "p-2"
        )}>
          {isExpandedNote && (
            <>
              <CardTitle className="text-sm flex-1">
                Research Proposal Notes
              </CardTitle>
              
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={exportAsHtml}
                  className="h-8 w-8"
                  title="Export as HTML"
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={saveNotes}
                  className="h-8 w-8"
                  title={saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Notes'}
                  disabled={saveStatus !== 'idle'}
                >
                  {saveStatus === 'saving' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : saveStatus === 'saved' ? (
                    <div className="relative">
                      <Save className="h-4 w-4" />
                      <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsExpandedNote(false);
                    if (onExpand) onExpand(false);
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          
          {!isExpandedNote && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsExpandedNote(true);
                if (onExpand) onExpand(true);
              }}
              className="h-8 w-8 mx-auto"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        
        {isExpandedNote && (
          <CardContent className={cn(
            "p-3 transition-all duration-500 ease-in-out",
            isExpandedNote ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <Tabs value={activeTab} onValueChange={(value) => {
              const tab = value as 'motivation' | 'pastResearch' | 'method' | 'findings' | 'notes';
              setActiveTab(tab);
              if (onTabChange) onTabChange(tab);
            }}>
              <TabsList className="grid grid-cols-5 mb-2">
                <TabsTrigger value="motivation" className="text-xs">Motivation</TabsTrigger>
                <TabsTrigger value="pastResearch" className="text-xs">Past Research</TabsTrigger>
                <TabsTrigger value="method" className="text-xs">Method</TabsTrigger>
                <TabsTrigger value="findings" className="text-xs">Findings</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="motivation" className="mt-0">
                <Textarea
                  ref={motivationRef}
                  value={editedProposal.motivation}
                  onChange={(e) => handleProposalChange('motivation', e.target.value)}
                  placeholder="What motivates this research project?"
                  className="min-h-[400px] text-sm"
                />
              </TabsContent>
              
              <TabsContent value="pastResearch" className="mt-0">
                <Textarea
                  ref={pastResearchRef}
                  value={editedProposal.pastResearch}
                  onChange={(e) => handleProposalChange('pastResearch', e.target.value)}
                  placeholder="What related work exists in this area?"
                  className="min-h-[400px] text-sm"
                />
              </TabsContent>
              
              <TabsContent value="method" className="mt-0">
                <Textarea
                  ref={methodRef}
                  value={editedProposal.method}
                  onChange={(e) => handleProposalChange('method', e.target.value)}
                  placeholder="What methods do you propose to use?"
                  className="min-h-[400px] text-sm"
                />
              </TabsContent>
              
              <TabsContent value="findings" className="mt-0">
                <Textarea
                  ref={findingsRef}
                  value={editedProposal.findings}
                  onChange={(e) => handleProposalChange('findings', e.target.value)}
                  placeholder="What are the potential outcomes of this research?"
                  className="min-h-[400px] text-sm"
                />
              </TabsContent>
              
              <TabsContent value="notes" className="mt-0">
                <Textarea
                  ref={notesRef}
                  value={editedProposal.notes}
                  onChange={(e) => handleProposalChange('notes', e.target.value)}
                  placeholder="Additional notes about this project"
                  className="min-h-[400px] text-sm"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Function to truncate text with ellipsis if it exceeds max length
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Function to replace paper_id tags with clickable citations
const replacePaperIdWithCitation = (content: string, citations: Citation[]): JSX.Element => {
  const MAX_ABSTRACT_LENGTH = 400; // Maximum characters for abstract
  const citationNumbers = new Map<string, number>(); // Map to track citation numbers
  
  // First pass to assign numbers to citations in order of appearance
  content.split(/(<paper_id>.*?<\/paper_id>)/g).forEach(part => {
    const match = part.match(/<paper_id>(.*?)<\/paper_id>/);
    if (match) {
      const paperId = match[1];
      if (!citationNumbers.has(paperId)) {
        citationNumbers.set(paperId, citationNumbers.size + 1);
      }
    }
  });
  
  return (
    <>
      {content.split(/(<paper_id>.*?<\/paper_id>)/g).map((part, index) => {
        const match = part.match(/<paper_id>(.*?)<\/paper_id>/);
        if (match) {
          const paperId = match[1];
          const citation = citations?.find(c => c.paper_id === paperId);
          const citationNumber = citationNumbers.get(paperId);
          if (citation) {
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <span 
                    className="text-blue-500 cursor-pointer"
                    onClick={() => {
                      window.open(citation.url, '_blank');
                    }}
                  >
                    [{citationNumber}]
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-2 max-w-96">
                    <p><strong>Title:</strong> {citation.title}</p>
                    <p><strong>Authors:</strong> {citation.authors.join(', ')}</p>
                    <p><strong>Year:</strong> {citation.year}</p>
                    <p><strong>Abstract:</strong> {truncateText(citation.abstract, MAX_ABSTRACT_LENGTH)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }
          return <span key={index}>[{citationNumber || '?'}]</span>;
        }
        return part;
      })}
    </>
  );
};

export default function BaselineGroupChat() {
  const { 
    personas, chatMessages, currentMessage, 
    setCurrentMessage, addChatMessage, clearChatMessages, 
    getPersonaById, getUserPersona, addPersonas, setPersonas,
    baselineResearchProposal, setBaselineResearchProposal,
    chatCitations, setChatCitations, addChatCitations, clearChatCitations
  } = useChatStore();
  
  const { chatWithExperts, terminateCurrentChat, runForumThreadSimulation, generatePersonasFromBaselineProposal } = useApi();
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize the user study logger
  const logger = useUserStudyLogger();

  // State for initial proposal form
  const [hasSubmittedProposal, setHasSubmittedProposal] = useState(false);
  const [isChatRunning, setIsChatRunning] = useState(false);
  const [isGeneratingThreads, setIsGeneratingThreads] = useState(false);
  const [ideaInputs, setIdeaInputs] = useState({
    motivation: baselineResearchProposal?.motivation || '',
    pastResearch: baselineResearchProposal?.pastResearch || '',
    method: baselineResearchProposal?.method || '',
    findings: baselineResearchProposal?.findings || '',
    notes: baselineResearchProposal?.notes || ''
  });
  const [initIdeaError, setInitIdeaError] = useState('');
  
  // Text selection state for note-taking
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPos, setSelectionPos] = useState<{x: number, y: number} | null>(null);
  const selectionPopupRef = useRef<HTMLDivElement>(null);
  
  // Notes panel state
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);
  const [activeNotesTab, setActiveNotesTab] = useState<'motivation' | 'pastResearch' | 'method' | 'findings' | 'notes'>('notes');
  const [notesUpdateTrigger, setNotesUpdateTrigger] = useState(0);

  
  // Check if in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Function to populate example proposal data
  const populateExampleProposal = () => {
    setIdeaInputs(exampleProposal);
    setInitIdeaError('');
  };

  // Check if we already have a stored proposal
  useEffect(() => {
    if (baselineResearchProposal) {
      setIdeaInputs({
        motivation: baselineResearchProposal.motivation,
        pastResearch: baselineResearchProposal.pastResearch,
        method: baselineResearchProposal.method,
        findings: baselineResearchProposal.findings,
        notes: baselineResearchProposal.notes || ''
      });
      // If we have chat messages, we can assume we've already submitted a proposal
      if (chatMessages.length > 0) {
        setHasSubmittedProposal(true);
      }
    }
  }, [baselineResearchProposal, chatMessages.length]);

  useEffect(() => {
    // Log page view when component loads
    logger.logPageView('baseline-group-chat', {
      has_proposal: !!baselineResearchProposal,
      message_count: chatMessages.length
    });
  }, []);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  // Handle text selection for note-taking
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const selectedTextContent = selection.toString();
      setSelectedText(selectedTextContent);
      
      // Position directly below the selection with a small offset
      setSelectionPos({
        x: rect.left + (rect.width / 2),
        y: rect.bottom + 5 // Add a small offset from the selection
      });
      
      // Log text selection
      if (selectedTextContent.length > 5) { // Only log meaningful selections
        logger.logInteraction('select', 'text-selection', {
          selection_length: selectedTextContent.length
        });
      }
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
  
  // Add selected text to notes
  const addToNotes = () => {
    if (!selectedText || !baselineResearchProposal) return;
    
    // Get author from the closest message
    const msgElement = window.getSelection()?.anchorNode?.parentElement;
    let author = 'unknown';
    
    // Try to determine the message author
    if (msgElement) {
      const authorElement = msgElement.closest('[data-author]');
      if (authorElement) {
        author = authorElement.getAttribute('data-author') || 'unknown';
      }
    }
    
    // Format the note with attribution
    const formattedNote = `"${selectedText}" - from ${author}`;
    
    // Get current notes or create empty string
    const currentNotes = baselineResearchProposal.notes || '';
    
    // Append to notes
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n${formattedNote}` 
      : formattedNote;
    
    // Create updated proposal with new notes
    const updatedProposal: BaselineResearchProposal = {
      ...baselineResearchProposal,
      notes: updatedNotes
    };
    
    // Update the store with the complete proposal including notes
    setBaselineResearchProposal(updatedProposal);
    
    // Update notes panel state to ensure it's visible and on the right tab
    setIsNotesVisible(true);
    setIsNotesExpanded(true);
    setActiveNotesTab('notes');
    
    // Force refresh of the notes panel
    setNotesUpdateTrigger(prev => prev + 1);
    
    // Log adding note from selection
    logger.logInteraction('click', 'add-selection-to-notes', {
      selection_length: selectedText.length,
      author: author,
      note_length: formattedNote.length
    });
    
    // Close the popup
    setSelectionPos(null);
  };
  
  // Track updates to notes
  const handleNotesUpdate = (updatedProposal: BaselineResearchProposal) => {
    // Update the store with the complete proposal
    setBaselineResearchProposal(updatedProposal);
    
    // Log note update
    // logger.logFeatureUsage('notes-update', 'edit', {
    //   motivation_length: updatedProposal.motivation.length,
    //   pastResearch_length: updatedProposal.pastResearch.length,
    //   method_length: updatedProposal.method.length,
    //   findings_length: updatedProposal.findings.length,
    //   notes_length: updatedProposal.notes?.length || 0
    // });
  };

  // Handler for formatting messages
  const sanitizeAndFormatMessage = (message: string) => {
    let sanitizedMessage = message.replace(/&nbsp;|TERMINATE$/g, '').trim();
    return sanitizedMessage;
  };

  // Handler for chat message chunks from API call
  const handleNewIncomingMessage = (chunk: ChatMessageChunkStreamingWithCitation) => {
    const message: ChatMessage = {
      sender_name: chunk.chat_message.source,
      sender_avatar: getPersonaById(chunk.chat_message.source)?.avatar || '',
      message: chunk.chat_message.content,
    };
    if (message.sender_name === 'user') { return; }
    addChatMessage(message);
    // also update citations
    addChatCitations(chunk.citations);
    
    // Log agent response
    logger.logInteraction('receive', 'agent-message', {
      agent_name: message.sender_name,
      message_length: message.message.length,
      total_messages: chatMessages.length + 1,
      message_position: chatMessages.length,
      message_content: message.message
    });
  };

  // Handler for forum thread chunks from API call
  const handleIncomingMessage = (chunk: ForumThreadChunkStreaming) => {
    if (chunk.type === "AGENT_MESSAGE") {
      if (chunk.body["message"]?.["source"] !== "user") {
        const agentName = chunk.body["message"]["source"];
        const content = chunk.body["message"]["content"];
        
        const message: ChatMessage = {
          sender_name: agentName,
          sender_avatar: getPersonaById(agentName)?.avatar || '',
          message: content
        };
        addChatMessage(message);
      }
    } else if (chunk.type === "NEW_PERSONAS") {
      // Update the personas
      addPersonas(chunk.body["personas"]);
    } else if (chunk.type === "PROGRESS_UPDATE") {
      // Could add UI feedback here based on the status
    } else if (chunk.type === "TERMINATE") {
      setIsChatRunning(false);
      setIsGeneratingThreads(false);
    }
  };

  // Handler for error messages
  const handleError = (type: string, error: any) => {
    console.error(`Error in forum thread simulation: ${type}`, error);
    setIsGeneratingThreads(false);
    setIsChatRunning(false);
    setInitIdeaError("An error occurred while generating the discussion. Please try again.");
  };

  // Handler for sending messages
  const handleSendMessage = () => {
    if (currentMessage.trim() === '') { return; }
    if (isChatRunning) { 
      handleStopChat();
      setTimeout(() => {}, 1000);
    }
    setIsChatRunning(true);
    const messageSent: ChatMessage = {
      sender_name: 'user',
      sender_avatar: '',
      message: currentMessage
    };
    addChatMessage(messageSent);
    
    // Log sending message
    logger.logInteraction('send', 'chat-message', {
      message_length: currentMessage.length,
      is_first_message: chatMessages.length === 0,
      total_messages: chatMessages.length + 1,
      message_content: currentMessage
    });
    
    chatWithExperts(currentMessage, personas, handleNewIncomingMessage, handleChatFinished, handleChatFinished);
    setCurrentMessage('');
  };

  // Handler for stopping chat
  const handleStopChat = () => {
    terminateCurrentChat();
    setIsChatRunning(false);
    
    // Log stopping chat
    logger.logInteraction('click', 'stop-chat', {
      message_count: chatMessages.length,
      was_running: isChatRunning
    });
  };

  // Handler for chat finished
  const handleChatFinished = () => {
    setIsChatRunning(false);
    
    // Log chat session ended
    logger.logFeatureUsage('chat-session', 'end', {
      message_count: chatMessages.length,
      participant_count: personas.length
    });
  };

  // Handler for initializing the thread with proposal
  const handleInitializeThreads = () => {
    // Validate inputs
    if (!ideaInputs.motivation.trim() && !ideaInputs.pastResearch.trim() && 
        !ideaInputs.method.trim() && !ideaInputs.findings.trim()) {
      setInitIdeaError("Please fill at least one field to generate threads.");
      return;
    }
    
    setIsGeneratingThreads(true);
    setInitIdeaError("");
    
    // Log start of thread generation
    logger.logFeatureUsage('persona-generation', 'start', {
      motivation: ideaInputs.motivation,
      pastResearch: ideaInputs.pastResearch,
      method: ideaInputs.method,
      findings: ideaInputs.findings
    });
    
    const startTime = Date.now();
    
    // Save the proposal to the store
    setBaselineResearchProposal({
      motivation: ideaInputs.motivation,
      pastResearch: ideaInputs.pastResearch,
      method: ideaInputs.method,
      findings: ideaInputs.findings,
      notes: ideaInputs.notes || ''
    });
    
    // Create the forum thread topic
    const newThreadTopic: ForumThreadTopic = {
      topic: "Research Discussion",
      topic_description: `
        Motivation: ${ideaInputs.motivation}
        
        Past Research: ${ideaInputs.pastResearch}
        
        Method: ${ideaInputs.method}
        
        Hypothetical Findings: ${ideaInputs.findings}
      `
    };
    
    // Start the forum thread simulation
    clearChatMessages();
    // also clear personas
    setPersonas([]);
    // runForumThreadSimulation(
    //   newThreadTopic, 
    //   handleIncomingMessage, 
    //   handleError,
    //   () => {
    //     setIsGeneratingThreads(false);
    //     setHasSubmittedProposal(true);
    //   }
    // );
    generatePersonasFromBaselineProposal(
      ideaInputs.motivation,
      ideaInputs.pastResearch
    ).then((res) => {
      setPersonas(res.data.personas);
      setIsGeneratingThreads(false);
      setHasSubmittedProposal(true);
      
      // Log completion of persona generation
      const endTime = Date.now();
      logger.logTimeSpent('persona-generation', endTime - startTime, {
        persona_count: res.data.personas.length,
        motivation_length: ideaInputs.motivation.length,
        pastResearch_length: ideaInputs.pastResearch.length
      });
      
      // Log successful proposal submission
      logger.logFeatureUsage('persona-generation', 'complete', {
        personas: res.data.personas
      });
    }).catch(error => {
      // Log error in persona generation
      logger.logFeatureUsage('persona-generation', 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
    });
  };

  // Handler for resetting the entire interface
  const handleReset = () => {
    // Log reset action
    logger.logInteraction('click', 'reset-interface', {
      message_count: chatMessages.length,
      persona_count: personas.length,
      had_proposal: !!baselineResearchProposal,
      was_chat_running: isChatRunning
    });
    
    // Clear chat messages
    clearChatMessages();
    
    // Clear personas
    setPersonas([]);
    
    // Clear research proposal
    setBaselineResearchProposal({
      motivation: '',
      pastResearch: '',
      method: '',
      findings: '',
      notes: ''
    });
    
    // Reset form inputs
    setIdeaInputs({
      motivation: '',
      pastResearch: '',
      method: '',
      findings: '',
      notes: ''
    });
    
    // Reset error state
    setInitIdeaError('');
    
    // Reset notes state
    setIsNotesVisible(false);
    setIsNotesExpanded(true);
    setActiveNotesTab('notes');
    setNotesUpdateTrigger(0);
    
    // Reset message state
    setCurrentMessage('');
    
    // Go back to proposal form
    setHasSubmittedProposal(false);
    
    // Stop any running processes
    if (isChatRunning) {
      terminateCurrentChat();
      setIsChatRunning(false);
    }
    setIsGeneratingThreads(false);
  };
  
  // Add logging for notes panel tab changes
  const handleNotesTabChange = (tab: 'motivation' | 'pastResearch' | 'method' | 'findings' | 'notes') => {
    setActiveNotesTab(tab);
    
    // Log tab change
    logger.logInteraction('click', 'notes-tab-change', {
      tab: tab,
      proposal_submitted: hasSubmittedProposal
    });
  };
  
  // Add logging for notes panel expansion toggle
  const handleNotesExpansionToggle = (isExpanded: boolean) => {
    setIsNotesExpanded(isExpanded);
    
    // Log expansion toggle
    logger.logInteraction('click', isExpanded ? 'expand-notes' : 'collapse-notes', {
      current_tab: activeNotesTab
    });
  };
  
  // Add logging for notes visibility toggle
  const handleNotesVisibilityToggle = (isVisible: boolean) => {
    setIsNotesVisible(isVisible);
    
    // Log visibility toggle
    logger.logInteraction('click', isVisible ? 'show-notes' : 'hide-notes', {});
  };

  return (
    <div className="container max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Group Chat</h1>
        
        <Button 
          variant="outline" 
          onClick={handleReset}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
      </div>
      
      {!hasSubmittedProposal ? (
        // Proposal input panel
        <div className="bg-white rounded-lg shadow-md p-6 min-w-[600px]">
          <h2 className="text-xl font-semibold mb-4">Enter Your Research Proposal</h2>
          
          {/* Development mode quick-fill button */}
          {isDevelopment && (
            <Button 
              variant="outline" 
              onClick={() => {
                populateExampleProposal();
                // Log quick fill action
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
                  Generating Discussion...
                </>
              ) : (
                "Start Discussion"
              )}
            </Button>
          </div>
        </div>
      ) : (
        // Chat interface
        <div className="bg-white rounded-lg shadow-md p-6 min-w-[600px]">
          <div className="flex items-center space-x-2 mb-4 px-2 py-1 bg-muted rounded-lg overflow-x-auto">
            <span className="text-sm font-medium whitespace-nowrap">Discussion Group:</span>
            {personas.map((persona, index) => (
              <div 
                key={index} 
                className="relative group"
                title={persona.name}
                onClick={() => {
                  // Log persona click
                  logger.logInteraction('click', 'persona-avatar', {
                    persona_name: persona.name,
                    persona_index: index
                  });
                }}
              >
                <Avatar className="w-6 h-6 hover:ring-2 hover:ring-primary transition-all">
                  <AvatarImage src={persona.avatar} alt={persona.name} />
                  <AvatarFallback>{persona.name[0]}</AvatarFallback>
                </Avatar>
              </div>
            ))}
          </div>
          
          <div 
            ref={chatContainerRef} 
            className="h-[500px] overflow-y-auto mb-4 p-2 border rounded"
            onMouseUp={handleTextSelection}
          >
            {chatMessages.map((msg: ChatMessage, index: number) => {
              if (typeof msg.message !== 'string') {
                return null;
              }
              const sanitizedMessage = sanitizeAndFormatMessage(msg.message);
              
              return (
                <div key={index} 
                  className={`flex items-start space-x-2 mb-4 ${msg.sender_name === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-author={msg.sender_name}
                >
                  {msg.sender_name !== 'user' && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={msg.sender_avatar} alt={msg.sender_name} />
                      <AvatarFallback>{msg.sender_name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] ${msg.sender_name === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'} rounded-lg p-2`}>
                    <TooltipProvider>
                      {/* Check if message contains citation tags */}
                      {sanitizedMessage.includes('<paper_id>') ? (
                        replacePaperIdWithCitation(sanitizedMessage, chatCitations)
                      ) : (
                        <Markdown 
                          rehypePlugins={[rehypeRaw]} 
                          remarkPlugins={[remarkGfm]}
                          className="text-md prose prose-sm max-w-none"
                        >
                          {sanitizedMessage}
                        </Markdown>
                      )}
                    </TooltipProvider>
                  </div>
                  {msg.sender_name === 'user' && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={getUserPersona()?.avatar || ''} alt={getUserPersona()?.name || ''} />
                      <AvatarFallback>{getUserPersona()?.name[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
            {isChatRunning && <div className="flex items-center justify-center mb-4">
              <p className="text-sm font-medium">Chat is running...</p>
            </div>}
            {isGeneratingThreads && <div className="flex items-center justify-center mb-4">
              <p className="text-sm font-medium">Generating discussion...</p>
            </div>}
          </div>
          
          {/* Selection popup for notes */}
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
                  onClick={addToNotes}
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
                    // Log copy to clipboard
                    logger.logInteraction('click', 'copy-selection', {
                      selection_length: selectedText.length
                    });
                    setSelectionPos(null);
                  }}
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                  // Log enter key press to send
                  logger.logInteraction('keypress', 'enter-to-send', {
                    message_length: currentMessage.length
                  });
                }
              }}
            />
            <Button onClick={handleSendMessage}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send
            </Button>
            {isChatRunning && <Button variant="outline" onClick={handleStopChat}>
              Stop
            </Button>}
          </div>
        </div>
      )}
      
      {/* Note-taking component that appears after proposal is submitted */}
      {baselineResearchProposal && hasSubmittedProposal && (
        <BaselineProposalNotes 
          proposal={baselineResearchProposal}
          onAddNote={handleNotesUpdate}
          isExpanded={isNotesExpanded}
          forceVisible={isNotesVisible}
          activeTabOverride={activeNotesTab}
          notesUpdateTrigger={notesUpdateTrigger}
          onTabChange={handleNotesTabChange}
          onExpand={handleNotesExpansionToggle}
          onVisibilityChange={handleNotesVisibilityToggle}
          logger={logger}
        />
      )}
    </div>
  );
}
