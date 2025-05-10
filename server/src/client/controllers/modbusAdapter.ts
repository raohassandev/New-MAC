/**
 * Adapter for connecting legacy modbusHelper with new communication module
 */

import { deviceManager, pollingService, logService } from '../../communication/services';
import { ModbusDevice } from '../../communication/core/device.concrete';
import { ModbusTCPClient } from '../../communication/protocols/modbus/tcp/client';
import { ModbusRTUClient } from '../../communication/protocols/modbus/rtu/client';
import { DataType, ByteOrder, RegisterType } from '../../communication/core/types';
import ModbusRTU from 'modbus-serial';

/**
 * Create a device in the new communication module from the device data
 * @param device The device data from database
 * @returns The created device ID
 */
export async function createDeviceFromData(device: any): Promise<string> {
  try {
    logService.info(`Creating device ${device.name} in communication module`);

    // Determine connection type
    const connectionType =
      device.connectionSetting?.connectionType || device.connectionType || 'tcp';

    let client;

    if (connectionType === 'tcp') {
      const ip = device.connectionSetting?.tcp?.ip || device.ip || '';
      let port = 502; // Default Modbus TCP port

      if (device.connectionSetting?.tcp?.port) {
        port = Number(device.connectionSetting.tcp.port);
      } else if (device.port) {
        port = Number(device.port);
      }

      // Validate port is a reasonable number
      if (isNaN(port) || port <= 0 || port > 65535) {
        port = 502; // Use default Modbus port if invalid
      }

      const slaveId = device.connectionSetting?.tcp?.slaveId || device.slaveId || 1;

      // Create TCP client
      client = new ModbusTCPClient({
        host: ip,
        port,
        unitId: slaveId,
      });
    } else if (connectionType === 'rtu') {
      // RTU connection parameters
      const serialPort = device.connectionSetting?.rtu?.serialPort || device.serialPort || '';
      const baudRate = device.connectionSetting?.rtu?.baudRate || device.baudRate || 9600;
      const dataBits = device.connectionSetting?.rtu?.dataBits || device.dataBits || 8;
      const stopBits = device.connectionSetting?.rtu?.stopBits || device.stopBits || 1;
      const parity = device.connectionSetting?.rtu?.parity || device.parity || 'none';
      const slaveId = device.connectionSetting?.rtu?.slaveId || device.slaveId || 1;

      // Create RTU client
      client = new ModbusRTUClient({
        path: serialPort,
        baudRate,
        dataBits: dataBits as 5 | 6 | 7 | 8,
        stopBits: stopBits as 1 | 2,
        parity: parity as 'none' | 'even' | 'odd',
        unitId: slaveId,
      });
    } else {
      throw new Error(`Unsupported connection type: ${connectionType}`);
    }

    // Create device with parameters from config
    const modbusDevice = new ModbusDevice({
      id: device._id.toString(),
      name: device.name,
      client,
      parameters: [],
      enabled: !!device.enabled,
    });

    // Process data points (new structure)
    if (device.dataPoints && device.dataPoints.length > 0) {
      for (const dataPoint of device.dataPoints) {
        try {
          const range = dataPoint.range;
          const parser = dataPoint.parser;

          if (parser && parser.parameters) {
            for (const param of parser.parameters) {
              // Get the register type based on function code
              let registerType: RegisterType;
              switch (range.fc) {
                case 1:
                  registerType = RegisterType.COIL;
                  break;
                case 2:
                  registerType = RegisterType.DISCRETE_INPUT;
                  break;
                case 3:
                  registerType = RegisterType.HOLDING_REGISTER;
                  break;
                case 4:
                  registerType = RegisterType.INPUT_REGISTER;
                  break;
                default:
                  registerType = RegisterType.HOLDING_REGISTER;
              }

              // Get the data type
              let dataType: DataType;
              let byteOrder: ByteOrder;

              // Helper function to map 4-byte word order
              const map4ByteOrder = (paramByteOrder: string): ByteOrder => {
                switch (paramByteOrder) {
                  case 'ABCD': return ByteOrder.ABCD;
                  case 'CDAB': return ByteOrder.CDAB;
                  case 'BADC': return ByteOrder.BADC;
                  case 'DCBA': return ByteOrder.DCBA;
                  default: return ByteOrder.ABCD;
                }
              };

              // Helper function to map 2-byte word order
              const map2ByteOrder = (paramByteOrder: string): ByteOrder => {
                return paramByteOrder === 'AB' ? ByteOrder.AB : ByteOrder.BA;
              };

              switch (param.dataType) {
                case 'FLOAT32':
                  dataType = DataType.FLOAT32;
                  byteOrder = map4ByteOrder(param.byteOrder || 'ABCD');
                  break;
                case 'INT32':
                  dataType = DataType.INT32;
                  byteOrder = map4ByteOrder(param.byteOrder || 'ABCD');
                  break;
                case 'UINT32':
                  dataType = DataType.UINT32;
                  byteOrder = map4ByteOrder(param.byteOrder || 'ABCD');
                  break;
                case 'INT16':
                  dataType = DataType.INT16;
                  byteOrder = map2ByteOrder(param.byteOrder || 'AB');
                  break;
                case 'UINT16':
                  dataType = DataType.UINT16;
                  byteOrder = map2ByteOrder(param.byteOrder || 'AB');
                  break;
                default:
                  dataType = DataType.UINT16;
                  byteOrder = ByteOrder.AB;
              }

              // Add parameter to device
              modbusDevice.addParameter({
                id: `${param.name}_${param.registerIndex}`,
                name: param.name,
                address: param.registerIndex,
                registerType,
                dataType,
                byteOrder,
                scaling: param.scalingFactor || 1,
                scalingFactor: param.scalingFactor || 1,
                scalingEquation: param.scalingEquation,
                unit: param.unit || '',
                units: param.unit || '',
                description: param.description || '',
              });
            }
          }
        } catch (error) {
          logService.error(`Error processing data point: ${error}`);
        }
      }
    }

    // Process legacy structure
    if (
      device.registers &&
      device.registers.length > 0 &&
      (!device.dataPoints || device.dataPoints.length === 0)
    ) {
      for (const register of device.registers) {
        try {
          // Add parameter for legacy register
          modbusDevice.addParameter({
            id: `${register.name}_${register.address}`,
            name: register.name,
            address: register.address,
            registerType: RegisterType.HOLDING_REGISTER,
            dataType: DataType.UINT16,
            byteOrder: ByteOrder.AB,
            scaling: register.scaleFactor ? 1 / register.scaleFactor : 1,
            scalingFactor: register.scaleFactor ? 1 / register.scaleFactor : 1,
            unit: register.unit || '',
            units: register.unit || '',
          });
        } catch (error) {
          logService.error(`Error processing legacy register: ${error}`);
        }
      }
    }

    // Register the device with the device manager
    const deviceId = deviceManager.registerDevice(modbusDevice);

    return deviceId;
  } catch (error) {
    logService.error(`Failed to create device in communication module: ${error}`);
    throw error;
  }
}

/**
 * Start polling for a device using the new communication module
 * @param deviceId The device ID
 * @param intervalMs The polling interval in milliseconds
 * @returns True if polling started successfully
 */
export function startDevicePolling(deviceId: string, intervalMs = 3000): boolean {
  try {
    // First check if the device is registered
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      logService.warn(`Cannot start polling for device ${deviceId}: Device not registered`);
      return false;
    }

    // Start polling with the new polling service
    pollingService.startPolling(deviceId, intervalMs);

    logService.info(`Started polling for device ${deviceId} at ${intervalMs}ms interval`);
    return true;
  } catch (error) {
    logService.error(`Failed to start polling for device ${deviceId}: ${error}`);
    return false;
  }
}

/**
 * Stop polling for a device using the new communication module
 * @param deviceId The device ID
 * @returns True if polling stopped successfully
 */
export function stopDevicePolling(deviceId: string): boolean {
  try {
    // Stop polling with the new polling service
    pollingService.stopPolling(deviceId);

    logService.info(`Stopped polling for device ${deviceId}`);
    return true;
  } catch (error) {
    logService.error(`Failed to stop polling for device ${deviceId}: ${error}`);
    return false;
  }
}

/**
 * Wrapper to make ModbusRTU library use our new communication module for reading
 * This provides backward compatibility for existing code
 * @param client The ModbusRTU client instance
 * @param address The register address to read
 * @param length The number of registers to read
 * @param deviceId The device ID to use for the new module
 * @returns The read result
 */
export async function readHoldingRegistersWithNewModule(
  client: ModbusRTU,
  address: number,
  length: number,
  deviceId: string,
): Promise<any> {
  try {
    // Get device from device manager
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found in device manager`);
    }

    // Check if device is a ModbusDevice with readMultipleRegisters method
    if (!device || typeof device.readMultipleRegisters !== 'function') {
      throw new Error(`Device ${deviceId} does not support reading multiple registers`);
    }

    // Read parameters from the device
    const values = await device.readMultipleRegisters(
      RegisterType.HOLDING_REGISTER,
      address,
      length,
    );

    console.log('---device.readMultipleRegisters--values');

    // Format the result to match ModbusRTU format
    return {
      data: values,
      buffer: null, // We don't need buffer for most operations
    };
  } catch (error) {
    logService.error(`Error reading holding registers: ${error}`);
    throw error;
  }
}
