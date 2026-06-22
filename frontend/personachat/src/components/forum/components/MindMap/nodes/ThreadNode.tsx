import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeData, truncateText } from '../utils/nodeUtils';
import { useUserStudyLogger } from '@/utils/userStudyLogger';
import { useAppStore } from '@/stores/appStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Component for displaying thread nodes
 */
function ThreadNode({ data, selected, id }: { data: NodeData; selected: boolean, id: string }) {
  // Initialize the user study logger
  const logger = useUserStudyLogger();
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger 
          asChild
          onMouseEnter={() => {
            logger.logInteraction('hover', 'mindmap-tooltip-trigger', {
              node_id: id,
              node_type: 'threadNode',
              node_label: data.label,
              thread_id: data.threadId || id,
              project_id: useAppStore.getState().selectedProjectId || 'none'
            });
          }}
        >
          <div className={`px-4 py-2 rounded-lg bg-blue-50 border-2 shadow-md min-w-[150px] max-w-[250px] transition-all
            ${selected ? 'border-blue-600 ring-2 ring-blue-300' : 'border-blue-500'}`}>
            <div className="font-bold text-blue-800">{data.label}</div>
            {data.fullContent && (
              <div className="text-xs text-gray-600 mt-1">{truncateText(data.fullContent, 150)}</div>
            )}
            <Handle type="source" position={Position.Right} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-blue-50 border-blue-300 max-w-xs">
          <div className="p-1">
            <div className="font-semibold">{data.label}</div>
            {data.fullContent && (
              <div className="text-xs mt-1">{truncateText(data.fullContent, 250)}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ThreadNode; 