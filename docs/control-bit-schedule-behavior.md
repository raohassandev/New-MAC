# Control Bit and Schedule Behavior

## Overview

This documentation explains how control bits affect schedule operation in the system. Control bits with "Control" in their name act as mode selectors that determine whether schedules are active or inactive for a device.

## Control Bit States

Control bits have two states:

1. **ON (CENTRAL Control)**:
   - Device is in central control mode
   - Scheduled operations are ACTIVE and will execute automatically
   - The device follows pre-programmed schedules without local override

2. **OFF (LOCAL Control)**:
   - Device is in local control mode
   - Scheduled operations are INACTIVE and will not execute
   - The device requires manual operation at the local level
   - Schedules will be skipped until control is set back to CENTRAL

## Implementation Details

### Client-Side

The client-side implementation includes:

1. **Visual Indicators**:
   - A "CENTRAL" badge is displayed for control bits in the ON state
   - A "LOCAL" badge is displayed for control bits in the OFF state
   - A schedule status indicator appears in the device overview section, showing whether schedules are active or inactive

2. **Status Tracking**:
   - The `scheduleControl.ts` utility manages device control status
   - Control bit changes update this state in real-time
   - Events are dispatched when control status changes to notify relevant components

### Server-Side

The server-side implementation includes:

1. **Schedule Processing**:
   - Before executing any scheduled action, the system checks if the device is in CENTRAL control mode
   - If the device is in LOCAL control mode, the scheduled action is skipped
   - Logging indicates when schedules are skipped due to LOCAL control mode

2. **Control Bit Reading**:
   - The `controlBitHelper.ts` utility reads the actual control bit state from devices
   - A caching mechanism prevents excessive requests to devices
   - If a device doesn't have a control bit, it defaults to CENTRAL control mode

## Best Practices

1. Use control bits named with "Control" in their name to manage schedule activation
2. Set control to LOCAL when performing manual maintenance or testing
3. Set control to CENTRAL to resume normal scheduled operation
4. Check the schedule status indicator to confirm the current mode
5. Control bits provide a safe way to temporarily disable automatic operation without deleting schedules

## Troubleshooting

If schedules are not running as expected:

1. Check if the device has a control bit and verify its current state
2. Confirm that the control bit includes "Control" in its name
3. Set the control bit to ON for CENTRAL control if schedules should be active
4. Check server logs for messages indicating schedule processing

## Technical Details

The system identifies control bits by searching for coil data points with "Control" in the name. When toggling these bits, the UI displays "CENTRAL" or "LOCAL" indicators, and the system updates internal state to track whether schedules should execute.

The schedule processor checks this state before executing any scheduled actions, ensuring that devices in LOCAL control mode are not affected by scheduled operations.