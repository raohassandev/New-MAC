import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Typography, Chip, Paper, Tooltip } from '@mui/material';

// Edge types for different connections
export type EdgeType = 'api' | 'data' | 'event' | 'database' | 'config' | 'call' | 'dependency';

// Define edge data interface
export interface DetailedEdgeData {
  type: EdgeType;
  label?: string;
  description?: string;
  parameters?: {
    name: string;
    type: string;
    description?: string;
  }[];
  direction?: 'unidirectional' | 'bidirectional';
  importance?: 'high' | 'medium' | 'low';
  protocol?: string;
  frequency?: 'realtime' | 'periodic' | 'onDemand';
  isAsync?: boolean;
}

// Styled components
const EdgeLabel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  borderRadius: 4,
  fontSize: '10px',
  pointerEvents: 'all',
  cursor: 'pointer',
  fontWeight: 'bold',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  backdropFilter: 'blur(4px)',
}));

const ParameterList = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  minWidth: 150,
  maxWidth: 280,
  maxHeight: 300,
  overflow: 'auto',
  fontSize: '12px',
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
}));

const ParamRow = styled('div')(({ theme }) => ({
  padding: theme.spacing(0.5, 0),
  borderBottom: `1px dashed ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

// Function to get edge color based on type
const getEdgeColor = (type: EdgeType) => {
  switch (type) {
    case 'api':
      return '#3f51b5'; // Indigo
    case 'data':
      return '#2196f3'; // Blue
    case 'event':
      return '#ff9800'; // Orange
    case 'database':
      return '#4caf50'; // Green
    case 'config':
      return '#9c27b0'; // Purple
    case 'call':
      return '#f44336'; // Red
    case 'dependency':
      return '#607d8b'; // Blue Grey
    default:
      return '#9e9e9e'; // Grey
  }
};

// Function to get the stroke dash array based on edge type
const getStrokeDashArray = (type: EdgeType, isAsync?: boolean) => {
  if (isAsync) {
    return '6,3';
  }

  switch (type) {
    case 'event':
      return '5,5';
    case 'config':
      return '3,2';
    case 'dependency':
      return '8,3,1,3';
    default:
      return 'none';
  }
};

// Function to get edge thickness based on importance
const getEdgeThickness = (importance?: 'high' | 'medium' | 'low') => {
  switch (importance) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1.5;
  }
};

// The main edge component
const DetailedEdgeComponent: React.FC<EdgeProps<DetailedEdgeData>> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
}) => {
  const [showParameters, setShowParameters] = React.useState(false);

  // Use bezier path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = getEdgeColor(data?.type || 'call');
  const strokeDashArray = getStrokeDashArray(data?.type || 'call', data?.isAsync);
  const strokeWidth = getEdgeThickness(data?.importance);

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.parameters && data.parameters.length > 0) {
      setShowParameters(!showParameters);
    }
  };

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth,
          strokeDasharray: strokeDashArray,
          opacity: 0.8,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              zIndex: 1000,
            }}
          >
            <Tooltip
              title={
                data.description
                  ? `${data.description}${data.protocol ? ` (${data.protocol})` : ''}`
                  : ''
              }
              placement="top"
            >
              <EdgeLabel
                onClick={handleLabelClick}
                sx={{
                  backgroundColor: `${edgeColor}20`,
                  border: `1px solid ${edgeColor}`,
                  color: edgeColor,
                }}
              >
                {data.label}
                {data.frequency && (
                  <Chip
                    label={data.frequency}
                    size="small"
                    sx={{
                      ml: 0.5,
                      height: 16,
                      fontSize: '0.6rem',
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                )}
              </EdgeLabel>
            </Tooltip>

            {/* Parameters popup */}
            {showParameters && data.parameters && data.parameters.length > 0 && (
              <ParameterList
                sx={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1001,
                }}
              >
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Parameters:
                </Typography>
                {data.parameters.map((param, index) => (
                  <ParamRow key={index}>
                    <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                      {param.name}:{' '}
                      <span style={{ color: '#666', fontSize: '10px' }}>{param.type}</span>
                    </Typography>
                    {param.description && (
                      <Typography variant="caption" display="block" sx={{ color: '#666' }}>
                        {param.description}
                      </Typography>
                    )}
                  </ParamRow>
                ))}
              </ParameterList>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default DetailedEdgeComponent;
