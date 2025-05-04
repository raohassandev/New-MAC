import React, { useState } from 'react';
import { Card } from './Card';

interface XmlViewerProps {
  xmlContent: string;
  title?: string;
  expandAll?: boolean;
}

const XmlViewer: React.FC<XmlViewerProps> = ({ 
  xmlContent, 
  title = 'XML Viewer', 
  expandAll = false 
}) => {
  // Parse XML string to DOM
  const parseXml = (xmlStr: string) => {
    const parser = new DOMParser();
    return parser.parseFromString(xmlStr, 'text/xml');
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpanded(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Generate unique ID for a node
  const getNodeId = (path: string, index: number) => `node-${path}-${index}`;

  // Render XML node recursively
  const renderNode = (node: Element, path = '', level = 0): JSX.Element => {
    const nodeId = getNodeId(path, level);
    const isExpanded = expanded[nodeId] ?? expandAll;
    const hasChildren = node.children.length > 0;
    const attributes = Array.from(node.attributes);
    
    return (
      <div key={nodeId} className="ml-4">
        <div 
          className="flex items-center cursor-pointer text-sm py-1"
          onClick={() => hasChildren && toggleNode(nodeId)}
        >
          {hasChildren && (
            <span className="mr-2">{isExpanded ? '▼' : '►'}</span>
          )}
          <span className="font-medium text-blue-600">&lt;{node.nodeName}</span>
          {attributes.length > 0 && (
            <span className="text-green-600">
              {attributes.map(attr => (
                <span key={attr.name} className="ml-1">
                  {attr.name}="{attr.value}"
                </span>
              ))}
            </span>
          )}
          {!hasChildren ? (
            <span className="text-blue-600">/&gt;</span>
          ) : (
            <span className="text-blue-600">&gt;</span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {Array.from(node.children).map((child, index) => 
              renderNode(child as Element, `${path}-${node.nodeName}`, index)
            )}
            <div className="text-sm text-blue-600 py-1">
              &lt;/{node.nodeName}&gt;
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main render
  try {
    const xmlDoc = parseXml(xmlContent);
    
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      return (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-medium">{title}</h3>
            <div className="mt-2 p-4 bg-red-50 text-red-700 rounded">
              Invalid XML: Could not parse the provided XML string
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card>
        <div className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{title}</h3>
            <button
              onClick={() => setExpanded(expandAll ? {} : { root: true })}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
          <div className="mt-4 font-mono text-sm overflow-x-auto border rounded bg-gray-50 p-4">
            <div className="text-blue-600">&lt;?xml version="1.0" encoding="UTF-8"?&gt;</div>
            {renderNode(xmlDoc.documentElement, 'root', 0)}
          </div>
        </div>
      </Card>
    );
  } catch (error) {
    return (
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <div className="mt-2 p-4 bg-red-50 text-red-700 rounded">
            Error: {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </Card>
    );
  }
};

export default XmlViewer;