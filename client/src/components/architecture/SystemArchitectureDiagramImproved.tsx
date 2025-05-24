import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  useViewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterFocusStrongIcon,
} from '@mui/icons-material';

import AccessibleNodeComponent from './AccessibleNodeComponent';
import DetailedEdgeComponent from './components/DetailedEdgeComponent';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import HelpDialog from './HelpDialog';
import ResponsiveControls from './ResponsiveControls';
import { useArchitectureData } from './hooks/useArchitectureData';

// Custom node and edge types
const nodeTypes: NodeTypes = {
  detailedNode: AccessibleNodeComponent,
};

const edgeTypes: EdgeTypes = {
  detailedEdge: DetailedEdgeComponent,
};

// Main diagram component
const SystemArchitectureDiagramContent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const {
    nodes: filteredNodes,
    edges: filteredEdges,
    filters,
    viewState,
    isLoading,
    stats,
    actions: { updateFilters, updateViewState, resetFilters, resetView }
  } = useArchitectureData();

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const reactFlowInstance = useReactFlow();
  const diagramRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport();

  // Update nodes and edges when filtered data changes
  useEffect(() => {
    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [filteredNodes, filteredEdges, setNodes, setEdges]);

  // Update view state when viewport changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateViewState({
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
      });
    }, 500); // Debounce viewport updates

    return () => clearTimeout(timeoutId);
  }, [viewport, updateViewState]);

  // Handle fit view with accessibility focus management
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ 
      padding: 0.2,
      duration: 800,
    });
    setSnackbar({
      open: true,
      message: 'View fitted to show all components',
      severity: 'info'
    });
  }, [reactFlowInstance]);

  // Handle zoom controls with accessibility
  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 300 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 300 });
  }, [reactFlowInstance]);

  const handleCenterView = useCallback(() => {
    reactFlowInstance.setCenter(0, 0, { zoom: 1, duration: 500 });
    setSnackbar({
      open: true,
      message: 'View centered',
      severity: 'info'
    });
  }, [reactFlowInstance]);

  // Handle reset with comprehensive state clearing
  const handleReset = useCallback(() => {
    resetFilters();
    resetView();
    setTimeout(() => {
      handleFitView();
    }, 100);
    setSnackbar({
      open: true,
      message: 'Diagram reset to default state',
      severity: 'success'
    });
  }, [resetFilters, resetView, handleFitView]);

  // Enhanced export functionality
  const handleExport = useCallback(async () => {
    try {
      if (!diagramRef.current) {
        throw new Error('Diagram reference not found');
      }

      // Use html-to-image for better export quality
      const { toPng } = await import('html-to-image');
      
      const dataUrl = await toPng(diagramRef.current, {
        backgroundColor: theme.palette.background.paper,
        quality: 1.0,
        pixelRatio: 2, // Higher resolution
        filter: (node) => {
          // Remove controls and other UI elements from export
          const className = node.className || '';
          return !className.includes('react-flow__controls') &&
                 !className.includes('react-flow__minimap') &&
                 !className.includes('react-flow__panel');
        }
      });

      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `system-architecture-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({
        open: true,
        message: 'Diagram exported successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Export failed:', error);
      setSnackbar({
        open: true,
        message: 'Export failed. Please try again.',
        severity: 'error'
      });
    }
  }, [theme.palette.background.paper]);

  // Handle help dialog
  const handleHelp = useCallback(() => {
    setHelpDialogOpen(true);
  }, []);

  // Handle snackbar close
  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Only handle if no input element is focused
      if (document.activeElement?.tagName.toLowerCase() === 'input') return;

      switch (event.key) {
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleReset();
          }
          break;
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleFitView();
          }
          break;
        case '?':
          if (event.shiftKey) {
            event.preventDefault();
            handleHelp();
          }
          break;
        case 'Escape':
          if (helpDialogOpen) {
            setHelpDialogOpen(false);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [handleReset, handleFitView, handleHelp, helpDialogOpen]);

  if (isLoading) {
    return <LoadingSpinner variant="skeleton" height="calc(100vh - 200px)" />;
  }

  return (
    <Box sx={{ height: '100vh', width: '100%' }}>
      {/* Responsive controls */}
      <Paper sx={{ p: isMobile ? 1 : 2, mb: 1 }}>
        <ResponsiveControls
          filters={filters}
          onFiltersChange={updateFilters}
          onReset={handleReset}
          onFitView={handleFitView}
          onExport={handleExport}
          onHelp={handleHelp}
          stats={stats}
        />
      </Paper>

      {/* Main diagram area */}
      <Box 
        sx={{ 
          height: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 180px)', 
          width: '100%',
          position: 'relative'
        }} 
        ref={diagramRef}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={3}
          defaultViewport={viewState}
          selectNodesOnDrag={false}
          // Accessibility improvements
          aria-label="System Architecture Diagram"
          role="img"
        >
          <Background 
            gap={20} 
            size={1}
            color={theme.palette.mode === 'dark' ? '#333' : '#ccc'}
          />
          
          <Controls 
            position="bottom-left"
            showZoom={!isMobile}
            showFitView={!isMobile}
            showInteractive={!isMobile}
          />
          
          {/* Custom zoom controls for better accessibility */}
          <Panel position="top-right">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Tooltip title="Zoom In (+ key)">
                <IconButton 
                  onClick={handleZoomIn}
                  size="small"
                  sx={{ 
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  aria-label="Zoom in"
                >
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Zoom Out (- key)">
                <IconButton 
                  onClick={handleZoomOut}
                  size="small"
                  sx={{ 
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  aria-label="Zoom out"
                >
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Center View">
                <IconButton 
                  onClick={handleCenterView}
                  size="small"
                  sx={{ 
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  aria-label="Center view"
                >
                  <CenterFocusStrongIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Panel>

          {/* Enhanced minimap with better colors */}
          {!isMobile && (
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              position="bottom-right"
              style={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
              }}
              nodeColor={(node) => {
                const colors = {
                  model: theme.palette.success.main,
                  controller: theme.palette.primary.main,
                  service: theme.palette.warning.main,
                  middleware: theme.palette.secondary.main,
                  route: theme.palette.info.main,
                  database: theme.palette.error.main,
                };
                return colors[node.data.type as keyof typeof colors] || theme.palette.grey[500];
              }}
              maskColor={theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
            />
          )}
        </ReactFlow>
      </Box>

      {/* Help dialog */}
      <HelpDialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
      />

      {/* Snackbar for user feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Wrapper component with error boundary and ReactFlow provider
const SystemArchitectureDiagramImproved: React.FC = () => {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <SystemArchitectureDiagramContent />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default SystemArchitectureDiagramImproved;