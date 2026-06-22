import { Citation } from "@/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Function to truncate text with ellipsis if it exceeds max length
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const replacePaperIdWithCitation = (content: string, citations: Citation[]): JSX.Element => {
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
          }
          return part;
        })}
      </>
    );
  }