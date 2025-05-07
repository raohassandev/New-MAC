import { SystemNode, SystemEdge, NodeType } from '../types/diagram.types';
import dagre from 'dagre';

interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'RL' | 'BT';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

// Layout configuration for each algorithm
const layoutConfigs = {
  hierarchical: {
    direction: 'TB',
    nodeWidth: 280,
    nodeHeight: 120,
    rankSep: 180,
    nodeSep: 100,
  },
  'force-directed': {
    direction: 'LR',
    nodeWidth: 280,
    nodeHeight: 120,
    rankSep: 300,
    nodeSep: 150,
  },
  radial: {
    // For radial, we'll adjust positioning after basic layout
    direction: 'TB',
    nodeWidth: 280,
    nodeHeight: 120,
    rankSep: 250,
    nodeSep: 150,
  },
};

// Define vertical layers based on node types
const nodeTypeLayers: Record<NodeType, number> = {
  model: 0,
  controller: 1,
  service: 2,
  middleware: 3,
  component: 4,
  hook: 5,
  redux: 6,
  context: 7,
  route: 8,
};

// Generate layer-based hierarchical layout
export function generateSystemLayout(
  nodes: SystemNode[],
  edges: SystemEdge[],
  algorithm = 'hierarchical'
): { newNodes: SystemNode[]; newEdges: SystemEdge[] } {
  if (nodes.length === 0) {
    return { newNodes: [], newEdges: [] };
  }

  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph();

  // Default config
  const config =
    layoutConfigs[algorithm as keyof typeof layoutConfigs] || layoutConfigs.hierarchical;

  dagreGraph.setGraph({
    rankdir: config.direction,
    nodesep: config.nodeSep,
    ranksep: config.rankSep,
    ranker: 'network-simplex',
  });

  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, {
      width: config.nodeWidth,
      height: config.nodeHeight,
    });
  });

  // Add edges to dagre
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply layout
  dagre.layout(dagreGraph);

  // Get positioned nodes and edges
  const newNodes = nodes.map(node => {
    const dagreNode = dagreGraph.node(node.id);

    let position = {
      x: dagreNode.x - config.nodeWidth / 2,
      y: dagreNode.y - config.nodeHeight / 2,
    };

    // For radial layout, we adjust positions after dagre
    if (algorithm === 'radial') {
      position = getRadialPosition(nodes, node, dagreNode);
    }

    return {
      ...node,
      position,
    };
  });

  // Apply curved edges in radial layout
  const newEdges = edges.map(edge => {
    const updatedEdge = { ...edge };

    if (algorithm === 'force-directed' || algorithm === 'radial') {
      updatedEdge.type = 'smoothstep';
    } else {
      updatedEdge.type = 'step';
    }

    return updatedEdge;
  });

  return { newNodes, newEdges };
}

// Helper for radial layout position
function getRadialPosition(
  nodes: SystemNode[],
  node: SystemNode,
  dagreNode: { x: number; y: number }
): { x: number; y: number } {
  const centerX = 1000;
  const centerY = 1000;
  const radius = 500;

  // Group nodes by type
  const nodeTypeGroups: Record<NodeType, SystemNode[]> = {} as Record<NodeType, SystemNode[]>;

  nodes.forEach(n => {
    if (!nodeTypeGroups[n.data.type]) {
      nodeTypeGroups[n.data.type] = [];
    }
    nodeTypeGroups[n.data.type].push(n);
  });

  // Calculate position based on node type and index within type
  const nodeType = node.data.type;
  const typeIndex = nodeTypeGroups[nodeType].findIndex(n => n.id === node.id);
  const typeTotalCount = nodeTypeGroups[nodeType].length;

  // Get the angle for this node type (distribute types around the circle)
  const typeCount = Object.keys(nodeTypeGroups).length;
  const typeAngleSpan = (2 * Math.PI) / typeCount;
  const typeBaseAngle = Object.keys(nodeTypeGroups).indexOf(nodeType) * typeAngleSpan;

  // Distribute nodes of same type in a cluster
  const nodeAngle =
    typeBaseAngle + (typeIndex / Math.max(1, typeTotalCount - 1)) * (typeAngleSpan * 0.8);

  // Calculate position
  const x = centerX + Math.cos(nodeAngle) * radius - 140;
  const y = centerY + Math.sin(nodeAngle) * radius - 60;

  return { x, y };
}

// Layer-based positioning helper
export function layerBasedLayout(
  nodes: SystemNode[],
  edges: SystemEdge[]
): { newNodes: SystemNode[]; newEdges: SystemEdge[] } {
  // Group nodes by type
  const nodesByType: Record<string, SystemNode[]> = {};

  nodes.forEach(node => {
    if (!nodesByType[node.data.type]) {
      nodesByType[node.data.type] = [];
    }
    nodesByType[node.data.type].push(node);
  });

  const newNodes = nodes.map(node => {
    const layer = nodeTypeLayers[node.data.type];
    const typeGroup = nodesByType[node.data.type];
    const index = typeGroup.findIndex(n => n.id === node.id);
    const count = typeGroup.length;

    // Calculate position
    const x = 200 + (index / count) * 1200; // Distribute horizontally
    const y = layer * 200; // Each layer 200px apart

    return {
      ...node,
      position: { x, y },
    };
  });

  return { newNodes, edges };
}
