import React from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import { NodeData, truncateText, zoomLevels } from '../utils/nodeUtils';
import PostPlaceholder from './PostPlaceholder';
import { useUserStudyLogger } from '@/utils/userStudyLogger';
import { useAppStore } from '@/stores/appStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Component for displaying post nodes with zoom capabilities
 */
function PostNode({ 
  data, 
  selected,
  id 
}: { 
  data: NodeData; 
  selected: boolean;
  id: string;
}) {
  // Initialize the user study logger
  const logger = useUserStudyLogger();
  // Get current zoom level from ReactFlow store
  const zoom = useStore((s: any) => s.transform[2]);
  
  // Get node depth
  const depth = data.depth || 0;
  
  // Get hidden children count from data or use 0
  const hiddenChildCount = data.hiddenChildCount || 0;
  
  // Determine content display based on zoom level AND depth
  let contentDisplay;
  let containerClass;
  
  // Adjust the effective zoom based on depth
  // Deeper nodes need higher zoom to show the same level of detail
  const depthPenalty = depth * 0.1; // Each level of depth requires higher zoom to show details
  const effectiveZoom = zoom - depthPenalty;
  
  if (effectiveZoom < zoomLevels.minimal) {
    // Minimal view - just a small indicator
    contentDisplay = <PostPlaceholder data={data} />;
    containerClass = 'py-1 px-2 bg-gray-50 max-w-[150px] min-w-[80px]';
  } else if (effectiveZoom < zoomLevels.compact) {
    // Compact view - author initial and truncated content
    contentDisplay = <PostPlaceholder data={data} />;
    containerClass = 'py-1 px-2 bg-gray-100 max-w-[150px] min-w-[80px]';
  } else if (effectiveZoom < zoomLevels.medium) {
    // Medium view - slightly more content
    contentDisplay = (
      <>
        {data.author && (
          <div className="text-[9px] text-gray-500 mb-0.5 truncate">{data.author.split(' ')[0]}</div>
        )}
        <div className="text-[8px] text-gray-400 mt-0.5 italic">Summary</div>
        <div className="text-[10px]">{truncateText(data.multiLevelSummary?.short_summary || '', 150)}</div>
      </>
    );
    containerClass = 'py-1.5 px-2.5 bg-white max-w-[200px] min-w-[120px]';
  } else if (effectiveZoom < zoomLevels.full) {
    // Reduced view - full content but smaller
    contentDisplay = (
      <>
        {data.author && (
          <div className="font-semibold text-[10px] text-gray-500 mb-1">{data.author}</div>
        )}
        <div className="text-[8px] text-gray-400 mt-0.5 italic">Summary</div>
        <div className="text-xs">{truncateText(data.multiLevelSummary?.short_summary || '', 200)}</div>
      </>
    );
    containerClass = 'py-2 px-3 bg-white max-w-[250px] min-w-[150px]';
  } else if (effectiveZoom < zoomLevels.detailed) {
    // Full view - complete content
    contentDisplay = (
      <>
        {data.author && (
          <div className="font-semibold text-xs text-gray-500 mb-1">{data.author}</div>
        )}
        <div className="text-[9px] text-gray-400 mt-0.5 italic">Summary</div>
        <div>{truncateText(data.multiLevelSummary?.short_summary || '', 300)}</div>
      </>
    );
    containerClass = 'py-2 px-4 bg-white min-w-[180px] max-w-[320px]';
  } else {
    // Detailed view - full content with extras
    contentDisplay = (
      <>
        {data.author && (
          <div className="font-semibold text-xs text-gray-500 mb-1">{data.author}</div>
        )}
        <div className="text-[9px] text-gray-400 mt-0.5 italic">Summary</div>
        <div className="font-medium">{data.multiLevelSummary?.short_summary}</div>
        
        {/* Show depth info in development environment */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-[8px] text-blue-400 mt-1">depth: {depth}, zoom: {zoom.toFixed(2)}</div>
        )}
      </>
    );
    containerClass = 'py-3 px-5 bg-white min-w-[200px] max-w-[400px]';
  }
  
  return (
    <div className={`rounded-lg border shadow-sm transition-all ${containerClass} relative
      ${selected ? 'border-blue-500 ring-2 ring-blue-200' : depth === 0 ? 'border-gray-300' : `border-gray-${Math.min(300 + (depth * 50), 400)}`}`}>
      {contentDisplay}
      
      {/* Show hidden child count if there are any */}
      {hiddenChildCount > 0 && (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger 
              asChild
              onMouseEnter={() => {
                logger.logInteraction('hover', 'mindmap-tooltip-trigger', {
                  node_id: id,
                  node_type: 'postNode', 
                  node_label: data.label,
                  thread_id: data.threadId || 'none',
                  project_id: useAppStore.getState().selectedProjectId || 'none',
                  tooltip_type: 'hidden-replies',
                  hidden_count: hiddenChildCount
                });
              }}
            >
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] rounded-full min-w-5 h-5 flex items-center justify-center px-1 shadow-sm border border-blue-300 font-medium hover:bg-blue-600 transition-colors cursor-zoom-in">
                {hiddenChildCount > 99 ? '99+' : hiddenChildCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-blue-50 border-blue-200">
              <div className="p-1 text-xs text-gray-800">
                {hiddenChildCount} hidden {hiddenChildCount === 1 ? 'reply' : 'replies'}
                <div className="text-[10px] opacity-70 mt-0.5">Zoom in to view</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

export default PostNode; 