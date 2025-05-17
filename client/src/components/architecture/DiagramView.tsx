import React, { useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

import ControlPanel from './components/ControlPanel';
import DetailPanel from './components/DetailPanel';
import CustomNode from './components/CustomNode';
import CustomEdge from './components/CustomEdge';
import { useDiagram } from './context/DiagramContext';

// Define node types
const nodeTypes: NodeTypes = {
  default: CustomNode,
};

// Define edge types
const edgeTypes: EdgeTypes = {
  default: CustomEdge,
};

const DiagramView: React.FC = () => {
  const { filteredData, config } = useDiagram();

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredData.edges);

  // Update local nodes/edges when filtered data changes
  React.useEffect(() => {
    setNodes(filteredData.nodes);
    setEdges(filteredData.edges);
  }, [filteredData, setNodes, setEdges]);

  // Handle connection between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      const id = `e-${connection.source}-${connection.target}`;
      const newEdge = {
        id,
        source: connection.source || '',
        target: connection.target || '',
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'default'
      };
      setEdges(eds => [...eds, newEdge]);
    },
    [setEdges]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        padding: '20px',
        backgroundColor: config.theme === 'dark' ? '#2a2a2a' : '#f8f9fa',
      }}
    >
      <h1
        style={{
          fontSize: '24px',
          marginBottom: '20px',
          color: config.theme === 'dark' ? '#fff' : '#333',
        }}
      >
        System Architecture Diagram
      </h1>

      <div style={{ display: 'flex', gap: '20px', flexGrow: 1 }}>
        {/* Left panel - Controls */}
        <div style={{ width: '300px' }}>
          <ControlPanel />
          <DetailPanel />
        </div>

        {/* Main diagram area */}
        <div
          style={{
            flexGrow: 1,
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: config.theme === 'dark' ? '#1e1e1e' : '#fff',
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{
              type: 'default',
              animated: false,
              style: { stroke: '#888' },
            }}
            connectionLineType={ConnectionLineType.Bezier}
            fitView
            attributionPosition="bottom-right"
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              style={{
                backgroundColor: config.theme === 'dark' ? '#333' : '#f0f0f0',
              }}
            />
            <Background
              variant={BackgroundVariant.Dots}
              color={config.theme === 'dark' ? '#555' : '#aaa'}
              gap={16}
              size={1}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default DiagramView;
