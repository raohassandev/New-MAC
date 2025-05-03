// This script creates a dummy device object in the expected new format
// It doesn't add to the database but provides a sample for analysis

const dummyDevice = {
  "name": "AC Control Panel",
  "make": "Circutor",
  "model": "CVM-C4",
  "description": "Power analyzer for monitoring electrical parameters",
  "enabled": true,
  "tags": ["power", "energy", "monitoring"],
  "connectionSetting": {
    "connectionType": "tcp",
    "ip": "192.168.1.100",
    "port": 502,
    "slaveId": 1,
    "baudRate": 9600,
    "dataBits": 8,
    "stopBits": 1,
    "parity": "none"
  },
  "dataPoints": [
    {
      "range": {
        "startAddress": 0,
        "count": 2,
        "fc": 3
      },
      "parser": {
        "parameters": [
          {
            "name": "Voltage_L1",
            "dataType": "FLOAT32",
            "scalingFactor": 1,
            "decimalPoint": 1,
            "byteOrder": "ABCD",
            "signed": true,
            "registerRange": "Voltage",
            "registerIndex": 0,
            "wordCount": 2
          }
        ]
      }
    },
    {
      "range": {
        "startAddress": 2,
        "count": 2,
        "fc": 3
      },
      "parser": {
        "parameters": [
          {
            "name": "Current_L1",
            "dataType": "FLOAT32",
            "scalingFactor": 1,
            "decimalPoint": 2,
            "byteOrder": "ABCD",
            "signed": true,
            "registerRange": "Current",
            "registerIndex": 0,
            "wordCount": 2
          }
        ]
      }
    },
    {
      "range": {
        "startAddress": 4,
        "count": 2,
        "fc": 3
      },
      "parser": {
        "parameters": [
          {
            "name": "ActivePower",
            "dataType": "FLOAT32",
            "scalingFactor": 1,
            "decimalPoint": 0,
            "byteOrder": "ABCD",
            "signed": true,
            "registerRange": "Power",
            "registerIndex": 0,
            "wordCount": 2
          }
        ]
      }
    }
  ],
  "createdBy": {
    "userId": "user123",
    "username": "admin",
    "email": "admin@example.com"
  },
  "createdAt": new Date().toISOString(),
  "updatedAt": new Date().toISOString()
};

// Print the device object as formatted JSON
console.log(JSON.stringify(dummyDevice, null, 2));

// Analyzing the object structure
console.log("\n--- Device Object Analysis ---");
console.log(`Device name: ${dummyDevice.name}`);
console.log(`Connection type: ${dummyDevice.connectionSetting.connectionType}`);
console.log(`IP address: ${dummyDevice.connectionSetting.ip}`);
console.log(`Number of data points: ${dummyDevice.dataPoints.length}`);
console.log(`Created by user: ${dummyDevice.createdBy.username}`);

// Check for removed redundant fields
console.log("\n--- Checking for Removed Fields ---");
console.log(`Has 'ip' at root level: ${dummyDevice.hasOwnProperty('ip') ? 'Yes (Problem!)' : 'No (Good!)'}`);
console.log(`Has 'port' at root level: ${dummyDevice.hasOwnProperty('port') ? 'Yes (Problem!)' : 'No (Good!)'}`);
console.log(`Has 'connectionType' at root level: ${dummyDevice.hasOwnProperty('connectionType') ? 'Yes (Problem!)' : 'No (Good!)'}`);
console.log(`Has 'registers' array: ${dummyDevice.hasOwnProperty('registers') ? 'Yes (Problem!)' : 'No (Good!)'}`);
console.log(`Has 'registerRanges' array: ${dummyDevice.hasOwnProperty('registerRanges') ? 'Yes (Problem!)' : 'No (Good!)'}`);
console.log(`Has 'parameterConfigs' array: ${dummyDevice.hasOwnProperty('parameterConfigs') ? 'Yes (Problem!)' : 'No (Good!)'}`);

console.log("\n--- Benefits of New Structure ---");
console.log("1. No duplicate connection information");
console.log("2. Structured data points with clear range and parser organization");
console.log("3. User tracking information included");
console.log("4. Reduced size with no redundant arrays");