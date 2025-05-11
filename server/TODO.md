# MacSys Backend Implementation Guide

## 1. Implementing PLC Register Write Capabilities

The current system focuses primarily on reading data from PLCs, but lacks robust write functionality. This document outlines how to implement write operations for AC control.

### Required Modbus Write Functions

Extend the `device.service.ts` module to include these essential write operations:

- **writeSingleRegister**: Modify a single holding register (Function Code 06)
- **writeMultipleRegisters**: Modify multiple consecutive holding registers (Function Code 16)
- **writeCoil**: Control discrete outputs (Function Code 05)
- **writeMultipleCoils**: Control multiple discrete outputs (Function Code 15)

### Implementation Approach

1. **ModbusClient Write Extension**:
   - Create a new service module (`deviceControl.service.ts`) focused on write operations
   - Implement safety mechanisms (validation, confirmation, retry) around write operations
   - Handle the byte order transformations required for different data types

2. **Register Mapping Configuration**:
   - Extend the existing device schema to include writable registers and their specifications
   - Define control parameters with constraints (min/max values, resolution)
   - Map UI controls to specific registers and data formats

3. **Write Operation Workflow**:
   - Implement validation logic to verify commands before sending
   - Develop a confirmation process (read-after-write verification)
   - Create a transaction log for all write operations
   - Implement proper error handling for failed write attempts

4. **API Endpoints**:
   - Add `POST /api/devices/:id/control` for sending control commands
   - Add `PUT /api/devices/:id/setpoint/:parameter` for specific parameter adjustments
   - Create batch operation endpoint `POST /api/devices/batch-control` for multiple device commands

### Value Translation Logic

Extend the existing register processing functions to handle writes:

```
// Pseudocode for implementation approach
function writeFloat32Value(client, address, value, byteOrder) {
   // 1. Validate the value against constraints
   // 2. Create buffer and apply correct byte order
   // 3. Split into two registers
   // 4. Write to device
   // 5. Verify write was successful
}
```

## 2. Core Operational Features

Focus on implementing these essential operational features:

### Temperature Control

- **Setpoint Management**:
  - Read/write temperature setpoints
  - Support for cooling and heating setpoints
  - Setpoint limits and validation
  - Historical setpoint tracking

- **Mode Control**:
  - Operation mode switching (Cool, Heat, Fan, Auto)
  - Mode-specific parameter configurations
  - Mode status monitoring and feedback

### Simple Scheduling

- **Basic Time-Based Scheduling**:
  - Simple schedule data model
  - Schedule execution service
  - Override mechanisms
  - Schedule import/export functionality

### Fan and Flow Control

- **Fan Speed Management**:
  - Variable fan speed control
  - Auto/manual fan mode
  - Fan-only operation support
  - Minimum/maximum airflow constraints

### System Status & Control

- **Operational State Management**:
  - System on/off control
  - Status monitoring and alerts
  - Remote reset capabilities
  - Emergency override protocols

### Zone Control

- **Multi-Zone Management**:
  - Zone definition and grouping
  - Zone-level setpoints and modes
  - Zone scheduling
  - Zone status dashboards

### Authentication for Control Actions

- **Authorization Framework**:
  - Permission levels for control actions
  - Role-based access for critical operations
  - Audit logging for all control activities
  - Approval workflows for significant changes

## Implementation Strategy

1. **Start with Single Register Writes**:
   Focus first on implementing and testing the basic write capabilities using simple setpoint adjustments.

2. **Add Transactional Safety**:
   Implement read-back verification to ensure commands were properly executed.

3. **Develop Control Primitives**:
   Create high-level functions for common operations (setTemperature, setMode, etc.).

4. **Build Advanced Features**:
   Once basic control is stable, implement scheduling and zone management.

5. **Implement Service Layer**:
   Create a clean service abstraction between controllers and Modbus communication.

## Data Model Extensions

The existing `DeviceSchema` needs these extensions:

- Add `writableRegisters` array for control registers
- Create `controlParameters` schema for mapping UI controls to registers
- Implement `controlPermissions` to manage access control
- Add `schedulingConfiguration` for time-based controls
- Create `verificationStrategy` for write confirmation approach

## Testing Considerations

- Create a PLC simulator for testing write operations safely
- Implement mocking for ModbusRTU client in unit tests
- Develop integration test suite with real-world device scenarios
- Create stress tests for concurrent write operations