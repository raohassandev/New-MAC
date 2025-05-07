import { SystemNode, SystemEdge } from '../types/diagram.types';
import { analyzeSystemArchitecture } from '../utils/codeAnalysis';

// Get initial nodes and edges from code analysis
const analysisResult = analyzeSystemArchitecture();

export const initialNodes: SystemNode[] = analysisResult.nodes;
export const initialEdges: SystemEdge[] = analysisResult.edges;
