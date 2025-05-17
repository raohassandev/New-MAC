import { SystemNode, SystemEdge, FunctionData } from '../types/diagram.types';

// Base nodes with pre-analyzed data
export const analyzeSystemArchitecture = (): {
  nodes: SystemNode[];
  edges: SystemEdge[];
} => {
  // This would normally fetch data from an API endpoint
  // that analyzes the codebase, but for this implementation
  // we'll use pre-analyzed data based on our manual analysis

  const nodes: SystemNode[] = [];
  const edges: SystemEdge[] = [];

  // Backend Controllers
  addBackendController(
    nodes,
    'DeviceController',
    'server/src/client/controllers/deviceController.ts',
    [
      {
        name: 'getDevices',
        signature: 'async (req: Request, res: Response)',
        description: 'Retrieves devices with filtering, pagination, and sorting',
        returnType: 'Promise<Response>',
      },
      {
        name: 'createDevice',
        signature: 'async (req: Request, res: Response)',
        description: 'Creates new devices with validation',
        returnType: 'Promise<Response>',
      },
      {
        name: 'testDeviceConnection',
        signature: 'async (req: Request, res: Response)',
        description: 'Tests Modbus connectivity to a device',
        returnType: 'Promise<Response>',
      },
      {
        name: 'readDeviceRegisters',
        signature: 'async (req: Request, res: Response)',
        description: 'Reads register values from Modbus devices',
        returnType: 'Promise<Response>',
      },
    ]
  );

  addBackendController(nodes, 'AuthController', 'server/src/client/controllers/authController.ts', [
    {
      name: 'register',
      signature: 'async (req: Request, res: Response)',
      description: 'Registers a new user account',
      returnType: 'Promise<Response>',
    },
    {
      name: 'login',
      signature: 'async (req: Request, res: Response)',
      description: 'Authenticates a user and returns JWT token',
      returnType: 'Promise<Response>',
    },
    {
      name: 'me',
      signature: 'async (req: Request, res: Response)',
      description: 'Returns the current authenticated user profile',
      returnType: 'Promise<Response>',
    },
  ]);

  // Backend Models
  addBackendModel(nodes, 'Device', 'server/src/client/models/Device.ts', [
    {
      name: 'createDeviceModel',
      signature: 'function createDeviceModel(connection: Connection)',
      description: 'Creates a device model with specific database connection',
      returnType: 'Model<DeviceDocument>',
    },
  ]);

  addBackendModel(nodes, 'User', 'server/src/client/models/User.ts', [
    {
      name: 'comparePassword',
      signature: 'methods.comparePassword(password: string)',
      description: 'Compares provided password with stored hash',
      returnType: 'Promise<boolean>',
    },
  ]);

  // Backend Services
  addBackendService(
    nodes,
    'DataPollingService',
    'server/src/client/services/dataPollingService.ts',
    [
      {
        name: 'pollDevice',
        signature: 'async pollDevice(device: IDevice)',
        description: 'Polls a device for current data',
        returnType: 'Promise<PollResult>',
      },
      {
        name: 'startPollingDevice',
        signature: 'startPollingDevice(deviceId: string, interval: number)',
        description: 'Begins periodic polling for a device',
        returnType: 'void',
      },
      {
        name: 'stopPollingDevice',
        signature: 'stopPollingDevice(deviceId: string)',
        description: 'Stops polling for a device',
        returnType: 'void',
      },
    ]
  );

  addBackendService(nodes, 'DeviceInitializer', 'server/src/client/services/deviceInitializer.ts', [
    {
      name: 'initializeDevices',
      signature: 'async initializeDevices()',
      description: 'Bootstraps device polling on system startup',
      returnType: 'Promise<void>',
    },
  ]);

  addBackendService(
    nodes,
    'ModbusTcpClient',
    'server/src/communication/protocols/modbus/tcp/client.ts',
    [
      {
        name: 'connect',
        signature: 'async connect()',
        description: 'Establishes connection to Modbus TCP device',
        returnType: 'Promise<void>',
      },
      {
        name: 'readParameter',
        signature: 'async readParameter(parameter: Parameter)',
        description: 'Reads data from device parameter',
        returnType: 'Promise<ParameterValue>',
      },
      {
        name: 'readParameters',
        signature: 'async readParameters(parameters: Parameter[])',
        description: 'Reads multiple parameters with optimized requests',
        returnType: 'Promise<ParameterValue[]>',
      },
      {
        name: 'writeParameter',
        signature: 'async writeParameter(parameter: Parameter, value: any)',
        description: 'Writes data to a device parameter',
        returnType: 'Promise<boolean>',
      },
    ]
  );

  // Middleware
  addBackendMiddleware(nodes, 'AuthMiddleware', 'server/src/middleware/authMiddleware.ts', [
    {
      name: 'authenticate',
      signature: '(req: Request, res: Response, next: NextFunction)',
      description: 'Verifies JWT token and attaches user to request',
      returnType: 'void',
    },
    {
      name: 'checkPermission',
      signature: '(permission: string) => (req: Request, res: Response, next: NextFunction)',
      description: 'Checks if user has required permission',
      returnType: 'Middleware',
    },
  ]);

  // Frontend Components
  addFrontendComponent(
    nodes,
    'NewTemplateFormContainer',
    'client/src/components/templates/NewTemplateFormContainer.tsx',
    [
      {
        name: 'handleSubmit',
        signature: 'function handleSubmit(event: FormEvent)',
        description: 'Processes form submission with validation',
        returnType: 'void',
      },
      {
        name: 'validateCurrentTab',
        signature: 'function validateCurrentTab()',
        description: 'Validates the active tab fields',
        returnType: 'boolean',
      },
    ]
  );

  addFrontendComponent(
    nodes,
    'ConnectionSettings',
    'client/src/components/templates/ConnectionSettings.tsx',
    [
      {
        name: 'handleConnectionTypeChange',
        signature: 'function handleConnectionTypeChange(value: ConnectionType)',
        description: 'Updates form state when connection type changes',
        returnType: 'void',
      },
      {
        name: 'fetchDeviceTypes',
        signature: 'async function fetchDeviceTypes()',
        description: 'Retrieves device types from backend service',
        returnType: 'Promise<void>',
      },
    ]
  );

  // Frontend Hooks
  addFrontendHook(nodes, 'useDevices', 'client/src/hooks/useDevices.tsx', [
    {
      name: 'getDevices',
      signature: 'async function getDevices()',
      description: 'Fetches devices from API',
      returnType: 'Promise<Device[]>',
    },
    {
      name: 'createDevice',
      signature: 'async function createDevice(deviceData: DeviceFormData)',
      description: 'Creates a new device',
      returnType: 'Promise<Device>',
    },
    {
      name: 'testConnection',
      signature: 'async function testConnection(deviceId: string)',
      description: 'Tests connection to a device',
      returnType: 'Promise<ConnectionTestResult>',
    },
  ]);

  // Frontend Services
  addFrontendService(nodes, 'DeviceService', 'client/src/services/devices.ts', [
    {
      name: 'getDevices',
      signature: 'async function getDevices(params?: DeviceQueryParams)',
      description: 'Fetches devices with optional filtering',
      returnType: 'Promise<Device[]>',
    },
    {
      name: 'testDeviceConnection',
      signature: 'async function testDeviceConnection(deviceId: string)',
      description: 'Tests device connectivity',
      returnType: 'Promise<ConnectionTestResult>',
    },
  ]);

  // Redux
  addReduxStore(nodes, 'DevicesSlice', 'client/src/redux/features/devices/devicesSlice.ts', [
    {
      name: 'fetchDevices',
      signature: 'createAsyncThunk<Device[], DeviceQueryParams | undefined>',
      description: 'Async thunk for fetching devices',
      returnType: 'AsyncThunk',
    },
    {
      name: 'createDevice',
      signature: 'createAsyncThunk<Device, DeviceFormData>',
      description: 'Async thunk for creating a device',
      returnType: 'AsyncThunk',
    },
  ]);

  // Contexts
  addContext(
    nodes,
    'TemplateFormContext',
    'client/src/components/templates/TemplateFormContext.tsx',
    [
      {
        name: 'useTemplateForm',
        signature: 'function useTemplateForm()',
        description: 'Hook to access template form context',
        returnType: 'TemplateFormContextType',
      },
      {
        name: 'updateFormField',
        signature: 'function updateFormField(fieldName: string, value: any)',
        description: 'Updates a specific form field',
        returnType: 'void',
      },
    ]
  );

  // Routes
  addRoute(nodes, 'ApplicationRouter', 'client/src/router.tsx', [
    {
      name: 'Router',
      signature: 'const Router: React.FC',
      description: 'Main application router component',
      returnType: 'JSX.Element',
    },
  ]);

  // Create all the connections
  // Controller to Model connections
  addEdge(edges, 'DeviceController', 'Device', 'call', 'CRUD operations');
  addEdge(edges, 'AuthController', 'User', 'call', 'Authentication operations');

  // Controller to Service connections
  addEdge(edges, 'DeviceController', 'ModbusTcpClient', 'call', 'Device communication');

  // Service to Service connections
  addEdge(edges, 'DeviceInitializer', 'DataPollingService', 'call', 'Configure polling');
  addEdge(edges, 'DataPollingService', 'ModbusTcpClient', 'call', 'Read device data');

  // Frontend connections
  addEdge(edges, 'useDevices', 'DeviceService', 'call', 'API operations');
  addEdge(edges, 'DevicesSlice', 'DeviceService', 'call', 'API operations');
  addEdge(edges, 'NewTemplateFormContainer', 'ConnectionSettings', 'compose', 'Child component');
  addEdge(edges, 'NewTemplateFormContainer', 'TemplateFormContext', 'use', 'Form state');
  addEdge(edges, 'ConnectionSettings', 'TemplateFormContext', 'use', 'Form state');
  addEdge(edges, 'ApplicationRouter', 'NewTemplateFormContainer', 'route', 'Component routing');

  return { nodes, edges };
};

// Helper functions to create nodes
function addBackendController(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'controller',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addBackendModel(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'model',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addBackendService(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'service',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addBackendMiddleware(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'middleware',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addFrontendComponent(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'component',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addFrontendHook(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'hook',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addFrontendService(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'service',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addReduxStore(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'redux',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addContext(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'context',
      filePath,
      functions,
      expanded: false,
    },
  });
}

function addRoute(
  nodes: SystemNode[],
  name: string,
  filePath: string,
  functions: FunctionData[]
): void {
  nodes.push({
    id: name,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      type: 'route',
      filePath,
      functions,
      expanded: false,
    },
  });
}

// Helper function to create edges
function addEdge(
  edges: SystemEdge[],
  source: string,
  target: string,
  type: 'call' | 'data' | 'event' | 'depend' | 'compose' | 'use' | 'route',
  description: string
): void {
  // Map extra types to the allowed SystemEdge types
  let mappedType: 'call' | 'data' | 'event' | 'depend' = 'call';
  
  switch (type) {
    case 'call':
    case 'route':
    case 'use':
      mappedType = 'call';
      break;
    case 'data':
      mappedType = 'data';
      break;
    case 'event':
      mappedType = 'event';
      break;
    case 'depend':
    case 'compose':
      mappedType = 'depend';
      break;
  }
  
  edges.push({
    id: `e-${source}-${target}`,
    source,
    target,
    data: {
      type: mappedType,
      description,
    },
  });
}
