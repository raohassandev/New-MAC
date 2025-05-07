import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import { DiagramProvider } from './context/DiagramContext';
import DiagramView from './DiagramView';

const ArchitectureDiagram: React.FC = () => {
  return (
    <ReactFlowProvider>
      <DiagramProvider>
        <DiagramView />
      </DiagramProvider>
    </ReactFlowProvider>
  );
};

export default ArchitectureDiagram;
