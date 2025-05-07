import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { useReactFlow, useNodesState, useEdgesState } from 'reactflow';
import {
  SystemNode,
  SystemEdge,
  DiagramConfig,
  FilterOptions,
  DiagramContextType,
} from '../types/diagram.types';
import { initialNodes, initialEdges } from '../data/initialData';
import { generateSystemLayout } from '../utils/layoutUtil';
import { exportToImage, exportToJson } from '../utils/exportUtil';

const initialConfig: DiagramConfig = {
  autoLayout: true,
  showLabels: true,
  theme: 'light',
  layoutAlgorithm: 'hierarchical',
};

const initialFilterOptions: FilterOptions = {
  nodeTypes: [
    'controller',
    'service',
    'model',
    'component',
    'hook',
    'redux',
    'context',
    'middleware',
    'route',
  ],
  searchTerm: '',
  showBackend: true,
  showFrontend: true,
};

export const DiagramContext = createContext<DiagramContextType | null>(null);

interface DiagramProviderProps {
  children: ReactNode;
}

export const DiagramProvider: React.FC<DiagramProviderProps> = ({ children }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<SystemNode['data']>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<SystemEdge['data']>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SystemEdge | null>(null);
  const [config, setConfig] = useState<DiagramConfig>(initialConfig);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(initialFilterOptions);
  const reactFlowInstance = useReactFlow();

  const applyFilters = useCallback(() => {
    const { nodeTypes, searchTerm, showBackend, showFrontend } = filterOptions;

    // Filter nodes based on type and search term
    const filteredNodes = initialNodes.filter(node => {
      // Apply node type filter
      if (!nodeTypes.includes(node.data.type)) return false;

      // Apply backend/frontend filter
      const isBackend =
        node.data.type === 'controller' ||
        node.data.type === 'service' ||
        node.data.type === 'model' ||
        node.data.type === 'middleware';

      if (isBackend && !showBackend) return false;
      if (!isBackend && !showFrontend) return false;

      // Apply search filter
      if (searchTerm && !node.data.label.toLowerCase().includes(searchTerm.toLowerCase())) {
        // Also check if any function contains the search term
        const hasFunctionMatch = node.data.functions?.some(
          fn =>
            fn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fn.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (!hasFunctionMatch) return false;
      }

      return true;
    });

    // Get filtered node IDs for edge filtering
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));

    // Filter edges that connect filtered nodes
    const filteredEdges = initialEdges.filter(
      edge => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );

    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [filterOptions, setNodes, setEdges]);

  // Apply layout when config changes
  useEffect(() => {
    if (config.autoLayout) {
      const { newNodes, newEdges } = generateSystemLayout(nodes, edges, config.layoutAlgorithm);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [config.autoLayout, config.layoutAlgorithm]);

  // Apply filters when filter options change
  useEffect(() => {
    applyFilters();
  }, [filterOptions, applyFilters]);

  const updateFilterOptions = useCallback((options: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({ ...prev, ...options }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<DiagramConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  const exportDiagram = useCallback(
    (format: 'png' | 'svg' | 'json') => {
      if (format === 'json') {
        exportToJson({ nodes, edges });
        return;
      }

      if (reactFlowInstance) {
        exportToImage(reactFlowInstance, format);
      }
    },
    [reactFlowInstance, nodes, edges]
  );

  const value: DiagramContextType = {
    diagramData: { nodes: initialNodes, edges: initialEdges },
    filteredData: { nodes, edges },
    selectedNode,
    selectedEdge,
    config,
    filterOptions,
    setSelectedNode,
    setSelectedEdge,
    updateFilterOptions,
    updateConfig,
    resetView,
    exportDiagram,
  };

  return <DiagramContext.Provider value={value}>{children}</DiagramContext.Provider>;
};

export const useDiagram = () => {
  const context = useContext(DiagramContext);
  if (!context) {
    throw new Error('useDiagram must be used within a DiagramProvider');
  }
  return context;
};
