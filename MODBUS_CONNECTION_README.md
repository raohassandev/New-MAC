# Modbus Connection Troubleshooting

This document provides information about how to troubleshoot and fix Modbus connection issues with the device test endpoint.

## Problem Background

The device test connection endpoint at `/client/api/devices/:id/test` was returning a 404 error, indicating that the route was not properly registered in the Express server.

## Solution

We have implemented the following fixes and diagnostic tools:

1. **Direct route registration in server.ts**:
   - Added an explicit route for the device test endpoint directly in server.ts
   - This ensures the critical endpoint is available even if there are issues with router mounting

2. **Diagnostic Tools**:
   - Created several scripts to help diagnose and test Modbus connections:
     - `scripts/test-connection.js`: Tests the HTTP endpoint directly
     - `scripts/test-controller.js`: Tests the controller function directly
     - `scripts/print-routes.js`: Shows all registered routes in the Express app
     - `fix-routes.js`: Analyzes the route configuration and suggests fixes

## Testing the Connection

### Using the API Endpoint

```bash
# Run this command with a valid device ID
node scripts/test-connection.js 6819fbe1a6ab6a950571b703
```

### Direct Controller Test

```bash
# Run this command with a valid device ID
node scripts/test-controller.js 6819fbe1a6ab6a950571b703
```

### View All Registered Routes

```bash
# First build the server
npm run build

# Then run the route diagnostic
node scripts/print-routes.js
```

## Understanding Modbus Communication

The Modbus connection process involves:

1. Establishing a connection to the device (TCP or RTU)
2. Setting the slave ID
3. Reading registers using the appropriate function code:
   - FC=1: Read Coils
   - FC=2: Read Discrete Inputs
   - FC=3: Read Holding Registers
   - FC=4: Read Input Registers

For most devices, FC=3 (holding registers) is the most commonly used function code.

## Common Issues and Solutions

1. **404 Not Found Error**:
   - The route is not properly registered
   - Solution: Use the explicit route registration in server.ts

2. **Connection Refused Error**:
   - Device is offline or unreachable
   - Check IP address, port, and network connectivity

3. **Timeout Error**:
   - Device is not responding in time
   - Check device status and increase timeout settings if needed

4. **Function Code Error**:
   - Device doesn't support the requested function code
   - Check device documentation for supported function codes

5. **Register Address Error**:
   - The requested register doesn't exist on the device
   - Check device register map for correct addresses

## Modbus Configuration Best Practices

1. Always specify the correct function code for the registers you want to read
2. Ensure the register address is within the valid range for the device
3. Use appropriate byte order based on device manufacturer:
   - Schneider Electric: ABCD
   - Siemens: BADC
   - Chinese Energy Analyzers: CDAB

## Next Steps

After confirming the test endpoint works:

1. Use the device polling service for continuous data collection
2. Store historical data for analysis
3. Set up alerts for device connectivity issues
