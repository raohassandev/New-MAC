// Test file to check the adapter transformation

// Sample form data
const deviceBasics = {
  name: 'Test Device',
  make: 'Test Make',
  model: 'Test Model',
  description: 'Test Description',
  enabled: true,
  tags: ['test', 'device'],
};

const connectionSettings = {
  type: 'tcp',
  ip: '192.168.1.100',
  port: '502',
  slaveId: '1',
  serialPort: '',
  baudRate: '9600',
  dataBits: '8',
  stopBits: '1',
  parity: 'none',
};

const registerRanges = [
  {
    rangeName: 'Range1',
    startRegister: 0,
    length: 4,
    functionCode: 4,
  },
  {
    rangeName: 'Range2',
    startRegister: 4,
    length: 4,
    functionCode: 3,
  },
  {
    rangeName: 'Range3',
    startRegister: 8,
    length: 4,
    functionCode: 4,
  },
  {
    rangeName: 'Range4',
    startRegister: 12,
    length: 4,
    functionCode: 4,
  },
];

const parameters = [
  {
    name: 'Parameter1',
    dataType: 'INT16',
    scalingFactor: 0.1,
    decimalPoint: 1,
    byteOrder: 'AB',
    registerRange: 'Range1',
    registerIndex: 0,
    unit: 'C',
    description: 'Test parameter 1',
  },
  {
    name: 'Parameter2',
    dataType: 'UINT16',
    scalingFactor: 1,
    decimalPoint: 0,
    byteOrder: 'AB',
    registerRange: 'Range1',
    registerIndex: 1,
    unit: 'RPM',
    description: 'Test parameter 2',
  },
  {
    name: 'Parameter3',
    dataType: 'FLOAT32',
    scalingFactor: 0.01,
    decimalPoint: 2,
    byteOrder: 'ABCD',
    registerRange: 'Range2',
    registerIndex: 4,
    unit: 'V',
    description: 'Test parameter 3',
  },
  {
    name: 'Parameter4',
    dataType: 'INT32',
    scalingFactor: 1,
    decimalPoint: 0,
    byteOrder: 'ABCD',
    registerRange: 'Range3',
    registerIndex: 8,
    unit: 'A',
    description: 'Test parameter 4',
  },
];

// Mock implementation of the adapter functions
function createDataPointFromRange(range, parameters) {
  // Find all parameters associated with this range
  const rangeParameters = parameters.filter(param => param.registerRange === range.rangeName);

  return {
    range: {
      startAddress: range.startRegister,
      count: range.length,
      fc: range.functionCode,
    },
    parser: {
      // Include all the Data Reading tab info for this range
      parameters: rangeParameters,
    },
  };
}

function convertFormToDeviceData(deviceBasics, connectionSettings, registerRanges, parameters) {
  // Create dataPoints array from register ranges
  const dataPoints = registerRanges.map(range => createDataPointFromRange(range, parameters));

  // Create connection settings object
  const connectionSetting = {
    connectionType: connectionSettings.type,
    ip: connectionSettings.ip,
    port: parseInt(connectionSettings.port),
    slaveId: parseInt(connectionSettings.slaveId),
    serialPort: connectionSettings.serialPort,
    baudRate: parseInt(connectionSettings.baudRate),
    dataBits: parseInt(connectionSettings.dataBits),
    stopBits: parseInt(connectionSettings.stopBits),
    parity: connectionSettings.parity,
  };

  return {
    ...deviceBasics,
    connectionSetting, // Connection settings as a separate object
    dataPoints, // Data points array with range and parser

    // Keep original format for backward compatibility
    port: parseInt(connectionSettings.port),
    slaveId: parseInt(connectionSettings.slaveId),
    baudRate: parseInt(connectionSettings.baudRate),
    dataBits: parseInt(connectionSettings.dataBits),
    stopBits: parseInt(connectionSettings.stopBits),
    connectionType: connectionSettings.type,
    ip: connectionSettings.ip,
    serialPort: connectionSettings.serialPort,
    parity: connectionSettings.parity,
    registerRanges: registerRanges,
    parameterConfigs: parameters,
  };
}

// Test the transformation
const result = convertFormToDeviceData(
  deviceBasics,
  connectionSettings,
  registerRanges,
  parameters
);
console.log(JSON.stringify(result, null, 2));
