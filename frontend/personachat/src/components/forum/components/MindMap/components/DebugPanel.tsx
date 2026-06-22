import React from 'react';
import { zoomLevels } from '../utils/nodeUtils';

interface DebugPanelProps {
  zoom: number;
  visibleNodeCount: number;
  totalNodeCount: number;
}

/**
 * Debug panel component for development use
 */
const DebugPanel = ({ 
  zoom, 
  visibleNodeCount, 
  totalNodeCount 
}: DebugPanelProps) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  // Calculate visual representation of what depths are shown at current zoom
  const baseMaxDepth = 1;
  const zoomFactor = 0.2;
  const maxDepthToShow = baseMaxDepth + Math.floor((zoom - zoomLevels.minimal) / zoomFactor);
  
  return (
    <div className="absolute top-3 right-3 bg-white p-2 rounded shadow border text-xs opacity-80 hover:opacity-100 transition-opacity z-50">
      <div className="font-medium mb-1">Debug Info</div>
      <div>Zoom: {zoom.toFixed(2)}</div>
      <div>Max depth shown: {maxDepthToShow}</div>
      <div>Visible nodes: {visibleNodeCount} / {totalNodeCount} ({Math.round(visibleNodeCount/totalNodeCount*100)}%)</div>
      <div className="flex gap-1 mt-1 items-center">
        <div className="h-3 w-3 bg-blue-500" title="Depth 0"></div>
        <div className="h-3 w-3 bg-green-500" title="Depth 1"></div>
        <div className="h-3 w-3 bg-amber-500" title="Depth 2"></div>
        <div className="h-3 w-3 bg-red-500" title="Depth 3"></div>
        <div className="h-3 w-3 bg-purple-500" title="Depth 4+"></div>
      </div>
    </div>
  );
};

export default DebugPanel; 