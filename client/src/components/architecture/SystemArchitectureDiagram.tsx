import React, { useState, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Typography,
  Button,
  Chip,
  FormControlLabel,
  Switch,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  ButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import ApiIcon from '@mui/icons-material/Api';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import SettingsIcon from '@mui/icons-material/Settings';
import DataObjectIcon from '@mui/icons-material/DataObject';

import DetailedNodeComponent, {
  DetailedNodeData,
} from './components/DetailedNodeComponent';
import DetailedEdgeComponent, { DetailedEdgeData } from './components/DetailedEdgeComponent';

// Custom node types
const nodeTypes: NodeTypes = {
  detailedNode: DetailedNodeComponent,
};

// Custom edge types
const edgeTypes: EdgeTypes = {
  detailedEdge: DetailedEdgeComponent,
};

// Generate device-related node data from the analyzed structures
const generateDeviceModelNodeData = (): DetailedNodeData => {
  return {
    id: 'device-model',
    label: 'Device Model',
    type: 'model',
    description: 'Represents a physical Modbus device with connection details and data points',
    parameters: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Device name',
      },
      {
        name: 'make',
        type: 'string',
        description: 'Device manufacturer',
      },
      {
        name: 'model',
        type: 'string',
        description: 'Device model number',
      },
      {
        name: 'enabled',
        type: 'boolean',
        description: 'Whether the device is enabled for polling',
        defaultValue: true,
      },
      {
        name: 'connectionSetting',
        type: 'object',
        description: 'Modbus connection settings',
      },
      {
        name: 'dataPoints',
        type: 'array',
        description: 'Array of data points to read from the device',
      },
      {
        name: 'pollingInterval',
        type: 'number',
        description: 'Interval in milliseconds to poll the device',
        defaultValue: 30000,
      },
      {
        name: 'deviceDriverId',
        type: 'string',
        description: 'Reference to a device driver configuration',
      },
    ],
    methods: [
      {
        name: 'pre(save)',
        description: 'Updates timestamps before saving',
        returnType: 'void',
      },
      {
        name: 'createDeviceModel',
        description: 'Creates a Device model with a specific connection',
        parameters: [
          {
            name: 'connection',
            type: 'mongoose.Connection',
            required: true,
          },
        ],
        returnType: 'Model<IDevice>',
      },
    ],
    connections: [
      {
        targetId: 'device-controller',
        targetName: 'DeviceController',
        type: 'data',
        description: 'Device data is managed by DeviceController',
      },
      {
        targetId: 'data-polling-service',
        targetName: 'DataPollingService',
        type: 'data',
        description: 'Device data is polled by DataPollingService',
      },
      {
        targetId: 'mongodb',
        targetName: 'MongoDB',
        type: 'database',
        description: 'Device data is stored in MongoDB',
      },
    ],
    path: '/server/src/client/models/Device.ts',
    importance: 'high',
    modifiable: true,
  };
};

const generateDeviceControllerNodeData = (): DetailedNodeData => {
  return {
    id: 'device-controller',
    label: 'Device Controller',
    type: 'controller',
    description: 'Handles CRUD operations and device interactions through the API',
    methods: [
      {
        name: 'getDevices',
        description: 'Get all devices with pagination and filtering',
        parameters: [
          {
            name: 'req',
            type: 'AuthRequest',
            required: true,
          },
          {
            name: 'res',
            type: 'Response',
            required: true,
          },
        ],
        returnType: 'Promise<void>',
      },
      {
        name: 'getDeviceById',
        description: 'Get a single device by ID',
        parameters: [
          {
            name: 'req',
            type: 'AuthRequest',
            required: true,
          },
          {
            name: 'res',
            type: 'Response',
            required: true,
          },
        ],
        returnType: 'Promise<void>',
      },
      {
        name: 'createDevice',
        description: 'Create a new device',
        parameters: [
          {
            name: 'req',
            type: 'AuthRequest',
            required: true,
          },
          {
            name: 'res',
            type: 'Response',
            required: true,
          },
        ],
        returnType: 'Promise<void>',
      },
      {
        name: 'updateDevice',
        description: 'Update an existing device',
        parameters: [
          {
            name: 'req',
            type: 'AuthRequest',
            required: true,
          },
          {
            name: 'res',
            type: 'Response',
            required: true,
          },
        ],
        returnType: 'Promise<void>',
      },
      {
        name: 'deleteDevice',
        description: 'Delete a device',
        parameters: [
          {
            name: 'req',
            type: 'AuthRequest',
            required: true,
          },
          {
            name: 'res',
            type: 'Response',
            required: true,
          },
        ],
        returnType: 'Promise<void>',
      },
      {
        name: 'testDeviceConnection',
        description: 'Test connection to a device',
        parameters: [
          {
            name: 'req',
            type: 'AuthRequest',
            required: true,
          },
          {
            name: 'res',
            type: 'Response',
            required: true,
          },
        ],
        returnType: 'Promise<void>',
      },
      {
        name: 'readDeviceRegisters',
        description: 'Read registers from a device',
        parameters: [
          {
            name: 'req',
            type: 'AuthRequest',
            required: true,
          },
          {
            name: 'res',
            type: 'Response',
            required: true,
          },
        ],
        returnType: 'Promise<void>',
      },
    ],
    connections: [
      {
        targetId: 'device-model',
        targetName: 'Device Model',
        type: 'data',
        description: 'Creates and manages Device models',
      },
      {
        targetId: 'modbus-client',
        targetName: 'Modbus Client',
        type: 'api',
        description: 'Uses Modbus client for device communication',
      },
      {
        targetId: 'device-routes',
        targetName: 'Device Routes',
        type: 'api',
        description: 'Exposed through API routes',
      },
      {
        targetId: 'auth-middleware',
        targetName: 'Auth Middleware',
        type: 'middleware',
        description: 'Access controlled by authentication middleware',
      },
    ],
    path: '/server/src/client/controllers/deviceController.ts',
    importance: 'high',
    modifiable: true,
  };
};

const generateDataPollingServiceNodeData = (): DetailedNodeData => {
  return {
    id: 'data-polling-service',
    label: 'Data Polling Service',
    type: 'service',
    description: 'Periodically reads data from devices via Modbus and stores it in the database',
    methods: [
      {
        name: 'pollDevice',
        description: 'Poll a specific device for data',
        parameters: [
          {
            name: 'deviceId',
            type: 'string',
            required: true,
          },
        ],
        returnType: 'Promise<DeviceReading | null>',
      },
      {
        name: 'getRealtimeData',
        description: 'Get the latest data for a device from cache',
        parameters: [
          {
            name: 'deviceId',
            type: 'string',
            required: true,
          },
        ],
        returnType: 'DeviceReading | null',
      },
      {
        name: 'startPollingDevice',
        description: 'Start polling a device at a specific interval',
        parameters: [
          {
            name: 'deviceId',
            type: 'string',
            required: true,
          },
          {
            name: 'intervalMs',
            type: 'number',
            defaultValue: 10000,
          },
        ],
        returnType: 'NodeJS.Timeout',
      },
      {
        name: 'stopPollingDevice',
        description: 'Stop polling a device',
        parameters: [
          {
            name: 'deviceId',
            type: 'string',
            required: true,
          },
        ],
        returnType: 'void',
      },
    ],
    connections: [
      {
        targetId: 'device-model',
        targetName: 'Device Model',
        type: 'data',
        description: 'Reads Device configuration',
      },
      {
        targetId: 'modbus-client',
        targetName: 'Modbus Client',
        type: 'api',
        description: 'Uses Modbus client for device communication',
      },
      {
        targetId: 'historical-data-model',
        targetName: 'Historical Data Model',
        type: 'database',
        description: 'Stores historical readings in the database',
      },
      {
        targetId: 'device-initializer',
        targetName: 'Device Initializer',
        type: 'event',
        description: 'Started by Device Initializer service',
      },
    ],
    path: '/server/src/client/services/dataPollingService.ts',
    importance: 'high',
    modifiable: true,
  };
};

const generateModbusClientNodeData = (): DetailedNodeData => {
  return {
    id: 'modbus-client',
    label: 'Modbus TCP Client',
    type: 'service',
    description: 'Handles communication with Modbus devices over TCP',
    parameters: [
      {
        name: 'host',
        type: 'string',
        required: true,
        description: 'IP address of the Modbus server',
      },
      {
        name: 'port',
        type: 'number',
        description: 'TCP port, default is 502',
        defaultValue: 502,
      },
      {
        name: 'unitId',
        type: 'number',
        description: 'Modbus unit/slave ID',
        defaultValue: 1,
      },
      {
        name: 'connectionOptions',
        type: 'object',
        description: 'Advanced connection options',
      },
    ],
    methods: [
      {
        name: 'connect',
        description: 'Connect to the Modbus TCP server',
        parameters: [
          {
            name: 'options',
            type: 'ConnectionOptions',
            required: false,
          },
        ],
        returnType: 'Promise<void>',
      },
      {
        name: 'disconnect',
        description: 'Disconnect from the Modbus TCP server',
        returnType: 'Promise<void>',
      },
      {
        name: 'readParameter',
        description: 'Read a single parameter',
        parameters: [
          {
            name: 'parameter',
            type: 'Parameter',
            required: true,
          },
        ],
        returnType: 'Promise<RequestResult>',
      },
      {
        name: 'readParameters',
        description: 'Read multiple parameters',
        parameters: [
          {
            name: 'parameters',
            type: 'Parameter[]',
            required: true,
          },
        ],
        returnType: 'Promise<RequestResult[]>',
      },
      {
        name: 'writeParameter',
        description: 'Write a value to a parameter',
        parameters: [
          {
            name: 'parameter',
            type: 'Parameter',
            required: true,
          },
          {
            name: 'value',
            type: 'any',
            required: true,
          },
        ],
        returnType: 'Promise<RequestResult>',
      },
    ],
    connections: [
      {
        targetId: 'modbus-connection',
        targetName: 'Modbus TCP Connection',
        type: 'api',
        description: 'Uses TCP connection for transport',
      },
      {
        targetId: 'data-polling-service',
        targetName: 'Data Polling Service',
        type: 'api',
        description: 'Used by Data Polling Service',
      },
      {
        targetId: 'device-controller',
        targetName: 'Device Controller',
        type: 'api',
        description: 'Used by Device Controller',
      },
    ],
    path: '/server/src/communication/protocols/modbus/tcp/client.ts',
    importance: 'medium',
    modifiable: true,
  };
};

const generateNodeData = (): DetailedNodeData[] => {
  return [
    // Backend Models
    generateDeviceModelNodeData(),
    {
      id: 'historical-data-model',
      label: 'Historical Data Model',
      type: 'model',
      description: 'Stores historical readings from devices',
      parameters: [
        {
          name: 'deviceId',
          type: 'ObjectId',
          required: true,
          description: 'Reference to the device',
        },
        {
          name: 'parameterName',
          type: 'string',
          required: true,
          description: 'Name of the parameter',
        },
        {
          name: 'value',
          type: 'any',
          required: true,
          description: 'Value of the parameter',
        },
        {
          name: 'timestamp',
          type: 'Date',
          required: true,
          description: 'When the reading was taken',
        },
        {
          name: 'quality',
          type: 'string',
          description: 'Quality of the reading (good, bad, uncertain)',
        },
      ],
      connections: [
        {
          targetId: 'device-model',
          targetName: 'Device Model',
          type: 'data',
          description: 'References Device model',
        },
        {
          targetId: 'data-polling-service',
          targetName: 'Data Polling Service',
          type: 'data',
          description: 'Created by Data Polling Service',
        },
        {
          targetId: 'mongodb',
          targetName: 'MongoDB',
          type: 'database',
          description: 'Stored in MongoDB',
        },
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
        {
          name: 'username',
          type: 'string',
          required: true,
          description: 'User login name',
        },
        {
          name: 'email',
          type: 'string',
          required: true,
          description: 'User email address',
        },
        {
          name: 'password',
          type: 'string',
          required: true,
          description: 'Hashed password',
        },
        {
          name: 'role',
          type: 'string',
          required: true,
          description: 'User role (admin, engineer, viewer)',
        },
      ],
      connections: [
        {
          targetId: 'auth-controller',
          targetName: 'Auth Controller',
          type: 'data',
          description: 'Managed by Auth Controller',
        },
        {
          targetId: 'mongodb',
          targetName: 'MongoDB',
          type: 'database',
          description: 'Stored in MongoDB',
        },
      ],
      path: '/server/src/client/models/User.ts',
      importance: 'medium',
      modifiable: true,
    },

    // Backend Controllers
    generateDeviceControllerNodeData(),
    {
      id: 'auth-controller',
      label: 'Auth Controller',
      type: 'controller',
      description: 'Handles user authentication and authorization',
      methods: [
        {
          name: 'login',
          description: 'Authenticate a user and return a JWT token',
          parameters: [
            {
              name: 'req',
              type: 'Request',
              required: true,
            },
            {
              name: 'res',
              type: 'Response',
              required: true,
            },
          ],
          returnType: 'Promise<void>',
        },
        {
          name: 'register',
          description: 'Register a new user',
          parameters: [
            {
              name: 'req',
              type: 'Request',
              required: true,
            },
            {
              name: 'res',
              type: 'Response',
              required: true,
            },
          ],
          returnType: 'Promise<void>',
        },
      ],
      connections: [
        {
          targetId: 'user-model',
          targetName: 'User Model',
          type: 'data',
          description: 'Creates and manages User models',
        },
        {
          targetId: 'auth-routes',
          targetName: 'Auth Routes',
          type: 'api',
          description: 'Exposed through API routes',
        },
      ],
      path: '/server/src/client/controllers/authController.ts',
      importance: 'medium',
      modifiable: true,
    },

    // Backend Services
    generateDataPollingServiceNodeData(),
    {
      id: 'device-initializer',
      label: 'Device Initializer',
      type: 'service',
      description: 'Initializes device polling on system startup',
      methods: [
        {
          name: 'initializeDevicePolling',
          description: 'Set up automatic polling for all enabled devices',
          parameters: [
            {
              name: 'pollingInterval',
              type: 'number',
              defaultValue: 30000,
            },
            {
              name: 'developerMode',
              type: 'boolean',
              defaultValue: false,
            },
          ],
          returnType: 'Promise<void>',
        },
      ],
      connections: [
        {
          targetId: 'device-model',
          targetName: 'Device Model',
          type: 'data',
          description: 'Loads Device configurations',
        },
        {
          targetId: 'data-polling-service',
          targetName: 'Data Polling Service',
          type: 'api',
          description: 'Starts Data Polling Service for each device',
        },
      ],
      path: '/server/src/client/services/deviceInitializer.ts',
      importance: 'medium',
      modifiable: true,
    },
    generateModbusClientNodeData(),
    {
      id: 'modbus-connection',
      label: 'Modbus TCP Connection',
      type: 'service',
      description: 'Handles low-level TCP communication with Modbus devices',
      methods: [
        {
          name: 'connect',
          description: 'Connect to a Modbus TCP server',
          returnType: 'Promise<void>',
        },
        {
          name: 'disconnect',
          description: 'Disconnect from a Modbus TCP server',
          returnType: 'Promise<void>',
        },
        {
          name: 'sendRequest',
          description: 'Send a Modbus PDU request and get a response',
          parameters: [
            {
              name: 'pdu',
              type: 'Buffer',
              required: true,
            },
            {
              name: 'unitId',
              type: 'number',
              required: true,
            },
          ],
          returnType: 'Promise<Buffer>',
        },
      ],
      connections: [
        {
          targetId: 'modbus-client',
          targetName: 'Modbus TCP Client',
          type: 'api',
          description: 'Used by Modbus TCP Client',
        },
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
        {
          name: 'protect',
          description: 'Middleware to protect routes with JWT authentication',
          parameters: [
            {
              name: 'req',
              type: 'Request',
              required: true,
            },
            {
              name: 'res',
              type: 'Response',
              required: true,
            },
            {
              name: 'next',
              type: 'NextFunction',
              required: true,
            },
          ],
          returnType: 'Promise<void>',
        },
        {
          name: 'authorize',
          description: 'Middleware to limit access based on user roles',
          parameters: [
            {
              name: 'roles',
              type: 'string[]',
              required: true,
            },
          ],
          returnType: 'Function',
        },
      ],
      connections: [
        {
          targetId: 'user-model',
          targetName: 'User Model',
          type: 'data',
          description: 'Verifies User credentials',
        },
        {
          targetId: 'device-routes',
          targetName: 'Device Routes',
          type: 'middleware',
          description: 'Applied to Device Routes',
        },
        {
          targetId: 'auth-routes',
          targetName: 'Auth Routes',
          type: 'middleware',
          description: 'Applied to Auth Routes',
        },
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
        {
          name: 'GET /api/devices',
          description: 'Get all devices',
        },
        {
          name: 'GET /api/devices/:id',
          description: 'Get device by ID',
        },
        {
          name: 'POST /api/devices',
          description: 'Create a new device',
        },
        {
          name: 'PUT /api/devices/:id',
          description: 'Update a device',
        },
        {
          name: 'DELETE /api/devices/:id',
          description: 'Delete a device',
        },
        {
          name: 'POST /api/devices/:id/test',
          description: 'Test connection to a device',
        },
        {
          name: 'GET /api/devices/:id/read',
          description: 'Read registers from a device',
        },
      ],
      connections: [
        {
          targetId: 'device-controller',
          targetName: 'Device Controller',
          type: 'api',
          description: 'Routes to Device Controller methods',
        },
        {
          targetId: 'auth-middleware',
          targetName: 'Auth Middleware',
          type: 'middleware',
          description: 'Protected by Auth Middleware',
        },
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
        {
          name: 'POST /api/auth/login',
          description: 'Login a user',
        },
        {
          name: 'POST /api/auth/register',
          description: 'Register a new user',
        },
        {
          name: 'GET /api/auth/profile',
          description: 'Get user profile',
        },
      ],
      connections: [
        {
          targetId: 'auth-controller',
          targetName: 'Auth Controller',
          type: 'api',
          description: 'Routes to Auth Controller methods',
        },
        {
          targetId: 'auth-middleware',
          targetName: 'Auth Middleware',
          type: 'middleware',
          description: 'Some routes protected by Auth Middleware',
        },
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

// Generate edges from the node connection data
const generateEdges = (nodes: DetailedNodeData[]): Edge<DetailedEdgeData>[] => {
  const edges: Edge<DetailedEdgeData>[] = [];

  // Process each node's connections
  nodes.forEach(node => {
    if (node.connections) {
      node.connections.forEach(connection => {
        // Create a unique edge ID
        const edgeId = `${node.id}-to-${connection.targetId}`;

        // Find target node name if not provided
        const targetNode = nodes.find(n => n.id === connection.targetId);
        const targetName = targetNode ? targetNode.label : connection.targetName;

        // Add edge
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

// Layout nodes in a hierarchical manner
const layoutNodes = (nodes: DetailedNodeData[]): Node<DetailedNodeData>[] => {
  // Define layers based on node types
  const layers: { [key: string]: number } = {
    route: 0,
    middleware: 1,
    controller: 2,
    service: 3,
    model: 4,
    database: 5,
  };

  // Count nodes per layer for positioning
  const nodesPerLayer: { [key: number]: number } = {};
  nodes.forEach(node => {
    const layer = layers[node.type] || 0;
    nodesPerLayer[layer] = (nodesPerLayer[layer] || 0) + 1;
  });

  // Position tracking within each layer
  const positions: { [key: number]: number } = {};

  // Generate positioned nodes
  return nodes.map(node => {
    const layer = layers[node.type] || 0;
    positions[layer] = positions[layer] || 0;

    // Calculate x and y positions
    const x = positions[layer] * 350;
    const y = layer * 250;

    // Increment position for this layer
    positions[layer]++;

    return {
      id: node.id,
      position: { x, y },
      data: node,
      type: 'detailedNode',
    };
  });
};

// Main component
const SystemArchitectureDiagram: React.FC = () => {
  // Initialize with data
  const initialNodes = layoutNodes(generateNodeData());
  const initialEdges = generateEdges(generateNodeData());

  // State management
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showBackend, setShowBackend] = useState(true);
  const [showFrontend, setShowFrontend] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTypes, setShowTypes] = useState<{ [key: string]: boolean }>({
    controller: true,
    service: true,
    model: true,
    middleware: true,
    route: true,
    database: true,
  });

  const reactFlowInstance = useReactFlow();
  const diagramRef = useRef<HTMLDivElement>(null);

  // Filter nodes based on search and type visibility
  useEffect(() => {
    // Start with all nodes
    let filteredNodes = [...initialNodes];

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredNodes = filteredNodes.filter(
        node =>
          node.data.label.toLowerCase().includes(lowerSearch) ||
          node.data.description?.toLowerCase().includes(lowerSearch) ||
          node.data.path?.toLowerCase().includes(lowerSearch)
      );
    }

    // Filter by type visibility
    filteredNodes = filteredNodes.filter(node => showTypes[node.data.type]);

    // Filter by backend/frontend
    if (!showBackend) {
      filteredNodes = filteredNodes.filter(node => node.data.path?.includes('client/src'));
    }
    if (!showFrontend) {
      filteredNodes = filteredNodes.filter(node => !node.data.path?.includes('client/src'));
    }

    // Set the filtered nodes
    setNodes(filteredNodes);

    // Update edges to only include those connecting visible nodes
    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));
    const filteredEdges = initialEdges.filter(
      edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
    setEdges(filteredEdges);
  }, [
    searchTerm,
    showTypes,
    showBackend,
    showFrontend,
    initialNodes,
    initialEdges,
    setNodes,
    setEdges,
  ]);

  // Handle node type visibility toggle
  const handleTypeToggle = (type: string) => {
    setShowTypes(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Handle fit view
  const handleFitView = () => {
    reactFlowInstance.fitView({ padding: 0.2 });
  };

  // Handle zoom in/out
  const handleZoomIn = () => {
    reactFlowInstance.zoomIn();
  };

  const handleZoomOut = () => {
    reactFlowInstance.zoomOut();
  };

  // Handle reset
  const handleReset = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSearchTerm('');
    setShowTypes({
      controller: true,
      service: true,
      model: true,
      middleware: true,
      route: true,
      database: true,
    });
    setShowBackend(true);
    setShowFrontend(true);
    reactFlowInstance.fitView({ padding: 0.2 });
  };

  // Handle export as image
  const handleExport = () => {
    if (diagramRef.current) {
      const svg = diagramRef.current
        .querySelector('.react-flow__renderer')
        ?.cloneNode(true) as SVGElement;
      if (svg) {
        // Clean up SVG
        const controls = svg.querySelector('.react-flow__controls');
        if (controls) controls.remove();
        const minimap = svg.querySelector('.react-flow__minimap');
        if (minimap) minimap.remove();

        // Convert SVG to string
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = 'system-architecture.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <Box sx={{ height: '100vh', width: '100%' }}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" fontWeight="bold">
            System Architecture Diagram
          </Typography>
          <ButtonGroup>
            <Button startIcon={<RefreshIcon />} onClick={handleReset}>
              Reset
            </Button>
            <Button startIcon={<SaveIcon />} onClick={handleFitView}>
              Fit View
            </Button>
            <Button startIcon={<FileDownloadIcon />} onClick={handleExport}>
              Export
            </Button>
          </ButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <FilterListIcon />
            <Tooltip title="Controllers">
              <Chip
                icon={<CodeIcon />}
                label="Controllers"
                clickable
                color={showTypes.controller ? 'primary' : 'default'}
                onClick={() => handleTypeToggle('controller')}
                sx={{ fontWeight: showTypes.controller ? 'bold' : 'normal' }}
              />
            </Tooltip>
            <Tooltip title="Services">
              <Chip
                icon={<SettingsIcon />}
                label="Services"
                clickable
                color={showTypes.service ? 'primary' : 'default'}
                onClick={() => handleTypeToggle('service')}
                sx={{ fontWeight: showTypes.service ? 'bold' : 'normal' }}
              />
            </Tooltip>
            <Tooltip title="Models">
              <Chip
                icon={<DataObjectIcon />}
                label="Models"
                clickable
                color={showTypes.model ? 'primary' : 'default'}
                onClick={() => handleTypeToggle('model')}
                sx={{ fontWeight: showTypes.model ? 'bold' : 'normal' }}
              />
            </Tooltip>
            <Tooltip title="Middleware">
              <Chip
                icon={<NetworkCheckIcon />}
                label="Middleware"
                clickable
                color={showTypes.middleware ? 'primary' : 'default'}
                onClick={() => handleTypeToggle('middleware')}
                sx={{ fontWeight: showTypes.middleware ? 'bold' : 'normal' }}
              />
            </Tooltip>
            <Tooltip title="Routes">
              <Chip
                icon={<ApiIcon />}
                label="Routes"
                clickable
                color={showTypes.route ? 'primary' : 'default'}
                onClick={() => handleTypeToggle('route')}
                sx={{ fontWeight: showTypes.route ? 'bold' : 'normal' }}
              />
            </Tooltip>
            <Tooltip title="Databases">
              <Chip
                icon={<StorageIcon />}
                label="Databases"
                clickable
                color={showTypes.database ? 'primary' : 'default'}
                onClick={() => handleTypeToggle('database')}
                sx={{ fontWeight: showTypes.database ? 'bold' : 'normal' }}
              />
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showBackend}
                  onChange={() => setShowBackend(!showBackend)}
                  color="primary"
                />
              }
              label="Backend"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showFrontend}
                  onChange={() => setShowFrontend(!showFrontend)}
                  color="primary"
                />
              }
              label="Frontend"
            />
          </Box>
        </Box>
      </Paper>

      <Box sx={{ height: 'calc(100vh - 150px)', width: '100%' }} ref={diagramRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.2}
          maxZoom={2}
        >
            <Background />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              nodeColor={node => {
                switch (node.data.type) {
                  case 'model':
                    return '#4caf50'; // Green
                  case 'controller':
                    return '#2196f3'; // Blue
                  case 'service':
                    return '#ff9800'; // Orange
                  case 'middleware':
                    return '#795548'; // Brown
                  case 'route':
                    return '#00bcd4'; // Cyan
                  case 'database':
                    return '#3f51b5'; // Indigo
                  default:
                    return '#607d8b'; // Blue Grey
                }
              }}
            />
            <Panel position="top-right">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Tooltip title="Zoom In">
                  <IconButton onClick={handleZoomIn}>
                    <ZoomInIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <IconButton onClick={handleZoomOut}>
                    <ZoomOutIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Panel>
          </ReactFlow>
      </Box>

      <Box
        sx={{ p: 1, display: 'flex', justifyContent: 'space-between', bgcolor: 'background.paper' }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Nodes: {nodes.length} of {initialNodes.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connections: {edges.length} of {initialEdges.length}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Zoom and drag to explore. Click on nodes to see details. Double-click to expand.
        </Typography>
      </Box>
    </Box>
  );
};

// Wrapper component to provide ReactFlow context
const SystemArchitectureDiagramWrapper: React.FC = () => {
  return (
    <ReactFlowProvider>
      <SystemArchitectureDiagram />
    </ReactFlowProvider>
  );
};

export default SystemArchitectureDiagramWrapper;
