import { useState, useEffect, useMemo, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { DetailedNodeData } from '../components/DetailedNodeComponent';
import { DetailedEdgeData } from '../components/DetailedEdgeComponent';

// Local storage keys for persistence
const STORAGE_KEYS = {
  FILTERS: 'architecture_filters',
  SEARCH: 'architecture_search',
  VIEW_STATE: 'architecture_view_state',
  ZOOM: 'architecture_zoom',
};

interface ArchitectureFilters {
  showTypes: { [key: string]: boolean };
  showBackend: boolean;
  showFrontend: boolean;
  searchTerm: string;
}

interface ViewState {
  x: number;
  y: number;
  zoom: number;
}

interface UseArchitectureDataReturn {
  nodes: Node<DetailedNodeData>[];
  edges: Edge<DetailedEdgeData>[];
  filters: ArchitectureFilters;
  viewState: ViewState;
  isLoading: boolean;
  stats: {
    totalNodes: number;
    visibleNodes: number;
    totalEdges: number;
    visibleEdges: number;
  };
  actions: {
    updateFilters: (filters: Partial<ArchitectureFilters>) => void;
    updateViewState: (state: Partial<ViewState>) => void;
    resetFilters: () => void;
    resetView: () => void;
  };
}

// Optimized node generation with memoization
const generateOptimizedNodeData = (): DetailedNodeData[] => {
  // This would ideally fetch from an API, but for now we'll use the existing static data
  // with performance optimizations
  return [
    // Backend Models
    {
      id: 'device-model',
      label: 'Device Model',
      type: 'model',
      description: 'Represents a physical Modbus device with connection details and data points',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Device name' },
        { name: 'make', type: 'string', description: 'Device manufacturer' },
        { name: 'model', type: 'string', description: 'Device model number' },
        { name: 'enabled', type: 'boolean', description: 'Whether the device is enabled for polling', defaultValue: true },
        { name: 'connectionSetting', type: 'object', description: 'Modbus connection settings' },
        { name: 'dataPoints', type: 'array', description: 'Array of data points to read from the device' },
        { name: 'pollingInterval', type: 'number', description: 'Interval in milliseconds to poll the device', defaultValue: 30000 },
        { name: 'deviceDriverId', type: 'string', description: 'Reference to a device driver configuration' },
      ],
      methods: [
        { name: 'pre(save)', description: 'Updates timestamps before saving', returnType: 'void' },
        { name: 'createDeviceModel', description: 'Creates a Device model with a specific connection', 
          parameters: [{ name: 'connection', type: 'mongoose.Connection', required: true }], returnType: 'Model<IDevice>' },
      ],
      connections: [
        { targetId: 'device-controller', targetName: 'DeviceController', type: 'data', description: 'Device data is managed by DeviceController' },
        { targetId: 'data-polling-service', targetName: 'DataPollingService', type: 'data', description: 'Device data is polled by DataPollingService' },
        { targetId: 'mongodb', targetName: 'MongoDB', type: 'database', description: 'Device data is stored in MongoDB' },
      ],
      path: '/server/src/client/models/Device.ts',
      importance: 'high',
      modifiable: true,
    },
    {
      id: 'historical-data-model',
      label: 'Historical Data Model',
      type: 'model',
      description: 'Stores historical readings from devices',
      parameters: [
        { name: 'deviceId', type: 'ObjectId', required: true, description: 'Reference to the device' },
        { name: 'parameterName', type: 'string', required: true, description: 'Name of the parameter' },
        { name: 'value', type: 'any', required: true, description: 'Value of the parameter' },
        { name: 'timestamp', type: 'Date', required: true, description: 'When the reading was taken' },
        { name: 'quality', type: 'string', description: 'Quality of the reading (good, bad, uncertain)' },
      ],
      connections: [
        { targetId: 'device-model', targetName: 'Device Model', type: 'data', description: 'References Device model' },
        { targetId: 'data-polling-service', targetName: 'Data Polling Service', type: 'data', description: 'Created by Data Polling Service' },
        { targetId: 'mongodb', targetName: 'MongoDB', type: 'database', description: 'Stored in MongoDB' },
      ],
      path: '/server/src/client/models/HistoricalData.ts',
      importance: 'medium',
      modifiable: true,
    },
    {
      id: 'user-model',
      label: 'User Model',
      type: 'model',
      description: 'Represents a user account',
      parameters: [
        { name: 'username', type: 'string', required: true, description: 'User login name' },
        { name: 'email', type: 'string', required: true, description: 'User email address' },
        { name: 'password', type: 'string', required: true, description: 'Hashed password' },
        { name: 'role', type: 'string', required: true, description: 'User role (admin, engineer, viewer)' },
      ],
      connections: [
        { targetId: 'auth-controller', targetName: 'Auth Controller', type: 'data', description: 'Managed by Auth Controller' },
        { targetId: 'mongodb', targetName: 'MongoDB', type: 'database', description: 'Stored in MongoDB' },
      ],
      path: '/server/src/client/models/User.ts',
      importance: 'medium',
      modifiable: true,
    },
    // Backend Controllers
    {
      id: 'device-controller',
      label: 'Device Controller',
      type: 'controller',
      description: 'Handles CRUD operations and device interactions through the API',
      methods: [
        { name: 'getDevices', description: 'Get all devices with pagination and filtering', 
          parameters: [{ name: 'req', type: 'AuthRequest', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
        { name: 'getDeviceById', description: 'Get a single device by ID', 
          parameters: [{ name: 'req', type: 'AuthRequest', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
        { name: 'createDevice', description: 'Create a new device', 
          parameters: [{ name: 'req', type: 'AuthRequest', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
        { name: 'updateDevice', description: 'Update an existing device', 
          parameters: [{ name: 'req', type: 'AuthRequest', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
        { name: 'deleteDevice', description: 'Delete a device', 
          parameters: [{ name: 'req', type: 'AuthRequest', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
        { name: 'testDeviceConnection', description: 'Test connection to a device', 
          parameters: [{ name: 'req', type: 'AuthRequest', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
        { name: 'readDeviceRegisters', description: 'Read registers from a device', 
          parameters: [{ name: 'req', type: 'AuthRequest', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
      ],
      connections: [
        { targetId: 'device-model', targetName: 'Device Model', type: 'data', description: 'Creates and manages Device models' },
        { targetId: 'modbus-client', targetName: 'Modbus Client', type: 'api', description: 'Uses Modbus client for device communication' },
        { targetId: 'device-routes', targetName: 'Device Routes', type: 'api', description: 'Exposed through API routes' },
        { targetId: 'auth-middleware', targetName: 'Auth Middleware', type: 'middleware', description: 'Access controlled by authentication middleware' },
      ],
      path: '/server/src/client/controllers/deviceController.ts',
      importance: 'high',
      modifiable: true,
    },
    {
      id: 'auth-controller',
      label: 'Auth Controller',
      type: 'controller',
      description: 'Handles user authentication and authorization',
      methods: [
        { name: 'login', description: 'Authenticate a user and return a JWT token', 
          parameters: [{ name: 'req', type: 'Request', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
        { name: 'register', description: 'Register a new user', 
          parameters: [{ name: 'req', type: 'Request', required: true }, { name: 'res', type: 'Response', required: true }], returnType: 'Promise<void>' },
      ],
      connections: [
        { targetId: 'user-model', targetName: 'User Model', type: 'data', description: 'Creates and manages User models' },
        { targetId: 'auth-routes', targetName: 'Auth Routes', type: 'api', description: 'Exposed through API routes' },
      ],
      path: '/server/src/client/controllers/authController.ts',
      importance: 'medium',
      modifiable: true,
    },
    // Backend Services
    {
      id: 'data-polling-service',
      label: 'Data Polling Service',
      type: 'service',
      description: 'Periodically reads data from devices via Modbus and stores it in the database',
      methods: [
        { name: 'pollDevice', description: 'Poll a specific device for data', 
          parameters: [{ name: 'deviceId', type: 'string', required: true }], returnType: 'Promise<DeviceReading | null>' },
        { name: 'getRealtimeData', description: 'Get the latest data for a device from cache', 
          parameters: [{ name: 'deviceId', type: 'string', required: true }], returnType: 'DeviceReading | null' },
        { name: 'startPollingDevice', description: 'Start polling a device at a specific interval', 
          parameters: [{ name: 'deviceId', type: 'string', required: true }, { name: 'intervalMs', type: 'number', defaultValue: 10000 }], returnType: 'NodeJS.Timeout' },
        { name: 'stopPollingDevice', description: 'Stop polling a device', 
          parameters: [{ name: 'deviceId', type: 'string', required: true }], returnType: 'void' },
      ],
      connections: [
        { targetId: 'device-model', targetName: 'Device Model', type: 'data', description: 'Reads Device configuration' },
        { targetId: 'modbus-client', targetName: 'Modbus Client', type: 'api', description: 'Uses Modbus client for device communication' },
        { targetId: 'historical-data-model', targetName: 'Historical Data Model', type: 'database', description: 'Stores historical readings in the database' },
        { targetId: 'device-initializer', targetName: 'Device Initializer', type: 'event', description: 'Started by Device Initializer service' },
      ],
      path: '/server/src/client/services/dataPollingService.ts',
      importance: 'high',
      modifiable: true,
    },
    {
      id: 'device-initializer',
      label: 'Device Initializer',
      type: 'service',
      description: 'Initializes device polling on system startup',
      methods: [
        { name: 'initializeDevicePolling', description: 'Set up automatic polling for all enabled devices', 
          parameters: [{ name: 'pollingInterval', type: 'number', defaultValue: 30000 }, { name: 'developerMode', type: 'boolean', defaultValue: false }], returnType: 'Promise<void>' },
      ],
      connections: [
        { targetId: 'device-model', targetName: 'Device Model', type: 'data', description: 'Loads Device configurations' },
        { targetId: 'data-polling-service', targetName: 'Data Polling Service', type: 'api', description: 'Starts Data Polling Service for each device' },
      ],
      path: '/server/src/client/services/deviceInitializer.ts',
      importance: 'medium',
      modifiable: true,
    },
    {
      id: 'modbus-client',
      label: 'Modbus TCP Client',
      type: 'service',
      description: 'Handles communication with Modbus devices over TCP',
      parameters: [
        { name: 'host', type: 'string', required: true, description: 'IP address of the Modbus server' },
        { name: 'port', type: 'number', description: 'TCP port, default is 502', defaultValue: 502 },
        { name: 'unitId', type: 'number', description: 'Modbus unit/slave ID', defaultValue: 1 },
        { name: 'connectionOptions', type: 'object', description: 'Advanced connection options' },
      ],
      methods: [
        { name: 'connect', description: 'Connect to the Modbus TCP server', 
          parameters: [{ name: 'options', type: 'ConnectionOptions', required: false }], returnType: 'Promise<void>' },
        { name: 'disconnect', description: 'Disconnect from the Modbus TCP server', returnType: 'Promise<void>' },
        { name: 'readParameter', description: 'Read a single parameter', 
          parameters: [{ name: 'parameter', type: 'Parameter', required: true }], returnType: 'Promise<RequestResult>' },
        { name: 'readParameters', description: 'Read multiple parameters', 
          parameters: [{ name: 'parameters', type: 'Parameter[]', required: true }], returnType: 'Promise<RequestResult[]>' },
        { name: 'writeParameter', description: 'Write a value to a parameter', 
          parameters: [{ name: 'parameter', type: 'Parameter', required: true }, { name: 'value', type: 'any', required: true }], returnType: 'Promise<RequestResult>' },
      ],
      connections: [
        { targetId: 'modbus-connection', targetName: 'Modbus TCP Connection', type: 'api', description: 'Uses TCP connection for transport' },
        { targetId: 'data-polling-service', targetName: 'Data Polling Service', type: 'api', description: 'Used by Data Polling Service' },
        { targetId: 'device-controller', targetName: 'Device Controller', type: 'api', description: 'Used by Device Controller' },
      ],
      path: '/server/src/communication/protocols/modbus/tcp/client.ts',
      importance: 'medium',
      modifiable: true,
    },
    {
      id: 'modbus-connection',
      label: 'Modbus TCP Connection',
      type: 'service',
      description: 'Handles low-level TCP communication with Modbus devices',
      methods: [
        { name: 'connect', description: 'Connect to a Modbus TCP server', returnType: 'Promise<void>' },
        { name: 'disconnect', description: 'Disconnect from a Modbus TCP server', returnType: 'Promise<void>' },
        { name: 'sendRequest', description: 'Send a Modbus PDU request and get a response', 
          parameters: [{ name: 'pdu', type: 'Buffer', required: true }, { name: 'unitId', type: 'number', required: true }], returnType: 'Promise<Buffer>' },
      ],
      connections: [
        { targetId: 'modbus-client', targetName: 'Modbus TCP Client', type: 'api', description: 'Used by Modbus TCP Client' },
      ],
      path: '/server/src/communication/protocols/modbus/tcp/connection.ts',
      importance: 'low',
      modifiable: true,
    },
    // Middleware
    {
      id: 'auth-middleware',
      label: 'Auth Middleware',
      type: 'middleware',
      description: 'Validates JWT tokens and authorizes API requests',
      methods: [
        { name: 'protect', description: 'Middleware to protect routes with JWT authentication', 
          parameters: [{ name: 'req', type: 'Request', required: true }, { name: 'res', type: 'Response', required: true }, { name: 'next', type: 'NextFunction', required: true }], returnType: 'Promise<void>' },
        { name: 'authorize', description: 'Middleware to limit access based on user roles', 
          parameters: [{ name: 'roles', type: 'string[]', required: true }], returnType: 'Function' },
      ],
      connections: [
        { targetId: 'user-model', targetName: 'User Model', type: 'data', description: 'Verifies User credentials' },
        { targetId: 'device-routes', targetName: 'Device Routes', type: 'middleware', description: 'Applied to Device Routes' },
        { targetId: 'auth-routes', targetName: 'Auth Routes', type: 'middleware', description: 'Applied to Auth Routes' },
      ],
      path: '/server/src/middleware/authMiddleware.ts',
      importance: 'medium',
      modifiable: true,
    },
    // Routes
    {
      id: 'device-routes',
      label: 'Device Routes',
      type: 'route',
      description: 'API routes for device management',
      methods: [
        { name: 'GET /api/devices', description: 'Get all devices' },
        { name: 'GET /api/devices/:id', description: 'Get device by ID' },
        { name: 'POST /api/devices', description: 'Create a new device' },
        { name: 'PUT /api/devices/:id', description: 'Update a device' },
        { name: 'DELETE /api/devices/:id', description: 'Delete a device' },
        { name: 'POST /api/devices/:id/test', description: 'Test connection to a device' },
        { name: 'GET /api/devices/:id/read', description: 'Read registers from a device' },
      ],
      connections: [
        { targetId: 'device-controller', targetName: 'Device Controller', type: 'api', description: 'Routes to Device Controller methods' },
        { targetId: 'auth-middleware', targetName: 'Auth Middleware', type: 'middleware', description: 'Protected by Auth Middleware' },
      ],
      path: '/server/src/client/routes/deviceRoutes.ts',
      importance: 'medium',
      modifiable: true,
    },
    {
      id: 'auth-routes',
      label: 'Auth Routes',
      type: 'route',
      description: 'API routes for authentication',
      methods: [
        { name: 'POST /api/auth/login', description: 'Login a user' },
        { name: 'POST /api/auth/register', description: 'Register a new user' },
        { name: 'GET /api/auth/profile', description: 'Get user profile' },
      ],
      connections: [
        { targetId: 'auth-controller', targetName: 'Auth Controller', type: 'api', description: 'Routes to Auth Controller methods' },
        { targetId: 'auth-middleware', targetName: 'Auth Middleware', type: 'middleware', description: 'Some routes protected by Auth Middleware' },
      ],
      path: '/server/src/client/routes/authRoutes.ts',
      importance: 'medium',
      modifiable: true,
    },
    // External Systems
    {
      id: 'mongodb',
      label: 'MongoDB',
      type: 'database',
      description: 'NoSQL database for storing device data',
      connections: [],
      path: 'External',
      importance: 'high',
      modifiable: false,
    },
  ];
};

// Layout nodes in a hierarchical manner with performance optimizations
const layoutNodes = (nodes: DetailedNodeData[]): Node<DetailedNodeData>[] => {
  const layers: { [key: string]: number } = {
    route: 0,
    middleware: 1,
    controller: 2,
    service: 3,
    model: 4,
    database: 5,
  };

  const positions: { [key: number]: number } = {};

  return nodes.map(node => {
    const layer = layers[node.type] || 0;
    positions[layer] = positions[layer] || 0;

    const x = positions[layer] * 350;
    const y = layer * 250;

    positions[layer]++;

    return {
      id: node.id,
      position: { x, y },
      data: node,
      type: 'detailedNode',
    };
  });
};

// Generate edges from node connections with optimizations
const generateEdges = (nodes: DetailedNodeData[]): Edge<DetailedEdgeData>[] => {
  const edges: Edge<DetailedEdgeData>[] = [];
  const nodeMap = new Map(nodes.map(node => [node.id, node]));

  nodes.forEach(node => {
    if (node.connections) {
      node.connections.forEach(connection => {
        const edgeId = `${node.id}-to-${connection.targetId}`;
        const targetNode = nodeMap.get(connection.targetId);
        const targetName = targetNode ? targetNode.label : connection.targetName;

        edges.push({
          id: edgeId,
          source: node.id,
          target: connection.targetId,
          type: 'detailedEdge',
          animated: connection.type === 'event',
          data: {
            type: connection.type,
            label: connection.description || `${node.label} → ${targetName}`,
            description: connection.description,
          },
        });
      });
    }
  });

  return edges;
};

// Default filters
const defaultFilters: ArchitectureFilters = {
  showTypes: {
    controller: true,
    service: true,
    model: true,
    middleware: true,
    route: true,
    database: true,
  },
  showBackend: true,
  showFrontend: false,
  searchTerm: '',
};

const defaultViewState: ViewState = {
  x: 0,
  y: 0,
  zoom: 1,
};

// Main hook
export const useArchitectureData = (): UseArchitectureDataReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ArchitectureFilters>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTERS);
      return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    } catch {
      return defaultFilters;
    }
  });
  
  const [viewState, setViewState] = useState<ViewState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW_STATE);
      return saved ? { ...defaultViewState, ...JSON.parse(saved) } : defaultViewState;
    } catch {
      return defaultViewState;
    }
  });

  // Memoized data generation
  const allNodes = useMemo(() => {
    const nodeData = generateOptimizedNodeData();
    return layoutNodes(nodeData);
  }, []);

  const allEdges = useMemo(() => {
    const nodeData = generateOptimizedNodeData();
    return generateEdges(nodeData);
  }, []);

  // Optimized filtering with memoization
  const { filteredNodes, filteredEdges } = useMemo(() => {
    let nodes = [...allNodes];

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      nodes = nodes.filter(node =>
        node.data.label.toLowerCase().includes(searchLower) ||
        node.data.description?.toLowerCase().includes(searchLower) ||
        node.data.path?.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filters
    nodes = nodes.filter(node => filters.showTypes[node.data.type]);

    // Apply backend/frontend filters
    if (!filters.showBackend) {
      nodes = nodes.filter(node => node.data.path?.includes('client/src'));
    }
    if (!filters.showFrontend) {
      nodes = nodes.filter(node => !node.data.path?.includes('client/src'));
    }

    // Filter edges to only include those connecting visible nodes
    const visibleNodeIds = new Set(nodes.map(node => node.id));
    const edges = allEdges.filter(
      edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    return { filteredNodes: nodes, filteredEdges: edges };
  }, [allNodes, allEdges, filters]);

  // Statistics
  const stats = useMemo(() => ({
    totalNodes: allNodes.length,
    visibleNodes: filteredNodes.length,
    totalEdges: allEdges.length,
    visibleEdges: filteredEdges.length,
  }), [allNodes.length, filteredNodes.length, allEdges.length, filteredEdges.length]);

  // Persist filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  }, [filters]);

  // Persist view state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW_STATE, JSON.stringify(viewState));
    } catch (error) {
      console.warn('Failed to save view state to localStorage:', error);
    }
  }, [viewState]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Actions
  const updateFilters = useCallback((newFilters: Partial<ArchitectureFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const updateViewState = useCallback((newState: Partial<ViewState>) => {
    setViewState(prev => ({ ...prev, ...newState }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const resetView = useCallback(() => {
    setViewState(defaultViewState);
  }, []);

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    filters,
    viewState,
    isLoading,
    stats,
    actions: {
      updateFilters,
      updateViewState,
      resetFilters,
      resetView,
    },
  };
};