# Project Context for Claude

## Project Overview
Device Management System - A React-based frontend client and Node.js backend for monitoring, configuring, and managing industrial devices.

## Key Components
- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, MongoDB
- Features: Device management, user authentication, profile configuration

## Important Commands
- Build: `cd client && npm run build`
- Tests: `cd client && npm test`
- Lint: `cd client && npm run lint`
- Typecheck: `cd client && npm run typecheck`

## Architecture Notes
- Client-side routing with React Router
- Component library in `client/src/components/ui`
- Device management features in `client/src/components/devices`
- New device form implementation in `client/src/components/devices/NewDeviceForm`

## Device Data Structure
- Device objects use the following structure:
  - Core device metadata (name, make, model, description, enabled, tags)
  - Connection settings consolidated in `connectionSetting` object
  - Data points organized in `dataPoints` array with ranges and parsers
  - User tracking with `createdBy` object containing userId, username, and email
  - Legacy fields removed (registers, registerRanges, parameterConfigs)
  
### Example Device Structure
```json
{
  "name": "AC Room 1",
  "make": "Circutor",
  "model": "CVM-C4",
  "description": "Power analyzer for panel monitoring",
  "enabled": true,
  "tags": ["power", "energy"],
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
            "name": "Voltage",
            "dataType": "FLOAT",
            "scalingFactor": 1,
            "decimalPoint": 1,
            "byteOrder": "ABCD",
            "signed": true,
            "registerRange": "Electrical",
            "registerIndex": 0,
            "wordCount": 2
          }
        ]
      }
    }
  ],
  "createdBy": {
    "userId": "user123",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

## Current Work
- Improving device form with validation and better UX
- Implementing Modbus integration for industrial devices
- Optimizing device data structure to remove redundancy
- Adding user tracking to device creation

## Coding Standards
- TypeScript for type safety
- Functional components with hooks
- Unit tests for components and utilities
- Follow existing patterns for new components