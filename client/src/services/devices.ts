
import { deviceApi } from '../api/endpoints';
import { Device as BaseDevice, ConnectionSetting, DataPoint } from '../types/device.types';

// Extend the base Device interface for the service
export interface Device extends BaseDevice {
  // Ensure connectionSetting is included and required
  connectionSetting: ConnectionSetting;
  // Ensure dataPoints is included
  dataPoints: DataPoint[];
  // Ensure tags is always required for the service layer
  tags: string[];
  // Ensure make and model are required for the service layer
  make: string;
  model: string;
  // New fields for device driver integration
  deviceDriverId: string;
  // New metadata fields
  usage: string; // Usage category ID
  usageNotes: string;
  location: string;
  // User tracking information
  createdBy?: {
    userId: string;
    username: string;
    email: string;
  };
}

// Define the service response type
export interface DeviceServiceResponse {
  success: boolean;
  message: string;
  data?: Device | Device[];
}

// Define a type guard to check if an object is a Device
export function isDevice(obj: any): obj is Device {
  return (
    obj && typeof obj === 'object' && typeof obj._id === 'string' && typeof obj.name === 'string'
  );
}

// Helper function to ensure all required properties are defined
export function ensureDeviceProperties(device: BaseDevice): Device {
  // Extract connection settings from the device object
  let connectionSetting = device.connectionSetting;
  
  // If connectionSetting doesn't exist or is missing required properties, create it
  if (!connectionSetting || (!connectionSetting.tcp && !connectionSetting.rtu)) {
    // Handle connectionType - ensure it's a valid literal type
    const connType = (device.connectionType === 'rtu') ? 'rtu' : 'tcp';
    
    // Create a properly typed connection setting object
    connectionSetting = {
      connectionType: connType,
      tcp: {
        ip: device.ip || '',
        port: typeof device.port === 'number' ? device.port : 502,
        slaveId: typeof device.slaveId === 'number' ? device.slaveId : 1
      },
      rtu: {
        serialPort: device.serialPort || '',
        baudRate: typeof device.baudRate === 'number' ? device.baudRate : 9600,
        dataBits: typeof device.dataBits === 'number' ? device.dataBits : 8,
        stopBits: typeof device.stopBits === 'number' ? device.stopBits : 1,
        parity: device.parity || 'none',
        slaveId: typeof device.slaveId === 'number' ? device.slaveId : 1
      }
    };
  }

  // Ensure dataPoints exist
  const dataPoints = device.dataPoints || [];

  return {
    ...device,
    connectionSetting,
    dataPoints,
    tags: device.tags || [],
    make: device.make || '',
    model: device.model || '',
    createdBy: device.createdBy,
    deviceDriverId: device.deviceDriverId || '',
    usage: device.usage || '',
    usageNotes: device.usageNotes || '',
    location: device.location || '',
  };
}

// Function to convert service Device to BaseDevice
export function convertToBaseDevice(serviceDevice: Device): BaseDevice {
  // Extract properties that match the BaseDevice interface
  const {
    _id,
    name,
    enabled,
    lastSeen,
    make,
    model,
    description,
    tags,
    connectionSetting,
    dataPoints,
    deviceDriverId,
    usage,
    usageNotes,
    location,
    createdBy,
    createdAt,
    updatedAt,
  } = serviceDevice;

  return {
    _id,
    name,
    enabled,
    lastSeen,
    make,
    model,
    description,
    tags,
    connectionSetting,
    dataPoints,
    deviceDriverId,
    usage,
    usageNotes,
    location,
    createdBy,
    createdAt,
    updatedAt,
  };
}

// Sample devices for testing and development
const SAMPLE_DEVICES: Device[] = [
  {
    _id: 'sample_device_1',
    name: 'AC Room 1',
    enabled: true,
    make: 'CVM',
    model: 'C4 TPM30',
    isTemplate: false, // Important: explicitly mark as NOT a template
    tags: ['power', 'HVAC'],
    connectionSetting: {
      connectionType: 'tcp',
      tcp: {
        ip: '192.168.1.191',
        port: 502,
        slaveId: 1
      },
      rtu: {
        serialPort: '',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        slaveId: 1
      }
    },
    dataPoints: [
      {
        range: {
          startAddress: 0,
          count: 2,
          fc: 3,
        },
        parser: {
          parameters: [
            {
              name: 'Voltage',
              dataType: 'FLOAT',
              scalingFactor: 1,
              decimalPoint: 1,
              byteOrder: 'ABCD',
              signed: true,
              registerRange: 'Main',
              registerIndex: 0,
              wordCount: 2
            }
          ]
        }
      }
    ],
    // New required fields
    deviceDriverId: 'sample_driver_1',
    usage: 'energy_analysis',
    usageNotes: 'Sample energy analyzer for demo purposes',
    location: 'Main Building, Room 101',
    // User information
    createdBy: {
      userId: 'demo_user_id',
      username: 'Demo User',
      email: 'demo@example.com'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeen: new Date(),
    description: '',
  },
  {
    _id: 'sample_device_2',
    name: 'Solar Inverter',
    enabled: true,
    make: 'Huawei',
    model: '110 KTL M2',
    isTemplate: false, // Important: explicitly mark as NOT a template
    tags: ['solar', 'power'],
    connectionSetting: {
      connectionType: 'rtu',
      tcp: {
        ip: '',
        port: 502,
        slaveId: 1
      },
      rtu: {
        serialPort: 'COM2',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        slaveId: 1
      }
    },
    dataPoints: [
      {
        range: {
          startAddress: 0,
          count: 2,
          fc: 3,
        },
        parser: {
          parameters: [
            {
              name: 'DC Voltage',
              dataType: 'FLOAT',
              scalingFactor: 1,
              decimalPoint: 1,
              byteOrder: 'ABCD',
              signed: true,
              registerRange: 'Main',
              registerIndex: 0,
              wordCount: 2
            }
          ]
        }
      }
    ],
    // New required fields
    deviceDriverId: 'sample_driver_2',
    usage: 'power_source',
    usageNotes: 'Sample solar inverter for demo purposes',
    location: 'Rooftop, Panel 3',
    // User information
    createdBy: {
      userId: 'demo_user_id',
      username: 'Demo User',
      email: 'demo@example.com'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeen: new Date(),
    description: '',
  },
];

// Export functions that integrate with the backend API using the unified endpoint helpers
export async function getDevices(): Promise<any> {
  try {
    // Use the deviceApi from endpoints.ts
    const response = await deviceApi.getDevices();
    
    // If it's a direct response with data property containing the paginated structure
    if (response && response.data && response.data.devices) {
      return response.data; // Return the whole pagination object with devices, not just devices array
    }
    
    // If response.data is an array
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    // If response itself is the array
    if (Array.isArray(response)) {
      return response;
    }
    
    // Special case for MongoDB cursor in raw response
    if (response && typeof response === 'object') {
      return response; // Return the whole object so caller can handle MongoDB cursor
    }
    
    // If no devices are returned, return empty array instead of sample devices
    console.warn('No devices returned from API or unexpected format, returning empty array');
    return { devices: [], pagination: { total: 0, page: 1, limit: 50, pages: 1 } };
  } catch (error) {
    console.error('Error fetching devices from API:', error);
    // Return empty array instead of sample devices
    return { devices: [], pagination: { total: 0, page: 1, limit: 50, pages: 1 } };
  }
}

export async function getDevice(id: string): Promise<Device> {
  try {
    // Use the deviceApi from endpoints.ts
    const response = await deviceApi.getDeviceById(id);
    return response.data || response;
  } catch (error) {
    console.error('Error getting device from API:', error);
    throw new Error('Failed to get device');
  }
}

export async function addDevice(device: BaseDevice): Promise<Device> {
  try {
    console.log('[devices.ts] addDevice called with:', device);
    
    // Ensure all required properties are present
    const preparedDevice = ensureDeviceProperties(device);
    
    console.log('[devices.ts] Prepared device data:', preparedDevice);

    // Use the deviceApi from endpoints.ts
    console.log('[devices.ts] Calling deviceApi.createDevice');
    const response = await deviceApi.createDevice(preparedDevice);
    
    console.log('[devices.ts] Device created successfully:', response);
    
    // Return response data or response itself
    return response.data || response;
  } catch (error: any) {
    console.error('[devices.ts] Error adding device to API:', error);
    console.error('[devices.ts] Error details:', error.response?.data || error.message);
    throw error;
  }
}

export async function updateDevice(device: Partial<Device> & { _id: string }): Promise<Device> {
  try {
    // Use the deviceApi from endpoints.ts
    const response = await deviceApi.updateDevice(device._id, device);
    return response.data || response;
  } catch (error) {
    console.error('Error updating device via API:', error);
    throw new Error('Failed to update device');
  }
}

export async function deleteDevice(id: string): Promise<boolean> {
  try {
    // Use the deviceApi from endpoints.ts
    const response = await deviceApi.deleteDevice(id);
    // Check if response has data property (AxiosResponse)
    if (response.data) {
      return true;
    }
    // For direct response objects
    return true;
  } catch (error) {
    console.error('Error deleting device via API:', error);
    throw new Error('Failed to delete device');
  }
}

export async function testConnection(id: string): Promise<{ 
  success: boolean; 
  message: string; 
  error?: string; 
  errorType?: string;
  troubleshooting?: string;
  deviceInfo?: any 
}> {
  try {
    // Use the deviceApi from endpoints.ts
    const response = await deviceApi.testConnection(id);
    return response.data || response;
  } catch (error: any) {
    console.error('Error testing device connection via API:', error);
    
    // Extract detailed error message from response if available
    let errorMessage = 'Connection test failed';
    let errorDetails = null;
    let deviceInfo = null;
    let errorType = null;
    let troubleshooting = null;
    
    if (error.response && error.response.data) {
      // API returned an error response with data
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      if (error.response.data.error) {
        errorDetails = error.response.data.error;
      }
      if (error.response.data.deviceInfo) {
        deviceInfo = error.response.data.deviceInfo;
      }
      if (error.response.data.errorType) {
        errorType = error.response.data.errorType;
      }
      if (error.response.data.troubleshooting) {
        troubleshooting = error.response.data.troubleshooting;
      }
    } else if (error.message) {
      // Network or client-side error
      errorMessage = `Connection test failed: ${error.message}`;
    }
    
    return { 
      success: false, 
      message: errorMessage,
      error: errorDetails,
      errorType: errorType,
      troubleshooting: troubleshooting,
      deviceInfo: deviceInfo
    };
  }
}
