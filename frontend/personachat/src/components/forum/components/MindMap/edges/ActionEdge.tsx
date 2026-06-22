import React from 'react';
import { EdgeProps, getBezierPath, useStore } from '@xyflow/react';
import { Info } from 'lucide-react';
import { useUserStudyLogger } from '@/utils/userStudyLogger';
import { useAppStore } from '@/stores/appStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getActionDisplay, zoomLevels } from '../utils/nodeUtils';

/**
 * Custom edge component with action labels
 */
function ActionEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  markerStart,
}: EdgeProps) {
  // Initialize the user study logger
  const logger = useUserStudyLogger();
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Check if we have action data
  const hasAction = data && typeof data === 'object' && 'action' in data && typeof data.action === 'string' && data.action.length > 0;
  
  // Determine what to display based on zoom level
  const zoom = useStore((s: any) => s.transform[2]);
  let actionLabel = null;
  
  if (hasAction && zoom >= zoomLevels.minimal) {
    const actionText = String(data.action);
    const reasonText = data.reason ? String(data.reason) : '';
    
    // Get the appropriate icon and color for this action
    const { icon, color, iconColor } = getActionDisplay(actionText);
    
    // Extract just the color name for styling the path
    const colorName = iconColor.split('-')[1]; // e.g., "green" from "text-green-600"
    
    // Update the path style to match the action color
    style = {
      ...style,
      stroke: `var(--${colorName}-400, #94a3b8)`,
      strokeWidth: 2
    };
    
    // Calculate a better position that's closer to the source
    // This positions the label at 40% of the way from source to target
    const midX = sourceX + (targetX - sourceX) * 0.5;
    const midY = sourceY + (targetY - sourceY) * 0.5;
    
    actionLabel = (
      <foreignObject
        width={130}
        height={40}
        x={midX - 65}
        y={midY - 20}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="flex items-center justify-center">
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger 
                asChild
                onMouseEnter={() => {
                  logger.logInteraction('hover', 'mindmap-edge-tooltip-trigger', {
                    edge_id: id,
                    source_id: source,
                    target_id: target,
                    project_id: useAppStore.getState().selectedProjectId || 'none',
                    action_type: actionText,
                    has_reason: !!reasonText
                  });
                }}
              >
                <div className={`flex items-center rounded-md px-2 py-1 text-xs border shadow-sm hover:shadow-md transition-all action-label ${color}`}>
                  <span className={`${iconColor} mr-1.5`}>{icon}</span>
                  <span className="truncate max-w-[85px] font-medium">{actionText}</span>
                </div>
              </TooltipTrigger>
              {reasonText && (
                <TooltipContent side="top" className={`max-w-xs action-tooltip ${color.replace('text-', '')}`}>
                  <div className="p-1">
                    <p className="text-sm font-medium mb-1 text-gray-800">Reasoning:</p>
                    <p className="text-sm opacity-90 text-gray-800">{reasonText}</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </foreignObject>
    );
  }

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      {actionLabel}
    </>
  );
}

export default ActionEdge; 