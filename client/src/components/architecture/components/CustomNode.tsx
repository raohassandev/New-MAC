import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { SystemNode } from '../types/diagram.types';
import { useDiagram } from '../context/DiagramContext';

interface CustomNodeProps extends NodeProps {
  data: SystemNode['data'];
}

const typeColors = {
  controller: {
    background: '#d4f0fc',
    border: '#61bfed',
    text: '#0f5a7a'
  },
  service: {
    background: '#e0f7e0',
    border: '#7dd17d',
    text: '#2d682d'
  },
  model: {
    background: '#fff1cc',
    border: '#ffd966',
    text: '#7d6214'
  },
  middleware: {
    background: '#e0cffc',
    border: '#b392f0',
    text: '#4c2889'
  },
  component: {
    background: '#ffebf0',
    border: '#ff8fb4',
    text: '#a52a4c'
  },
  hook: {
    background: '#f0e6ff',
    border: '#c4a0ff',
    text: '#5d3997'
  },
  redux: {
    background: '#e6f0ff',
    border: '#a3c2ff',
    text: '#244191'
  },
  context: {
    background: '#fff0e6',
    border: '#ffbd98',
    text: '#b54f00'
  },
  route: {
    background: '#f5f5f5',
    border: '#c5c5c5',
    text: '#555555'
  }
};

const CustomNode: React.FC<CustomNodeProps> = ({ data, id }) => {
  const [expanded, setExpanded] = useState(false);
  const { setSelectedNode } = useDiagram();
  
  // Get colors based on node type
  const colors = typeColors[data.type] || {
    background: '#f5f5f5',
    border: '#c5c5c5',
    text: '#555555'
  };
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  const selectNode = () => {
    setSelectedNode({ id, data, position: { x: 0, y: 0 }, type: 'default' });
  };
  
  return (
    <div
      className="custom-node"
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '250px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
        color: colors.text,
        fontSize: '14px',
        position: 'relative'
      }}
    >
      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: colors.border, width: '10px', height: '10px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: colors.border, width: '10px', height: '10px' }}
      />
      
      {/* Header */}
      <div className="node-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        cursor: 'pointer'
      }} onClick={toggleExpanded}>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div className="node-type-indicator" style={{
            backgroundColor: colors.text,
            color: colors.background,
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            {data.type}
          </div>
          {data.label}
        </div>
        <div className="node-actions">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              selectNode(); 
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.text,
              cursor: 'pointer',
              padding: '2px',
              marginLeft: '5px'
            }}
          >
            👁️
          </button>
          <button 
            onClick={toggleExpanded}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.text,
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>
      
      {/* File path */}
      <div className="node-path" style={{
        fontSize: '11px',
        color: `${colors.text}99`,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginBottom: expanded ? '8px' : '0'
      }}>
        {data.filePath}
      </div>
      
      {/* Functions (only shown when expanded) */}
      {expanded && data.functions && (
        <div className="node-functions" style={{
          marginTop: '8px',
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '8px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
            Functions:
          </div>
          <ul style={{ 
            margin: '0', 
            padding: '0 0 0 16px',
            fontSize: '12px',
            maxHeight: '100px',
            overflowY: 'auto'
          }}>
            {data.functions.map(fn => (
              <li key={fn.name} style={{ marginBottom: '4px' }}>
                <div style={{ fontWeight: 'bold' }}>{fn.name}</div>
                <div style={{ fontSize: '10px', color: `${colors.text}99` }}>
                  {fn.description}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default memo(CustomNode);