import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConceptSource } from "@/types";
import { useChatStore } from "@/stores/chatStore";

export default function ConceptTag({ conceptSource }: { conceptSource: ConceptSource }) {
    const { setSelectedSourceConcept } = useChatStore();

    // const { entityMention, sourceTexts } = parseConceptString(concept);
    const { concept, sources } = conceptSource;

    // useEffect(() => {
    //     addConceptSource({ concept: entityMention, sources: sourceTexts });
    // }, [entityMention, sourceTexts]);

    const handleConceptClick = () => {
        setSelectedSourceConcept(conceptSource);
    }

    return (
        <TooltipProvider>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <Button 
                        size="sm" 
                        className="h-5 bg-greena text-slate-800 hover:bg-slate-400 hover:text-slate-900"
                        onClick={() => handleConceptClick()}
                    >
                        {concept}
                    </Button>
                </TooltipTrigger>
                {sources.length > 0 && (
                    <TooltipContent
                        className="max-w-[300px] bg-white p-2 rounded-lg shadow-lg border border-slate-200"
                    >
                        <ul className="list-disc pl-5 space-y-1">
                            {sources.map((text, index) => (
                                <li key={index} className="text-sm text-slate-700">
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}

