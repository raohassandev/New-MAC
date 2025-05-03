// test-device-structure.js
const { convertFormToDeviceData } = require('./client/src/utils/TypeAdapter');

// Mock form data
const deviceBasics = {
  name: "Test Device",
  make: "Test Make",
  model: "Test Model",
  description: "A test device",
  enabled: true,
  tags: ["test", "demo"]
};

const connectionSettings = {
  type: "tcp",
  ip: "192.168.1.100",
  port: "502",
  slaveId: "1",
  serialPort: "",
  baudRate: "9600",
  dataBits: "8",
  stopBits: "1",
  parity: "none"
};

const registerRanges = [
  {
    rangeName: "Voltage",
    startRegister: 0,
    length: 2,
    functionCode: 3
  }
];

const parameters = [
  {
    name: "V1",
    dataType: "UINT32",
    scalingFactor: 1,
    decimalPoint: 0,
    byteOrder: "ABCD",
    registerRange: "Voltage",
    registerIndex: 0,
    signed: true,
    wordCount: 2
  }
];

// Convert to device object
const deviceObject = convertFormToDeviceData(
  deviceBasics,
  connectionSettings,
  registerRanges,
  parameters
);

// Print the resulting object
console.log(JSON.stringify(deviceObject, null, 2));

// Check for duplicated fields
const connectionFields = ["ip", "port", "slaveId", "serialPort", "baudRate", "dataBits", "stopBits", "parity", "connectionType"];
let hasRootConnectionFields = false;
let hasConnectionSettingObject = false;

for (const field of connectionFields) {
  if (deviceObject[field] !== undefined) {
    hasRootConnectionFields = true;
    console.log(`Found duplicate connection field at root level: ${field}`);
  }
}

if (deviceObject.connectionSetting) {
  hasConnectionSettingObject = true;
}

console.log("\nValidation Results:");
console.log(`- Has connection settings object: ${hasConnectionSettingObject ? "✅" : "❌"}`);
console.log(`- No root-level connection fields: ${!hasRootConnectionFields ? "✅" : "❌"}`);
console.log(`- Has dataPoints array: ${deviceObject.dataPoints ? "✅" : "❌"}`);