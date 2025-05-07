import React, { memo } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { SystemEdge } from '../types/diagram.types';
import { useDiagram } from '../context/DiagramContext';

interface CustomEdgeProps extends EdgeProps {
  data?: SystemEdge['data'];
}

const edgeTypes = {
  call: {
    color: '#007bff',
    label: 'Call',
    strokeDasharray: 'none',
    thickness: 2,
  },
  data: {
    color: '#28a745',
    label: 'Data Flow',
    strokeDasharray: '5,5',
    thickness: 2,
  },
  event: {
    color: '#dc3545',
    label: 'Event',
    strokeDasharray: '1,5',
    thickness: 2,
  },
  depend: {
    color: '#6c757d',
    label: 'Dependency',
    strokeDasharray: '10,3',
    thickness: 1.5,
  },
  compose: {
    color: '#17a2b8',
    label: 'Composes',
    strokeDasharray: 'none',
    thickness: 2,
  },
  use: {
    color: '#fd7e14',
    label: 'Uses',
    strokeDasharray: '5,2',
    thickness: 2,
  },
  route: {
    color: '#6f42c1',
    label: 'Routes',
    strokeDasharray: '10,2,2,2',
    thickness: 2,
  },
};

const CustomEdge: React.FC<CustomEdgeProps> = ({
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
}) => {
  const { setSelectedEdge } = useDiagram();

  // Get edge type styles
  const edgeType = data?.type || 'call';
  const edgeStyle = edgeTypes[edgeType] || edgeTypes.call;

  // Calculate bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleEdgeClick = () => {
    setSelectedEdge({
      id,
      source,
      target,
      data,
    } as SystemEdge);
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeStyle.color,
          strokeWidth: edgeStyle.thickness,
          strokeDasharray: edgeStyle.strokeDasharray,
          cursor: 'pointer',
        }}
        onClick={handleEdgeClick}
      />

      {/* Label only shown for certain edge types or if label exists */}
      {data && data.description && (
        <g transform={`translate(${labelX}, ${labelY})`} onClick={handleEdgeClick}>
          <rect
            x="-24"
            y="-8"
            width="48"
            height="16"
            fill="white"
            fillOpacity="0.75"
            rx="4"
            ry="4"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              fill: edgeStyle.color,
              pointerEvents: 'none',
            }}
          >
            {edgeStyle.label}
          </text>
        </g>
      )}
    </>
  );
};

export default memo(CustomEdge);
