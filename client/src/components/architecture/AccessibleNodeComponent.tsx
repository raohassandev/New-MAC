import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Api as ApiIcon,
  NetworkCheck as NetworkCheckIcon,
  Settings as SettingsIcon,
  DataObject as DataObjectIcon,
} from '@mui/icons-material';
import { DetailedNodeData } from './components/DetailedNodeComponent';

const typeIcons = {
  model: <DataObjectIcon />,
  controller: <CodeIcon />,
  service: <SettingsIcon />,
  middleware: <NetworkCheckIcon />,
  route: <ApiIcon />,
  database: <StorageIcon />,
};

const typeColors = {
  model: '#4caf50',
  controller: '#2196f3',
  service: '#ff9800',
  middleware: '#795548',
  route: '#00bcd4',
  database: '#3f51b5',
};

const AccessibleNodeComponent: React.FC<NodeProps<DetailedNodeData>> = ({ data, selected }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleExpandToggle = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setExpanded(!expanded);
  }, [expanded]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setExpanded(!expanded);
    }
  }, [expanded]);

  const nodeColor = typeColors[data.type as keyof typeof typeColors] || '#607d8b';
  const icon = typeIcons[data.type as keyof typeof typeIcons] || <InfoIcon />;

  return (
    <Box
      sx={{
        minWidth: 250,
        maxWidth: expanded ? 400 : 300,
        backgroundColor: theme.palette.background.paper,
        border: `2px solid ${selected ? theme.palette.primary.main : nodeColor}`,
        borderRadius: 2,
        boxShadow: selected ? 4 : 2,
        transition: 'all 0.2s ease-in-out',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        outline: focused ? `2px solid ${theme.palette.primary.main}` : 'none',
        outlineOffset: 2,
      }}
      tabIndex={0}
      role="button"
      aria-label={`${data.label} - ${data.type} component`}
      aria-expanded={expanded}
      aria-describedby={`node-description-${data.id}`}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: nodeColor }}
        aria-label="Input connection point"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: nodeColor }}
        aria-label="Output connection point"
      />

      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: nodeColor,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          {icon}
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {data.label}
          </Typography>
        </Box>
        
        <Tooltip title={expanded ? 'Collapse details' : 'Expand details'}>
          <IconButton
            size="small"
            onClick={handleExpandToggle}
            sx={{ color: 'white' }}
            aria-label={expanded ? 'Collapse node details' : 'Expand node details'}
          >
            <ExpandMoreIcon
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {/* Type chip */}
        <Box sx={{ mb: 1 }}>
          <Chip
            label={data.type}
            size="small"
            sx={{ 
              bgcolor: `${nodeColor}20`,
              color: nodeColor,
              fontWeight: 'bold',
              textTransform: 'capitalize'
            }}
          />
        </Box>

        {/* Description */}
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mb: 2 }}
          id={`node-description-${data.id}`}
        >
          {data.description}
        </Typography>

        {/* Expanded content */}
        {expanded && (
          <Box sx={{ mt: 2 }}>
            {/* Parameters */}
            {data.parameters && data.parameters.length > 0 && (
              <Accordion sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    Parameters ({data.parameters.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {data.parameters.slice(0, 5).map((param, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {param.name}
                              </Typography>
                              <Chip
                                label={param.type}
                                size="small"
                                variant="outlined"
                              />
                              {param.required && (
                                <Chip
                                  label="required"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={param.description}
                        />
                      </ListItem>
                    ))}
                    {data.parameters.length > 5 && (
                      <ListItem>
                        <ListItemText
                          secondary={`... and ${data.parameters.length - 5} more parameters`}
                        />
                      </ListItem>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Methods */}
            {data.methods && data.methods.length > 0 && (
              <Accordion sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    Methods ({data.methods.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {data.methods.slice(0, 3).map((method, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                              {method.name}
                            </Typography>
                          }
                          secondary={method.description}
                        />
                      </ListItem>
                    ))}
                    {data.methods.length > 3 && (
                      <ListItem>
                        <ListItemText
                          secondary={`... and ${data.methods.length - 3} more methods`}
                        />
                      </ListItem>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Path and importance */}
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {data.path}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  label={`${data.importance} importance`}
                  size="small"
                  color={
                    data.importance === 'high' ? 'error' :
                    data.importance === 'medium' ? 'warning' : 'default'
                  }
                  variant="outlined"
                />
                {data.connections && (
                  <Typography variant="caption" color="text.secondary">
                    {data.connections.length} connections
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AccessibleNodeComponent;