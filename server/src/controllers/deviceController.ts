import { Request, Response } from 'express';

import { Device } from '../models';
import ModbusRTU from 'modbus-serial';

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
export const getDevices = async (req: Request, res: Response) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (error: any) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get a single device
// @route   GET /api/devices/:id
// @access  Private
export const getDeviceById = async (req: Request, res: Response) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json(device);
  } catch (error: any) {
    console.error('Get device error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new device
// @route   POST /api/devices
// @access  Private (Admin/Engineer)
export const createDevice = async (req: Request, res: Response) => {
  try {
    const device = await Device.create(req.body);
    res.status(201).json(device);
  } catch (error: any) {
    console.error('Create device error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a device
// @route   PUT /api/devices/:id
// @access  Private (Admin/Engineer)
export const updateDevice = async (req: Request, res: Response) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Update device
    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updatedDevice);
  } catch (error: any) {
    console.error('Update device error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a device
// @route   DELETE /api/devices/:id
// @access  Private (Admin/Engineer)
export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    await device.deleteOne();

    res.json({ message: 'Device removed', id: req.params.id });
  } catch (error: any) {
    console.error('Delete device error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Test connection to a device
// @route   POST /api/devices/:id/test
// @access  Private
export const testDeviceConnection = async (req: Request, res: Response) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (!device.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Device is disabled',
      });
    }

    // Test Modbus connection
    const client = new ModbusRTU();
    try {
      // Get connection settings (support both new and legacy format)
      const connectionType = device.connectionSetting?.connectionType || device.connectionType || 'tcp';
      const ip = device.connectionSetting?.ip || device.ip;
      const port = device.connectionSetting?.port || device.port;
      const slaveId = device.connectionSetting?.slaveId || device.slaveId;
      const serialPort = device.connectionSetting?.serialPort || device.serialPort;
      const baudRate = device.connectionSetting?.baudRate || device.baudRate;
      const dataBits = device.connectionSetting?.dataBits || device.dataBits;
      const stopBits = device.connectionSetting?.stopBits || device.stopBits;
      const parity = device.connectionSetting?.parity || device.parity;

      // Connect based on connection type
      if (connectionType === 'tcp' && ip && port) {
        await client.connectTCP(ip, { port });
      } else if (connectionType === 'rtu' && serialPort) {
        const rtuOptions: any = {};
        if (baudRate) rtuOptions.baudRate = baudRate;
        if (dataBits) rtuOptions.dataBits = dataBits;
        if (stopBits) rtuOptions.stopBits = stopBits;
        if (parity) rtuOptions.parity = parity;
        
        await client.connectRTUBuffered(serialPort, rtuOptions);
      } else {
        throw new Error('Invalid connection configuration');
      }
      
      if (slaveId !== undefined) {
        client.setID(slaveId);
      } else {
        client.setID(1); // Default slave ID
      }

      // Try to read a register from first dataPoint or legacy register
      let address = 0;
      let functionCode = 3; // Default to readHoldingRegisters
      
      if (device.dataPoints && device.dataPoints.length > 0) {
        address = device.dataPoints[0].range.startAddress;
        functionCode = device.dataPoints[0].range.fc;
      } else if (device.registers && device.registers.length > 0) {
        address = device.registers[0].address;
      }

      // Read register based on function code
      switch (functionCode) {
        case 1:
          await client.readCoils(address, 1);
          break;
        case 2:
          await client.readDiscreteInputs(address, 1);
          break;
        case 3:
          await client.readHoldingRegisters(address, 1);
          break;
        case 4:
          await client.readInputRegisters(address, 1);
          break;
        default:
          await client.readHoldingRegisters(address, 1);
      }

      // Update device lastSeen timestamp
      device.lastSeen = new Date();
      await device.save();

      res.json({
        success: true,
        message: 'Successfully connected to device',
      });
    } catch (modbusError: any) {
      console.error('Modbus connection error:', modbusError);
      res.status(400).json({
        success: false,
        message: `Connection failed: ${modbusError.message}`,
      });
    } finally {
      // Close the connection
      client.close();
    }
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Read registers from a device
// @route   GET /api/devices/:id/read
// @access  Private
export const readDeviceRegisters = async (req: Request, res: Response) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (!device.enabled) {
      return res.status(400).json({ message: 'Device is disabled' });
    }

    // Check if device has any configuration for reading
    const hasNewConfig = device.dataPoints && device.dataPoints.length > 0;
    const hasLegacyConfig = device.registers && device.registers.length > 0;
    
    if (!hasNewConfig && !hasLegacyConfig) {
      return res
        .status(400)
        .json({ message: 'No data points or registers configured for this device' });
    }

    // Get connection settings (support both new and legacy format)
    const connectionType = device.connectionSetting?.connectionType || device.connectionType || 'tcp';
    const ip = device.connectionSetting?.ip || device.ip;
    const port = device.connectionSetting?.port || device.port;
    const slaveId = device.connectionSetting?.slaveId || device.slaveId;
    const serialPort = device.connectionSetting?.serialPort || device.serialPort;
    const baudRate = device.connectionSetting?.baudRate || device.baudRate;
    const dataBits = device.connectionSetting?.dataBits || device.dataBits;
    const stopBits = device.connectionSetting?.stopBits || device.stopBits;
    const parity = device.connectionSetting?.parity || device.parity;

    // Initialize Modbus client
    const client = new ModbusRTU();
    const readings: any[] = [];

    try {
      // Connect based on connection type
      if (connectionType === 'tcp' && ip && port) {
        await client.connectTCP(ip, { port });
      } else if (connectionType === 'rtu' && serialPort) {
        const rtuOptions: any = {};
        if (baudRate) rtuOptions.baudRate = baudRate;
        if (dataBits) rtuOptions.dataBits = dataBits;
        if (stopBits) rtuOptions.stopBits = stopBits;
        if (parity) rtuOptions.parity = parity;
        
        await client.connectRTUBuffered(serialPort, rtuOptions);
      } else {
        throw new Error('Invalid connection configuration');
      }
      
      if (slaveId !== undefined) {
        client.setID(slaveId);
      } else {
        client.setID(1); // Default slave ID
      }

      // NEW STRUCTURE: Read each data point
      if (hasNewConfig && device.dataPoints) {
        for (const dataPoint of device.dataPoints) {
          try {
            const range = dataPoint.range;
            const parser = dataPoint.parser;
            
            // Read registers based on function code
            let result;
            switch (range.fc) {
              case 1:
                result = await client.readCoils(range.startAddress, range.count);
                break;
              case 2:
                result = await client.readDiscreteInputs(range.startAddress, range.count);
                break;
              case 3:
                result = await client.readHoldingRegisters(range.startAddress, range.count);
                break;
              case 4:
                result = await client.readInputRegisters(range.startAddress, range.count);
                break;
              default:
                result = await client.readHoldingRegisters(range.startAddress, range.count);
            }

            // Process the result based on parser configuration
            if (parser && parser.parameters) {
              for (const param of parser.parameters) {
                try {
                  // Get the register index relative to the range start
                  const relativeIndex = param.registerIndex - range.startAddress;
                  
                  if (relativeIndex < 0 || relativeIndex >= range.count) {
                    continue; // Skip if out of range
                  }

                  let value = result.data[relativeIndex];

                  // Apply scaling factor if defined
                  if (param.scalingFactor && param.scalingFactor !== 1 && typeof value === 'number') {
                    value = value * param.scalingFactor;
                  }

                  // Apply scaling equation if defined
                  if (param.scalingEquation) {
                    try {
                      // Simple equation evaluation (x is the value)
                      const x = value;
                      // Use Function constructor to safely evaluate the equation
                      value = new Function('x', `return ${param.scalingEquation}`)(x);
                    } catch (equationError) {
                      console.error('Scaling equation error:', equationError);
                    }
                  }

                  // Format decimal places if defined
                  if (param.decimalPoint && param.decimalPoint > 0 && typeof value === 'number') {
                    value = parseFloat(value.toFixed(param.decimalPoint));
                  }

                  readings.push({
                    name: param.name,
                    registerIndex: param.registerIndex,
                    value: value,
                    unit: param.unit || '',
                    dataType: param.dataType,
                  });
                } catch (paramError: any) {
                  readings.push({
                    name: param.name,
                    registerIndex: param.registerIndex,
                    value: null,
                    unit: param.unit || '',
                    error: paramError.message,
                  });
                }
              }
            }
          } catch (rangeError: any) {
            console.error(`Error reading range (${dataPoint.range.startAddress}-${dataPoint.range.startAddress + dataPoint.range.count - 1}):`, rangeError);
            // Continue to next range even if this one fails
          }
        }
      } 
      // LEGACY STRUCTURE: Read each configured register
      else if (hasLegacyConfig && device.registers) {
        for (const register of device.registers) {
          try {
            const result = await client.readHoldingRegisters(
              register.address,
              register.length
            );

            // Process the result based on register configuration
            let value = result.data[0];

            // Apply scale factor if defined
            if (register.scaleFactor && register.scaleFactor !== 1) {
              value = value / register.scaleFactor;
            }

            // Format decimal places if defined
            if (register.decimalPoint && register.decimalPoint > 0) {
              value = parseFloat(value.toFixed(register.decimalPoint));
            }

            readings.push({
              name: register.name,
              address: register.address,
              value: value,
              unit: register.unit || '',
            });
          } catch (registerError: any) {
            readings.push({
              name: register.name,
              address: register.address,
              value: null,
              unit: register.unit || '',
              error: registerError.message,
            });
          }
        }
      }

      // Update device lastSeen timestamp
      device.lastSeen = new Date();
      await device.save();

      res.json({
        deviceId: device._id,
        deviceName: device.name,
        timestamp: new Date(),
        readings,
      });
    } catch (modbusError: any) {
      console.error('Modbus reading error:', modbusError);
      res.status(400).json({
        message: `Failed to read from device: ${modbusError.message}`,
      });
    } finally {
      // Close the connection
      client.close();
    }
  } catch (error: any) {
    console.error('Read registers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
