import { useEffect, useState, useRef } from "react";
import { Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Paper, ConceptSource } from "@/types";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

import { useAppStore } from '@/stores/appStore'

export default function PaperList() {
  const { includedPapers, setIncludedPapers, searchResults, setSearchResults, isPersonasReady, selectedSourceConcept } = useAppStore();

  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set());
  const [highlightedPapers, setHighlightedPapers] = useState<Set<string>>(new Set());

  // Add ref for storing refs to highlighted elements
  const highlightRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const handleRemovePaper = (paper: Paper) => {
    setIncludedPapers(includedPapers.filter(
      p => p.id !== paper.id
    ))
    setSearchResults([...searchResults, paper])
  }

  useEffect(() => {
    if (!isPersonasReady || !selectedSourceConcept) { return }

    const { sources } = selectedSourceConcept;
    const matches = includedPapers.filter(paper =>
      sources.some(source => paper.abstract.includes(source.replace(/^\.+|\.+$/g, '')))
    );

    const matchedPaperIds = matches.map(paper => paper.id);

    // Update expanded and highlighted papers
    setExpandedPapers(new Set(matchedPaperIds));
    setHighlightedPapers(new Set(matchedPaperIds));

    // Scroll to the first highlight after a short delay to ensure rendering
    setTimeout(() => {
      if (highlightRefs.current[0]) {
        highlightRefs.current[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  }, [selectedSourceConcept, isPersonasReady]);

  const paperComponent = (paper: Paper) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center font-medium line-clamp-3">
                  {paper.title}
                  <a
                    href={`https://www.semanticscholar.org/paper/${paper.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Semantic_scholar_logo.png?20220923184403"
                      alt="Semantic Scholar"
                      className="w-6 h-6 max-w-none"
                    />
                  </a>
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {paper.authors.join(', ')} ({paper.year})
                </p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{paper.title} <br /> by {paper.authors.join(', ')} ({paper.year})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const matchingSourcesForPaper = (paper: Paper): string[] => {
    if (!selectedSourceConcept) return [];
    const { sources } = selectedSourceConcept;
    return sources.filter(source => paper.abstract.includes(
      source.replace(/^\.+|\.+$/g, '') // Trim starting and ending dots
    )).map(source => source.replace(/^\.+|\.+$/g, ''));
  };

  const highlightMatches = (text: string, matches: string[]) => {
    if (matches.length === 0) return text;

    // Reset refs array
    highlightRefs.current = [];

    const escapedMatches = matches.map(escapeRegExp);
    const pattern = new RegExp(`(${escapedMatches.join('|')})`, 'gi');
    const parts = text.split(pattern);

    let highlightCount = 0;

    return parts.map((part, i) => {
      if (matches.some(match =>
        match.replace(/^\.+|\.+$/g, '').toLowerCase() === part.toLowerCase()
      )) {
        return (
          <span
            key={i}
            ref={el => {
              highlightRefs.current[highlightCount] = el;
              highlightCount++;
            }}
            className="bg-greena"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleExpandButtonToggle = (paper: Paper) => {
    setExpandedPapers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paper.id)) {
        newSet.delete(paper.id);
      } else {
        newSet.add(paper.id);
      }
      return newSet;
    });
  }

  return (
    <ul className="space-y-2">
      {includedPapers.map((paper) => (
        <li
          key={paper.id}
          className={`flex flex-row justify-between border rounded-lg p-3 ${highlightedPapers.has(paper.id) ? 'bg-yellow-50' : ''
            }`}
        >
          {!isPersonasReady ? (
            <div className="flex w-full space-x-2">
              {paperComponent(paper)}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">View</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="pr-4">{paper.title}</DialogTitle>
                    <DialogDescription>
                      {paper.authors.join(', ')} ({paper.year})
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Abstract</h4>
                    <p className="text-sm">{paper.abstract}</p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" size="sm" onClick={() => handleRemovePaper(paper)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="w-full mt-2">
              {paperComponent(paper)}
              <Collapsible open={expandedPapers.has(paper.id)}>
                <div className="flex flex-row justify-end space-x-2 mt-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleExpandButtonToggle(paper)}>
                      Show Details
                    </Button>
                  </CollapsibleTrigger>
                  <Button variant="destructive" size="sm" onClick={() => handleRemovePaper(paper)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Abstract</h4>
                    <p className="text-sm">
                      {highlightMatches(paper.abstract, matchingSourcesForPaper(paper))}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}