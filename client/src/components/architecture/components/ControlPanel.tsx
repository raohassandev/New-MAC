import React from 'react';
import { useDiagram } from '../context/DiagramContext';
import { NodeType } from '../types/diagram.types';

const ControlPanel: React.FC = () => {
  const { config, updateConfig, filterOptions, updateFilterOptions, resetView, exportDiagram } =
    useDiagram();

  const nodeTypes: { label: string; value: NodeType }[] = [
    { label: 'Controllers', value: 'controller' },
    { label: 'Services', value: 'service' },
    { label: 'Models', value: 'model' },
    { label: 'Middleware', value: 'middleware' },
    { label: 'Components', value: 'component' },
    { label: 'Hooks', value: 'hook' },
    { label: 'Redux', value: 'redux' },
    { label: 'Context', value: 'context' },
    { label: 'Routes', value: 'route' },
  ];

  const handleNodeTypeToggle = (type: NodeType) => {
    const updatedNodeTypes = filterOptions.nodeTypes.includes(type)
      ? filterOptions.nodeTypes.filter(t => t !== type)
      : [...filterOptions.nodeTypes, type];

    updateFilterOptions({ nodeTypes: updatedNodeTypes });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilterOptions({ searchTerm: e.target.value });
  };

  const handleLayoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateConfig({
      layoutAlgorithm: e.target.value as 'hierarchical' | 'force-directed' | 'radial',
    });
  };

  const handleExport = (format: 'png' | 'svg' | 'json') => {
    exportDiagram(format);
  };

  return (
    <div
      className="control-panel"
      style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        marginBottom: '16px',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Search</h3>
        <input
          type="text"
          placeholder="Search components, functions..."
          value={filterOptions.searchTerm}
          onChange={handleSearchChange}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Filter By Type</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {nodeTypes.map(type => (
            <button
              key={type.value}
              onClick={() => handleNodeTypeToggle(type.value)}
              style={{
                padding: '6px 12px',
                backgroundColor: filterOptions.nodeTypes.includes(type.value)
                  ? '#e0f7fa'
                  : '#f5f5f5',
                border: `1px solid ${
                  filterOptions.nodeTypes.includes(type.value) ? '#80deea' : '#ddd'
                }`,
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                color: filterOptions.nodeTypes.includes(type.value) ? '#00838f' : '#555',
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>View Options</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            onClick={() => updateFilterOptions({ showBackend: !filterOptions.showBackend })}
            style={{
              padding: '8px 12px',
              backgroundColor: filterOptions.showBackend ? '#e8f5e9' : '#f5f5f5',
              border: `1px solid ${filterOptions.showBackend ? '#a5d6a7' : '#ddd'}`,
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {filterOptions.showBackend ? '✓ Backend' : 'Backend'}
          </button>
          <button
            onClick={() => updateFilterOptions({ showFrontend: !filterOptions.showFrontend })}
            style={{
              padding: '8px 12px',
              backgroundColor: filterOptions.showFrontend ? '#e8f5e9' : '#f5f5f5',
              border: `1px solid ${filterOptions.showFrontend ? '#a5d6a7' : '#ddd'}`,
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {filterOptions.showFrontend ? '✓ Frontend' : 'Frontend'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ marginRight: '10px', fontSize: '14px' }}>Layout:</label>
          <select
            value={config.layoutAlgorithm}
            onChange={handleLayoutChange}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              flex: 1,
            }}
          >
            <option value="hierarchical">Hierarchical</option>
            <option value="force-directed">Force Directed</option>
            <option value="radial">Radial</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: '10px', fontSize: '14px' }}>Theme:</label>
          <button
            onClick={() => updateConfig({ theme: config.theme === 'light' ? 'dark' : 'light' })}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {config.theme === 'light' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Actions</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={resetView}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            Reset View
          </button>
          <button
            onClick={() => updateConfig({ autoLayout: !config.autoLayout })}
            style={{
              padding: '8px 12px',
              backgroundColor: config.autoLayout ? '#e0f7fa' : '#f5f5f5',
              border: `1px solid ${config.autoLayout ? '#80deea' : '#ddd'}`,
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {config.autoLayout ? 'Auto Layout: On' : 'Auto Layout: Off'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleExport('png')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #90caf9',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            Export PNG
          </button>
          <button
            onClick={() => handleExport('svg')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #90caf9',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            Export SVG
          </button>
          <button
            onClick={() => handleExport('json')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #90caf9',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
