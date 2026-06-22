import { useEffect, useCallback, useMemo, useState } from 'react';
import { Star, Trash, Info, ChevronsUpDown, ChevronsDownUp, Loader2, PlusCircle, MoreHorizontal } from 'lucide-react'
import { useUserStudyLogger } from '@/utils/userStudyLogger'

import {
  ReactFlow,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  OnConnect,
  addEdge,
  ConnectionLineType,
  NodeTypes,
  NodeMouseHandler,
  Controls,
  useStore,
  EdgeTypes,
  MiniMap,
  EdgeMouseHandler,
} from '@xyflow/react';

// This is used to display a leva (https://github.com/pmndrs/leva) control panel for the example
import { useControls } from 'leva';

import useAutoLayout, { type LayoutOptions } from './useAutoLayout';
import { getId } from './utils';

import '@xyflow/react/dist/style.css';
import './index.css';

import { useAppStore } from "@/stores/appStore";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Import custom node and edge components
import PostNode from './nodes/PostNode';
import ThreadNode from './nodes/ThreadNode';
import ActionEdge from './edges/ActionEdge';
import DebugPanel from './components/DebugPanel';

// Import utility functions
import { NodeData } from './utils/nodeUtils';
import { 
  processReplies, 
  filterNodesByZoom, 
  calculateHiddenChildren 
} from './utils/nodeProcessing';

const defaultEdgeOptions = {
  type: 'actionEdge',
  markerStart: { type: MarkerType.ArrowClosed },
  pathOptions: { offset: 5 },
};

function ReactFlowAutoLayout() {
  const { fitView } = useReactFlow();
  const { 
    threads, 
    setSelectedThreadId, 
    setHighlightedPostId,
    selectedProjectId,
    getThreadsForProject,
    projects
  } = useAppStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetails, setNodeDetails] = useState<{ content: string; author?: string; threadId?: string } | null>(null);
  // Initialize the user study logger
  const logger = useUserStudyLogger();
  
  // Get current zoom level for node filtering
  const zoom = useStore((s: any) => s.transform[2]);

  // Get threads for the current project
  const projectThreads = useMemo(() => {
    return getThreadsForProject(selectedProjectId);
  }, [getThreadsForProject, selectedProjectId, threads]);

  // Get the selected project name
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Define node types
  const nodeTypes = useMemo((): NodeTypes => ({ 
    threadNode: ThreadNode,
    postNode: PostNode,
  }), []);

  // Define edge types
  const edgeTypes = useMemo(() => ({ 
    actionEdge: ActionEdge,
  }), []);

  // Derive nodes and edges from threads data
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Process each thread in the current project
    projectThreads.forEach((thread) => {
      const threadId = thread.discussion.id;
      
      // Create a root node for the thread
      nodes.push({
        id: threadId,
        data: { 
          label: thread.discussion.topic,
          fullContent: thread.discussion.topic_description,
          isRoot: true,
          threadId
        },
        position: { x: 0, y: 0 },
        type: 'threadNode'
      });
      
      // Process each top-level post in the discussion thread
      thread.discussion.discussion_thread.forEach((post) => {
        const postId = post.message.id;
        
        // Create node for the post
        nodes.push({
          id: postId,
          data: { 
            label: post.message.content,
            fullContent: post.message.content,
            multiLevelSummary: post.message.multi_level_summary,
            author: post.message.author,
            threadId,
            depth: 0  // Top-level posts have depth 0
          },
          position: { x: 0, y: 0 },
          type: 'postNode'
        });
        
        // Create edge from thread to post
        edges.push({
          id: `${threadId}->${postId}`,
          source: threadId,
          target: postId,
          // Add action and reason data if they exist
          data: post.message.chosen_action ? {
            action: post.message.chosen_action,
            reason: post.message.reason
          } : {}
        });
        
        // Process replies recursively
        if (post.replies && post.replies.length > 0) {
          processReplies(post.replies, postId, nodes, edges, threadId, 1);  // Start replies at depth 1
        }
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [projectThreads]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(node => ({
    ...node,
    selected: node.id === selectedNodeId
  })));
  
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges directly when the initial values change
  useEffect(() => {
    setNodes(initialNodes.map(node => ({
      ...node,
      selected: node.id === selectedNodeId
    })));
  }, [initialNodes, selectedNodeId, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // 👇 This hook is used to display a leva (https://github.com/pmndrs/leva) control panel for this example.
  let layoutOptions: LayoutOptions;
  if (process.env.NODE_ENV === 'development') {
    layoutOptions = useControls({
      algorithm: {
        value: 'dagre' as LayoutOptions['algorithm'],
        options: ['dagre', 'd3-hierarchy', 'elk'] as LayoutOptions['algorithm'][],
      },
      direction: {
        value: 'LR' as LayoutOptions['direction'],
        options: {
          down: 'TB',
          right: 'LR',
          up: 'BT',
          left: 'RL',
        } as Record<string, LayoutOptions['direction']>,
      },
      spacing: [150, 120],
    });
  } else {
    layoutOptions = {
      algorithm: 'dagre' as LayoutOptions['algorithm'],
      direction: 'LR' as LayoutOptions['direction'],
      spacing: [150, 120],
    } as LayoutOptions;
  }

  // this hook handles the computation of the layout once the elements or the direction changes
  // const { isLayoutComputing } = useAutoLayout(layoutOptions);
  useAutoLayout(layoutOptions);
  const isLayoutComputing = false;

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Create a callback to filter nodes based on zoom
  const updateNodesBasedOnZoom = useCallback(() => {
    if (initialNodes.length === 0) return;
    
    // Apply zoom-based node filtering
    const visibleNodes = filterNodesByZoom([...initialNodes], [...initialEdges], zoom);
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    
    // Calculate hidden children for each visible node
    const hiddenChildrenMap = calculateHiddenChildren(initialNodes, initialEdges, visibleNodeIds);
    
    // Update visible nodes with debugging info in development
    setNodes(visibleNodes.map(node => {
      // Get hidden child count for this node
      const hiddenChildCount = hiddenChildrenMap.get(node.id) || 0;
      
      // Add visual indicators for depth in development mode
      if (process.env.NODE_ENV === 'development' && node.type === 'postNode') {
        const nodeData = node.data as NodeData;
        const depth = nodeData.depth || 0;
        
        // Show depth in node label for debugging
        return {
          ...node,
          selected: node.id === selectedNodeId,
          // Include hidden child count
          data: {
            ...node.data,
            hiddenChildCount
          },
          // Optional debug mode styling to visualize depth with colors
          style: {
            ...node.style,
            borderLeft: `${Math.min(depth + 1, 5)}px solid ${
              depth === 0 ? 'rgb(37, 99, 235)' : // blue
              depth === 1 ? 'rgb(16, 185, 129)' : // green 
              depth === 2 ? 'rgb(245, 158, 11)' : // amber
              depth === 3 ? 'rgb(239, 68, 68)' : // red
              depth >= 4 ? 'rgb(139, 92, 246)' : // purple
              'gray'
            }`
          }
        };
      }
      
      return {
        ...node,
        selected: node.id === selectedNodeId,
        // Always include hidden child count data
        data: {
          ...node.data,
          hiddenChildCount
        }
      };
    }));
    
    // Also update edges to only connect visible nodes
    const visibleEdges = initialEdges
      .filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map(edge => {
        // Add class for edges with action data
        if (edge.data && typeof edge.data === 'object' && 'action' in edge.data && typeof edge.data.action === 'string') {
          const action = String(edge.data.action).toLowerCase();
          let actionClass = 'has-action-data';
          
          // Add specific classes based on action type
          if (action.includes('agree')) {
            actionClass += ' action-agree';
          } else if (action.includes('disagree')) {
            actionClass += ' action-disagree';
          } else if (action.includes('question')) {
            actionClass += ' action-question';
          } else if (action.includes('claim')) {
            actionClass += ' action-claim';
          } else if (action.includes('issue')) {
            actionClass += ' action-issue';
          } else if (action.includes('withdraw')) {
            actionClass += ' action-withdraw';
          } else if (action.includes('concede')) {
            actionClass += ' action-concede';
          } else if (action.includes('rebut')) {
            actionClass += ' action-rebut';
          }
          
          return { ...edge, className: actionClass };
        }
        return edge;
      })
      .filter(edge => edge !== undefined) as Edge[];
    
    setEdges(visibleEdges);
  }, [zoom, initialNodes, initialEdges, setNodes, setEdges, selectedNodeId]);
  
  // Add effect to update nodes when zoom changes
  useEffect(() => {
    updateNodesBasedOnZoom();
  }, [zoom, initialNodes, initialEdges, updateNodesBasedOnZoom]);
  


  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNodeId(node.id);
    
    const nodeData = node.data as NodeData;
    
    // Set details for the details panel
    setNodeDetails({
      content: nodeData.fullContent || nodeData.label,
      author: nodeData.author,
      threadId: nodeData.threadId
    });
    
    // Log node click interaction
    logger.logInteraction('click', 'mindmap-node-click', {
      node_id: node.id,
      node_type: node.type || 'unknown',
      node_label: nodeData.label,
      thread_id: nodeData.threadId || 'none',
      project_id: selectedProjectId || 'none',
      is_root: !!nodeData.isRoot
    });
    
    // If it's a thread node, navigate to that thread
    if (nodeData.isRoot && nodeData.threadId) {
      setSelectedThreadId(nodeData.threadId);
    }
    
    // If it's a post node, highlight the post in the thread
    if (!nodeData.isRoot) {
      setHighlightedPostId(node.id);
      setSelectedThreadId(nodeData.threadId || null);
    }
  }, [setSelectedThreadId, setHighlightedPostId, logger, selectedProjectId]);

  // Handle edge click
  const onEdgeClick: EdgeMouseHandler = useCallback((event, edge) => {
    // Log edge click interaction
    logger.logInteraction('click', 'mindmap-edge-click', {
      edge_id: edge.id,
      source_id: edge.source,
      target_id: edge.target,
      project_id: selectedProjectId || 'none',
      has_action: !!(edge.data && typeof edge.data === 'object' && 'action' in edge.data),
      action_type: edge.data && typeof edge.data === 'object' && 'action' in edge.data 
        ? String(edge.data.action) 
        : 'none'
    });
  }, [logger, selectedProjectId]);

  useEffect(() => {
    fitView();
  }, [fitView]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodesDraggable={false}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.SmoothStep}
          zoomOnDoubleClick={false}
          className="bg-white absolute inset-0"
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Controls />
          <MiniMap nodeStrokeWidth={3} pannable={true} />
          {process.env.NODE_ENV === 'development' && (
            <DebugPanel 
              zoom={zoom} 
              visibleNodeCount={nodes.length} 
              totalNodeCount={initialNodes.length} 
            />
          )}
          {isLayoutComputing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary">Computing layout...</span>
              </div>
            </div>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function MindMap() {
  const { 
    selectedProjectId, 
    getThreadsForProject, 
    projects
  } = useAppStore();
  const navigate = useNavigate();
  
  // Get threads for the selected project
  const projectThreads = useMemo(() => {
    return getThreadsForProject(selectedProjectId);
  }, [getThreadsForProject, selectedProjectId]);
  
  // Get the selected project name
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Navigate to projects page
  const handleGoToProjects = () => {
    navigate('/projects');
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-2">
        Mind Map
        {selectedProject && (
          <span className="text-gray-500 text-lg ml-2">
            for project "{selectedProject.name}"
          </span>
        )}
      </h2>
      
      {!selectedProjectId ? (
        <div className="flex flex-col h-64 items-center justify-center text-gray-500 gap-4">
          <p>Please select a project to view its discussions in mind map format</p>
          <Button onClick={handleGoToProjects} variant="outline">
            Go to Projects
          </Button>
        </div>
      ) : projectThreads.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          No threads available in this project
        </div>
      ) : (
        <div className="border rounded-md flex-grow">
          <ReactFlowProvider>
            <ReactFlowAutoLayout />
          </ReactFlowProvider>
        </div>
      )}
    </div>
  );
}