import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, Collapse, Button, Paper, Chip, Tooltip, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import ApiIcon from '@mui/icons-material/Api';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import SettingsIcon from '@mui/icons-material/Settings';
import { styled } from '@mui/material/styles';

// Define types for node data
export interface NodeParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  format?: string;
}

export interface Method {
  name: string;
  parameters?: NodeParameter[];
  returnType?: string;
  description?: string;
}

export interface Connection {
  targetId: string;
  targetName: string;
  type: 'api' | 'database' | 'event' | 'data' | 'config';
  description?: string;
}

export interface DetailedNodeData {
  id: string;
  label: string;
  type: 'model' | 'controller' | 'service' | 'component' | 'middleware' | 'route' | 'database';
  description?: string;
  parameters?: NodeParameter[];
  methods?: Method[];
  connections?: Connection[];
  path?: string;
  importance?: 'high' | 'medium' | 'low';
  modifiable?: boolean;
  lastUpdated?: string;
  dependencies?: string[];
}

// Styled components
const NodeContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  minWidth: 250,
  maxWidth: 450,
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  border: `2px solid ${theme.palette.divider}`,
  fontFamily: theme.typography.fontFamily,
}));

const NodeHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1),
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const HeaderLabel = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.9rem',
  margin: theme.spacing(1, 0, 0.5, 0),
  color: theme.palette.text.secondary,
}));

const ParameterRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0.5, 1),
  borderBottom: `1px dashed ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

const ConnectionChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  '&.api': {
    backgroundColor: theme.palette.info.light,
  },
  '&.database': {
    backgroundColor: theme.palette.success.light,
  },
  '&.event': {
    backgroundColor: theme.palette.warning.light,
  },
  '&.data': {
    backgroundColor: theme.palette.secondary.light,
  },
  '&.config': {
    backgroundColor: theme.palette.grey[400],
  },
}));

// Get icon based on node type
const getNodeIcon = (type: string) => {
  switch (type) {
    case 'model':
      return <StorageIcon />;
    case 'controller':
      return <CodeIcon />;
    case 'service':
      return <SettingsIcon />;
    case 'component':
      return <CodeIcon />;
    case 'middleware':
      return <NetworkCheckIcon />;
    case 'route':
      return <ApiIcon />;
    case 'database':
      return <StorageIcon />;
    default:
      return <InfoIcon />;
  }
};

// Get color based on node type
const getNodeColor = (type: string) => {
  switch (type) {
    case 'model':
      return '#4caf50'; // Green
    case 'controller':
      return '#2196f3'; // Blue
    case 'service':
      return '#ff9800'; // Orange
    case 'component':
      return '#9c27b0'; // Purple
    case 'middleware':
      return '#795548'; // Brown
    case 'route':
      return '#00bcd4'; // Cyan
    case 'database':
      return '#3f51b5'; // Indigo
    default:
      return '#607d8b'; // Blue Grey
  }
};

// The main node component
const DetailedNodeComponent: React.FC<NodeProps<DetailedNodeData>> = ({ data, isConnectable }) => {
  const [expanded, setExpanded] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const [showConnections, setShowConnections] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const borderColor = getNodeColor(data.type);

  return (
    <NodeContainer
      sx={{
        borderColor,
        '&:hover': {
          boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: borderColor, width: 10, height: 10 }}
        isConnectable={isConnectable}
      />

      {/* Node header */}
      <NodeHeader onClick={toggleExpanded}>
        <HeaderLabel>
          {getNodeIcon(data.type)}
          <Typography variant="subtitle1" fontWeight="bold">
            {data.label}
          </Typography>
          <Chip
            label={data.type}
            size="small"
            sx={{
              backgroundColor: `${borderColor}30`,
              color: borderColor,
              fontWeight: 'bold',
              fontSize: '0.7rem',
            }}
          />
        </HeaderLabel>
        <IconButton size="small" onClick={toggleExpanded}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </NodeHeader>

      {/* Node details (expanded view) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 1 }}>
          {data.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {data.description}
            </Typography>
          )}

          {data.path && (
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              <strong>Path:</strong> {data.path}
            </Typography>
          )}

          {/* Parameters section */}
          {data.parameters && data.parameters.length > 0 && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 1,
                }}
              >
                <SectionTitle>Parameters</SectionTitle>
                <Button
                  size="small"
                  endIcon={showParameters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowParameters(!showParameters);
                  }}
                >
                  {showParameters ? 'Hide' : 'Show'}
                </Button>
              </Box>

              <Collapse in={showParameters}>
                <Box sx={{ mb: 1, maxHeight: 200, overflow: 'auto' }}>
                  {data.parameters.map((param, index) => (
                    <ParameterRow key={index}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {param.name}
                          {param.required && (
                            <span style={{ color: 'red', marginLeft: 2 }}>*</span>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {param.type}
                        </Typography>
                      </Box>
                      {param.description && (
                        <Tooltip title={param.description}>
                          <IconButton size="small">
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </ParameterRow>
                  ))}
                </Box>
              </Collapse>
            </>
          )}

          {/* Methods section */}
          {data.methods && data.methods.length > 0 && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 1,
                }}
              >
                <SectionTitle>Methods</SectionTitle>
                <Button
                  size="small"
                  endIcon={showMethods ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMethods(!showMethods);
                  }}
                >
                  {showMethods ? 'Hide' : 'Show'}
                </Button>
              </Box>

              <Collapse in={showMethods}>
                <Box sx={{ mb: 1, maxHeight: 200, overflow: 'auto' }}>
                  {data.methods.map((method, index) => (
                    <Box key={index} sx={{ mb: 1, pb: 1, borderBottom: '1px dashed #eee' }}>
                      <Typography variant="body2" fontWeight="medium">
                        {method.name}
                        {method.returnType && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1, color: 'text.secondary' }}
                          >
                            → {method.returnType}
                          </Typography>
                        )}
                      </Typography>
                      {method.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {method.description}
                        </Typography>
                      )}
                      {method.parameters && method.parameters.length > 0 && (
                        <Box sx={{ pl: 2, mt: 0.5 }}>
                          {method.parameters.map((param, paramIndex) => (
                            <Typography
                              key={paramIndex}
                              variant="caption"
                              display="block"
                              sx={{ color: 'text.secondary' }}
                            >
                              {param.name}: {param.type}
                              {param.required && (
                                <span style={{ color: 'red', marginLeft: 2 }}>*</span>
                              )}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </>
          )}

          {/* Connections section */}
          {data.connections && data.connections.length > 0 && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 1,
                }}
              >
                <SectionTitle>Connections</SectionTitle>
                <Button
                  size="small"
                  endIcon={showConnections ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConnections(!showConnections);
                  }}
                >
                  {showConnections ? 'Hide' : 'Show'}
                </Button>
              </Box>

              <Collapse in={showConnections}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {data.connections.map((connection, index) => (
                    <Tooltip
                      key={index}
                      title={`${connection.description || connection.type} → ${connection.targetName}`}
                    >
                      <ConnectionChip
                        label={connection.targetName}
                        size="small"
                        className={connection.type}
                        icon={
                          connection.type === 'api' ? (
                            <ApiIcon fontSize="small" />
                          ) : connection.type === 'database' ? (
                            <StorageIcon fontSize="small" />
                          ) : connection.type === 'event' ? (
                            <NetworkCheckIcon fontSize="small" />
                          ) : connection.type === 'config' ? (
                            <SettingsIcon fontSize="small" />
                          ) : (
                            <InfoIcon fontSize="small" />
                          )
                        }
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Collapse>
            </>
          )}

          {/* Additional metadata */}
          {data.importance && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Chip
                label={`Priority: ${data.importance}`}
                size="small"
                color={
                  data.importance === 'high'
                    ? 'error'
                    : data.importance === 'medium'
                    ? 'warning'
                    : 'default'
                }
              />
              {data.modifiable !== undefined && (
                <Chip
                  label={data.modifiable ? 'Modifiable' : 'Core'}
                  size="small"
                  color={data.modifiable ? 'success' : 'default'}
                />
              )}
            </Box>
          )}

          {data.lastUpdated && (
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
              Last updated: {data.lastUpdated}
            </Typography>
          )}
        </Box>
      </Collapse>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: borderColor, width: 10, height: 10 }}
        isConnectable={isConnectable}
      />
    </NodeContainer>
  );
};

export default DetailedNodeComponent;