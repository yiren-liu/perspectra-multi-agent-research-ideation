import React, { memo, useEffect, useRef } from 'react';
import { Handle, useStore, Position, useReactFlow, Node, XYPosition } from '@xyflow/react';

const Placeholder = () => (
  <div className="placeholder">
    <div />
    <div />
    <div />
  </div>
);

const zoomSelector = (s: any) => s.transform[2];
const zoomThresholds = [0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8];

const getNodeContent = (position: number, total: number) => {
  if (position === total) return <>Latest Node {position}</>;
  return <>Previous Node {position}</>;
};

export default memo(({ data }: { data: any }) => {
  const zoom = useStore(zoomSelector);
  const showContent = zoom >= 0.9;
  const { setNodes, getNodes, setEdges, getEdges } = useReactFlow();
  const nodePositions = useRef<Record<string, XYPosition>>({});

  useEffect(() => {
    if (showContent) {
      setNodes((nds) => {
        const visibleCount = zoomThresholds.filter(threshold => zoom >= threshold).length;

        if (nds.length < visibleCount && nds.length < 10) {
          const newNodeId = `${nds.length + 1}`;
          const newNode = {
            id: newNodeId,
            type: 'zoom',
            data: { content: getNodeContent(nds.length + 1, nds.length + 1) },
            position: nodePositions.current[newNodeId] || {
              x: 100 + (nds.length * 100),
              y: 100 + (nds.length * 50)
            },
          };

          // Add edge from previous node to new node
          if (nds.length > 0) {
            const previousNodeId = `${nds.length}`;
            setEdges((eds) => [
              ...eds,
              {
                id: `${previousNodeId}-${newNodeId}`,
                source: previousNodeId,
                target: newNodeId,
              },
            ]);
          }

          return nds.map(node => ({
            ...node,
            data: { content: getNodeContent(parseInt(node.id), nds.length + 1) },
            position: nodePositions.current[node.id] || node.position
          })).concat(newNode);
        }
        return nds;
      });
    } else {
      // Store positions and remove edges when zooming out
      setNodes((nds) => {
        nds.forEach(node => {
          nodePositions.current[node.id] = node.position;
        });

        if (nds.length > 2) {
          setEdges((eds) => eds.filter(edge =>
            edge.source <= '2' && edge.target <= '2'
          ));
          return nds.slice(0, 2);
        }
        return nds;
      });
    }
  }, [zoom, setNodes, setEdges]);

  // Add node position update handler
  const onNodeDragStop = (event: React.MouseEvent, node: Node) => {
    nodePositions.current[node.id] = node.position;
  };

  return (
    <>
      <Handle type="target" position={Position.Left} />
      {showContent ? data.content : <Placeholder />}
      <Handle type="source" position={Position.Right} />
    </>
  );
});
