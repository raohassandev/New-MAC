import React from 'react';
import { useDiagram } from '../context/DiagramContext';

const DetailPanel: React.FC = () => {
  const { selectedNode, selectedEdge, setSelectedNode, setSelectedEdge } = useDiagram();
  
  // If nothing is selected, show empty state
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="detail-panel" style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        fontSize: '14px'
      }}>
        Select a node or edge to view details
      </div>
    );
  }
  
  // Render node details
  if (selectedNode) {
    return (
      <div className="detail-panel" style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>
            {selectedNode.data.label}
            <span style={{ 
              fontSize: '12px',
              backgroundColor: '#f0f0f0',
              color: '#555',
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: '8px',
              verticalAlign: 'middle',
              textTransform: 'uppercase'
            }}>
              {selectedNode.data.type}
            </span>
          </h2>
          <button 
            onClick={() => setSelectedNode(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            &times;
          </button>
        </div>
        
        {selectedNode.data.filePath && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#555', marginBottom: '4px' }}>File Path</h3>
            <div style={{ 
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {selectedNode.data.filePath}
            </div>
          </div>
        )}
        
        {selectedNode.data.description && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#555', marginBottom: '4px' }}>Description</h3>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {selectedNode.data.description}
            </p>
          </div>
        )}
        
        {selectedNode.data.functions && selectedNode.data.functions.length > 0 && (
          <div>
            <h3 style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>Functions</h3>
            <div>
              {selectedNode.data.functions.map((fn, index) => (
                <div 
                  key={index} 
                  style={{ 
                    marginBottom: '12px',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #eee'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{fn.name}</div>
                  <div style={{ 
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    backgroundColor: '#f0f0f0',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    color: '#444',
                    overflowX: 'auto'
                  }}>
                    {fn.signature}
                  </div>
                  <div style={{ fontSize: '13px', color: '#555' }}>{fn.description}</div>
                  {fn.returnType && (
                    <div style={{ 
                      fontSize: '12px',
                      color: '#0066cc',
                      marginTop: '4px'
                    }}>
                      Returns: {fn.returnType}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {selectedNode.data.dependencies && selectedNode.data.dependencies.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>Dependencies</h3>
            <ul style={{ 
              margin: 0,
              padding: '0 0 0 20px',
              fontSize: '14px'
            }}>
              {selectedNode.data.dependencies.map((dep, index) => (
                <li key={index}>{dep}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  
  // Render edge details
  if (selectedEdge) {
    return (
      <div className="detail-panel" style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Relationship Details</h2>
          <button 
            onClick={() => setSelectedEdge(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            &times;
          </button>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', color: '#555', marginBottom: '4px' }}>Connection</h3>
          <div style={{ fontSize: '14px' }}>
            <strong>{selectedEdge.source}</strong> → <strong>{selectedEdge.target}</strong>
          </div>
        </div>
        
        {selectedEdge.data?.type && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#555', marginBottom: '4px' }}>Type</h3>
            <div style={{ 
              display: 'inline-block',
              padding: '4px 8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '13px',
              textTransform: 'capitalize'
            }}>
              {selectedEdge.data.type}
            </div>
          </div>
        )}
        
        {selectedEdge.data?.description && (
          <div>
            <h3 style={{ fontSize: '14px', color: '#555', marginBottom: '4px' }}>Description</h3>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {selectedEdge.data.description}
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return null;
};

export default DetailPanel;