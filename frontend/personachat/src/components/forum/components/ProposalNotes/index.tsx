import React, { useState, useEffect, useRef } from "react";
import { useAppStore, ProjectProposal } from "@/stores/appStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Save, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStudyLogger } from "@/utils/userStudyLogger";

export function ProposalNotes() {
  const {
    isProposalNoteVisible,
    setIsProposalNoteVisible,
    selectedProjectId,
    projectProposals,
    getProjectProposal,
    updateProjectProposal,
    getSelectedProject,
    isExpandedProposalNote,
    setIsExpandedProposalNote,
    activeProposalTab,
    setActiveProposalTab
  } = useAppStore();
  
  const logger = useUserStudyLogger();

  // Create refs for each textarea
  const motivationRef = useRef<HTMLTextAreaElement>(null);
  const relatedWorkRef = useRef<HTMLTextAreaElement>(null);
  const methodsRef = useRef<HTMLTextAreaElement>(null);
  const outcomesRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [originalProposal, setOriginalProposal] = useState<ProjectProposal>({
    motivation: '',
    relatedWork: '',
    methods: '',
    potentialOutcomes: '',
    notes: ''
  });
  const [editedProposal, setEditedProposal] = useState<ProjectProposal>({
    motivation: '',
    relatedWork: '',
    methods: '',
    potentialOutcomes: '',
    notes: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  const selectedProject = getSelectedProject();
  
  // Add a ref for the debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Scroll to bottom of textarea when active tab changes
  useEffect(() => {
    const scrollToBottom = () => {
      let activeTextarea: HTMLTextAreaElement | null = null;
      
      switch (activeProposalTab) {
        case 'motivation':
          activeTextarea = motivationRef.current;
          break;
        case 'relatedWork':
          activeTextarea = relatedWorkRef.current;
          break;
        case 'methods':
          activeTextarea = methodsRef.current;
          break;
        case 'outcomes':
          activeTextarea = outcomesRef.current;
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
  }, [activeProposalTab]);
  
  // Also scroll when proposal content changes
  useEffect(() => {
    let activeTextarea: HTMLTextAreaElement | null = null;
    
    switch (activeProposalTab) {
      case 'motivation':
        activeTextarea = motivationRef.current;
        break;
      case 'relatedWork':
        activeTextarea = relatedWorkRef.current;
        break;
      case 'methods':
        activeTextarea = methodsRef.current;
        break;
      case 'outcomes':
        activeTextarea = outcomesRef.current;
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
  }, [editedProposal, activeProposalTab]);
  
  useEffect(() => {
    if (selectedProjectId) {
      const proposal = getProjectProposal(selectedProjectId);
      if (proposal) {
        setOriginalProposal(proposal);
        setEditedProposal(proposal);
      } else {
        const emptyProposal = {
          motivation: '',
          relatedWork: '',
          methods: '',
          potentialOutcomes: '',
          notes: ''
        };
        setOriginalProposal(emptyProposal);
        setEditedProposal(emptyProposal);
      }
      setHasChanges(false);
    }
  }, [selectedProjectId, getProjectProposal, projectProposals]);

  const handleProposalChange = (field: keyof ProjectProposal, value: string) => {
    const updated = {...editedProposal, [field]: value};
    setEditedProposal(updated);
    
    // Check if there are any changes compared to the original
    const hasAnyChanges = Object.keys(updated).some(
      (key) => updated[key as keyof ProjectProposal] !== originalProposal[key as keyof ProjectProposal]
    );
    setHasChanges(hasAnyChanges);
    
    // For immediate feedback, scroll to bottom if content was added
    if (value.length > editedProposal[field]?.length) {
      setTimeout(() => {
        let activeTextarea: HTMLTextAreaElement | null = null;
        switch (field) {
          case 'motivation':
            activeTextarea = motivationRef.current;
            break;
          case 'relatedWork':
            activeTextarea = relatedWorkRef.current;
            break;
          case 'methods':
            activeTextarea = methodsRef.current;
            break;
          case 'potentialOutcomes':
            activeTextarea = outcomesRef.current;
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
    
    // Debounce logging of content changes
    const debounceLog = async () => {
      await logger.logFeatureUsage('proposal_notes', 'content_edited', {
        field,
        project_id: selectedProjectId,
        project_name: selectedProject?.name,
        proposal_content: value
      });
    };
    
    // Clear any existing timeout before setting a new one
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timeout and store the reference
    debounceTimerRef.current = setTimeout(() => {
      debounceLog();
      debounceTimerRef.current = null;
    }, 2000);
  };

  const handleVisibilityToggle = async () => {
    const newValue = !isProposalNoteVisible;
    setIsProposalNoteVisible(newValue);
    
    await logger.logInteraction(
      newValue ? 'open' : 'close', 
      'proposal_notes', 
      {
        project_id: selectedProjectId,
        project_name: selectedProject?.name
      }
    );
  };
  
  const handleExpandToggle = async () => {
    const newValue = !isExpandedProposalNote;
    setIsExpandedProposalNote(newValue);
    
    await logger.logInteraction(
      newValue ? 'expand' : 'collapse', 
      'proposal_notes', 
      {
        project_id: selectedProjectId,
        project_name: selectedProject?.name
      }
    );
  };

  if (!isProposalNoteVisible) {
    return (
      <Button
        className="fixed bottom-4 right-4 bg-primary text-white rounded-full shadow-lg hover:shadow-xl z-50"
        onClick={handleVisibilityToggle}
      >
        <FileText size={20} />
      </Button>
    );
  }

  const saveChanges = async () => {
    if (selectedProjectId) {
      updateProjectProposal(selectedProjectId, editedProposal);
      setOriginalProposal({...editedProposal});
      setHasChanges(false);
      
      await logger.logFeatureUsage('proposal_notes', 'saved_changes', {
        project_id: selectedProjectId,
        project_name: selectedProject?.name,
        fields_changed: Object.keys(editedProposal).filter(
          key => editedProposal[key as keyof ProjectProposal] !== originalProposal[key as keyof ProjectProposal]
        ),
        proposal_content: editedProposal
      });
    }
  };

  const exportAsHtml = async () => {
    const projectName = selectedProject?.name || 'Project';
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Project Notes</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    h2 { color: #444; margin-top: 30px; }
    p { margin-bottom: 15px; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${projectName} - Project Notes</h1>
  
  <h2>Motivation</h2>
  <div class="content">${editedProposal.motivation || 'No content'}</div>
  
  <h2>Related Work</h2>
  <div class="content">${editedProposal.relatedWork || 'No content'}</div>
  
  <h2>Methods</h2>
  <div class="content">${editedProposal.methods || 'No content'}</div>
  
  <h2>Potential Outcomes</h2>
  <div class="content">${editedProposal.potentialOutcomes || 'No content'}</div>
  
  <h2>Additional Notes</h2>
  <div class="content">${editedProposal.notes || 'No content'}</div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_notes.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    await logger.logFeatureUsage('proposal_notes', 'exported_html', {
      project_id: selectedProjectId,
      project_name: selectedProject?.name,
      filename: `${projectName.replace(/\s+/g, '_')}_notes.html`
    });
  };

  // Add a handler for user-initiated tab changes
  const handleTabChange = async (value: string) => {
    // Set the active tab
    setActiveProposalTab(value as any);
    
    // Log only when user clicks on a tab
    await logger.logInteraction('tab_change', 'proposal_notes', {
      tab: value,
      project_id: selectedProjectId,
      project_name: selectedProject?.name
    });
  };

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 transition-all duration-500 ease-in-out",
      isExpandedProposalNote 
        ? "w-[600px] h-[550px]" 
        : "w-[50px] h-[50px]"
    )}>
      <Card className={cn(
        "shadow-xl border border-gray-200 overflow-hidden transition-all duration-500 ease-in-out",
        isExpandedProposalNote 
          ? "opacity-100 w-full h-full" 
          : "opacity-95 w-[50px] h-[50px]"
      )}>
        <CardHeader className={cn(
          "flex flex-row items-center space-y-0 gap-2",
          isExpandedProposalNote ? "px-4 pt-4 pb-0" : "p-2"
        )}>
          {isExpandedProposalNote && (
            <>
              <CardTitle className="text-sm flex-1">
                Project Notes: {selectedProject?.name || 'Project'}
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
                
                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={saveChanges}
                    className="h-8 w-8"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExpandToggle}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          
          {!isExpandedProposalNote && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExpandToggle}
              className="h-8 w-8 mx-auto"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        
        {isExpandedProposalNote && (
          <CardContent className={cn(
            "p-3 transition-all duration-500 ease-in-out",
            isExpandedProposalNote ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <Tabs value={activeProposalTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-5 mb-2">
                <TabsTrigger value="motivation" className="text-xs">Motivation</TabsTrigger>
                <TabsTrigger value="relatedWork" className="text-xs">Related Work</TabsTrigger>
                <TabsTrigger value="methods" className="text-xs">Methods</TabsTrigger>
                <TabsTrigger value="outcomes" className="text-xs">Outcomes</TabsTrigger>
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
              
              <TabsContent value="relatedWork" className="mt-0">
                <Textarea
                  ref={relatedWorkRef}
                  value={editedProposal.relatedWork}
                  onChange={(e) => handleProposalChange('relatedWork', e.target.value)}
                  placeholder="What related work exists in this area?"
                  className="min-h-[400px] text-sm"
                />
              </TabsContent>
              
              <TabsContent value="methods" className="mt-0">
                <Textarea
                  ref={methodsRef}
                  value={editedProposal.methods}
                  onChange={(e) => handleProposalChange('methods', e.target.value)}
                  placeholder="What methods do you propose to use?"
                  className="min-h-[400px] text-sm"
                />
              </TabsContent>
              
              <TabsContent value="outcomes" className="mt-0">
                <Textarea
                  ref={outcomesRef}
                  value={editedProposal.potentialOutcomes}
                  onChange={(e) => handleProposalChange('potentialOutcomes', e.target.value)}
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