import { Node, Edge, Position } from 'reactflow';

export type NodeType = 
  | 'controller' 
  | 'service' 
  | 'model' 
  | 'middleware' 
  | 'component' 
  | 'hook' 
  | 'redux' 
  | 'context' 
  | 'route';

export interface SystemNode extends Node {
  data: {
    label: string;
    type: NodeType;
    description?: string;
    filePath?: string;
    functions?: FunctionData[];
    dependencies?: string[];
    expanded?: boolean;
  };
}

export interface SystemEdge extends Edge {
  data?: {
    type: 'call' | 'data' | 'event' | 'depend';
    description?: string;
  };
}

export interface FunctionData {
  name: string;
  signature: string;
  description: string;
  returnType?: string;
}

export interface DiagramData {
  nodes: SystemNode[];
  edges: SystemEdge[];
}

export interface NodePositionConfig {
  x: number;
  y: number;
  type: NodeType;
}

export interface LayoutConfig {
  [key: string]: {
    position: Position;
    nodes: NodePositionConfig[];
  };
}

export interface FilterOptions {
  nodeTypes: NodeType[];
  searchTerm: string;
  showBackend: boolean;
  showFrontend: boolean;
}

export interface DiagramConfig {
  autoLayout: boolean;
  showLabels: boolean;
  theme: 'light' | 'dark';
  layoutAlgorithm: 'hierarchical' | 'force-directed' | 'radial';
}

export interface DiagramContextType {
  diagramData: DiagramData;
  filteredData: DiagramData;
  selectedNode: SystemNode | null;
  selectedEdge: SystemEdge | null;
  config: DiagramConfig;
  filterOptions: FilterOptions;
  setSelectedNode: (node: SystemNode | null) => void;
  setSelectedEdge: (edge: SystemEdge | null) => void;
  updateFilterOptions: (options: Partial<FilterOptions>) => void;
  updateConfig: (config: Partial<DiagramConfig>) => void;
  resetView: () => void;
  exportDiagram: (format: 'png' | 'svg' | 'json') => void;
}