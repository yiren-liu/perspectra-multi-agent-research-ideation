import { Node, Edge } from '@xyflow/react';
import { NodeData, EdgeData, truncateText, zoomLevels } from './nodeUtils';

/**
 * Recursively process replies and create nodes and edges
 */
export const processReplies = (
  replies: any[], 
  parentId: string,
  nodes: Node[],
  edges: Edge[],
  threadId: string,
  currentDepth: number = 1  // Track current depth, default to 1 for first level replies
) => {
  replies.forEach((reply) => {
    const nodeId = reply.message.id;
    
    // Create node for the reply
    nodes.push({
      id: nodeId,
      data: { 
        label: truncateText(reply.message.content),
        fullContent: reply.message.content,
        multiLevelSummary: reply.message.multi_level_summary,
        author: reply.message.author,
        threadId,
        depth: currentDepth  // Set the depth
      },
      position: { x: 0, y: 0 },
      type: 'postNode'
    });
    
    // Create edge from parent to this reply
    edges.push({
      id: `${parentId}->${nodeId}`,
      source: parentId,
      target: nodeId,
      // Add action and reason data if they exist
      data: reply.message.chosen_action ? {
        action: reply.message.chosen_action,
        reason: reply.message.reason
      } : {}
    });
    
    // Process nested replies recursively, incrementing depth
    if (reply.replies && reply.replies.length > 0) {
      processReplies(reply.replies, nodeId, nodes, edges, threadId, currentDepth + 1);
    }
  });
};

/**
 * Filter nodes based on zoom level and depth
 */
export const filterNodesByZoom = (nodes: Node[], edges: Edge[], zoom: number) => {
  // Always keep thread nodes visible
  const threadNodes = nodes.filter(node => node.type === 'threadNode');
  const threadNodeIds = new Set(threadNodes.map(n => n.id));
  
  // Calculate max depth to show based on zoom level
  // More dynamic approach: as zoom increases, show more levels of depth
  const baseMaxDepth = 1; // Always show at least direct replies
  const zoomFactor = 0.2; // How quickly to increase depth with zoom
  const maxDepthToShow = baseMaxDepth + Math.floor((zoom - zoomLevels.minimal) / zoomFactor);
  
  // For very zoomed out views, show only thread nodes and direct replies
  if (zoom < zoomLevels.minimal) {
    // Create a map to track direct replies to thread nodes
    const edgeMap = new Map<string, string[]>();
    edges.forEach(edge => {
      if (threadNodeIds.has(edge.source)) {
        if (!edgeMap.has(edge.source)) {
          edgeMap.set(edge.source, []);
        }
        edgeMap.get(edge.source)?.push(edge.target);
      }
    });
    
    // Get all direct reply nodes
    const directReplyIds = new Set<string>();
    edgeMap.forEach((targets) => {
      targets.forEach(target => directReplyIds.add(target));
    });
    
    // Filter to keep thread nodes and their direct replies
    return nodes.filter(node => 
      node.type === 'threadNode' || directReplyIds.has(node.id)
    );
  }
  
  // For intermediate zoom levels, filter based on depth
  if (zoom < zoomLevels.full * 1.5) {
    return nodes.filter(node => {
      // Always include thread nodes
      if (node.type === 'threadNode') return true;
      
      // Filter post nodes based on their depth
      const nodeData = node.data as NodeData;
      const depth = nodeData.depth || 0;
      
      return depth <= maxDepthToShow;
    });
  }
  
  // When fully zoomed in, show all nodes
  return nodes;
};

/**
 * Build a node hierarchy map and count hidden children
 */
export const calculateHiddenChildren = (
  nodes: Node[], 
  edges: Edge[], 
  visibleNodeIds: Set<string>
): Map<string, number> => {
  // Create a map of parent -> children relationships
  const childrenMap = new Map<string, string[]>();
  
  // Build the parent -> children map from edges
  edges.forEach(edge => {
    const { source, target } = edge;
    if (!childrenMap.has(source)) {
      childrenMap.set(source, []);
    }
    childrenMap.get(source)?.push(target);
  });

  // Function to recursively count all descendants of a node
  const countAllDescendants = (nodeId: string, visited = new Set<string>()): number => {
    if (visited.has(nodeId)) return 0; // Prevent cycles
    visited.add(nodeId);
    
    const children = childrenMap.get(nodeId) || [];
    let count = children.length;
    
    // Recursively count children's descendants
    for (const childId of children) {
      count += countAllDescendants(childId, visited);
    }
    
    return count;
  };
  
  // Function to count only the hidden descendants
  const countHiddenDescendants = (nodeId: string): number => {
    const children = childrenMap.get(nodeId) || [];
    let hiddenCount = 0;
    
    // Count direct children that are hidden
    for (const childId of children) {
      if (!visibleNodeIds.has(childId)) {
        // If child is hidden, count it and all its descendants
        hiddenCount += 1 + countAllDescendants(childId);
      } else {
        // If child is visible, recursively check its descendants
        hiddenCount += countHiddenDescendants(childId);
      }
    }
    
    return hiddenCount;
  };
  
  // First, identify visible leaf nodes - nodes that have no visible children
  const visibleLeafNodes = new Set<string>();
  
  // For each visible node, check if it has any visible children
  visibleNodeIds.forEach(nodeId => {
    const children = childrenMap.get(nodeId) || [];
    // Check if this node has any visible children
    const hasVisibleChildren = children.some(childId => visibleNodeIds.has(childId));
    
    // If it has no visible children and is not a thread node, it's a leaf node
    const node = nodes.find(n => n.id === nodeId);
    if (!hasVisibleChildren && node && node.type !== 'threadNode') {
      visibleLeafNodes.add(nodeId);
    }
  });
  
  // Calculate hidden children for each visible leaf node
  const hiddenChildrenMap = new Map<string, number>();
  
  // Only calculate for leaf nodes that aren't thread nodes
  visibleLeafNodes.forEach(nodeId => {
    const hiddenCount = countHiddenDescendants(nodeId);
    if (hiddenCount > 0) {
      hiddenChildrenMap.set(nodeId, hiddenCount);
    }
  });
  
  return hiddenChildrenMap;
}; 