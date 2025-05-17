import { ReactFlowInstance } from 'reactflow';
import { toPng, toSvg } from 'html-to-image';
import { DiagramData } from '../types/diagram.types';

// Export the diagram as an image
export const exportToImage = async (
  reactFlowInstance: ReactFlowInstance,
  format: 'png' | 'svg'
): Promise<void> => {
  const reactFlowElem = document.querySelector<HTMLElement>('.react-flow');

  if (!reactFlowElem) {
    console.error('React Flow container not found');
    return;
  }

  // Prepare the element
  const viewport = reactFlowInstance.getViewport();
  reactFlowInstance.fitView({ padding: 0.2 });

  try {
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `architecture-diagram-${timestamp}.${format}`;

    // Create and trigger download
    let dataUrl;
    if (format === 'png') {
      dataUrl = await toPng(reactFlowElem, {
        backgroundColor: '#ffffff',
        quality: 1,
        pixelRatio: 2,
      });
    } else {
      dataUrl = await toSvg(reactFlowElem, {
        backgroundColor: '#ffffff',
        quality: 1,
      });
    }

    // Create download link and trigger click
    const a = document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', dataUrl);
    a.click();

    // Reset view transform after download
    reactFlowInstance.setViewport(viewport);
  } catch (error) {
    console.error('Error exporting diagram:', error);
  }
};

// Export the diagram data as JSON
export const exportToJson = (data: DiagramData): void => {
  try {
    // Convert diagram data to JSON string
    const jsonData = JSON.stringify(data, null, 2);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `architecture-diagram-${timestamp}.json`;

    // Create Blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link and trigger click
    const a = document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', url);
    a.click();

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting diagram data:', error);
  }
};

// Import diagram data from JSON
export const importFromJson = (file: File): Promise<DiagramData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        if (event.target?.result) {
          const data = JSON.parse(event.target.result as string) as DiagramData;
          resolve(data);
        } else {
          reject(new Error('Empty file content'));
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsText(file);
  });
};
