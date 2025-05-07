import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  RefreshCw,
  Trash,
  AlertCircle,
  CheckCircle,
  Server,
  HardDrive,
  Settings,
  Activity,
  FileText,
  List,
  Save,
  Zap,
  Clock,
  Database,
  TerminalSquare,
  Radio,
  Eye,
  EyeOff,
  Send,
  XCircle,
  Wifi,
  DownloadCloud,
  UploadCloud,
  ArrowDownCircle,
  ArrowUpCircle,
  Info,
} from 'lucide-react';
import { useDevices } from '../hooks/useDevices';
import { useAuth } from '../context/AuthContext';
import { Device, DeviceReading } from '../types/device.types';
import { ConnectionErrorDisplay } from '../components/ui';

const DeviceDetails: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { getDevice, updateDevice, deleteDevice, testConnection, readRegisters } = useDevices();
  const { user } = useAuth();

  const [device, setDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [readingData, setReadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    error?: string;
    errorType?: string;
    troubleshooting?: string;
    deviceInfo?: {
      name?: string;
      connectionType?: string;
      address?: string;
    }
  } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedDevice, setEditedDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'registers' | 'readings' | 'advanced' | 'edit'>(
    'details'
  );
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  // Communication monitoring and status
  const [showMonitoring, setShowMonitoring] = useState<boolean>(false);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const communicationLogRef = useRef<HTMLDivElement>(null);
  
  // Auto-polling settings
  const [autoPolling] = useState<boolean>(false);
  const [pollingInterval] = useState<number>(1000); // 1 second default
  const pollingTimerRef = useRef<number | null>(null);
  
  // Specific status for current operations
  const [communicationStatus, setCommunicationStatus] = useState<{
    type: 'idle' | 'sending' | 'success' | 'error';
    operation?: string;
    timestamp: Date;
    message?: string;
  }>({
    type: 'idle',
    timestamp: new Date()
  });

  // Define communication log type
  type CommunicationLog = {
    id: string;
    type: 'request' | 'response' | 'error' | 'info';
    operation: string;
    timestamp: Date;
    message: string;
    details?: any;
  };

  // Permissions
  const userPermissions = user?.permissions || [];
  const canEditDevices =
    userPermissions.includes('manage_devices') || userPermissions.includes('edit_devices');
  const canDeleteDevices =
    userPermissions.includes('manage_devices') || userPermissions.includes('delete_devices');
  const canTestDevices =
    userPermissions.includes('manage_devices') || userPermissions.includes('test_devices');

  useEffect(() => {
    const fetchDeviceData = async () => {
      if (!deviceId) return;

      try {
        setLoading(true);
        setError(null);

        const deviceData = await getDevice(deviceId);
        setDevice(deviceData);
        setEditedDevice({ ...deviceData });
      } catch (err: any) {
        console.error('Error fetching device:', err);
        setError(err.message || 'Failed to fetch device details');
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceData();
  }, [deviceId]); // Removed getDevice from dependencies to prevent infinite loop
  
  // Set up auto-polling of device data
  useEffect(() => {
    // Clean up existing timer if any
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    
    // Only set up polling if enabled and we have a valid device
    if (autoPolling && deviceId && device) {
      console.log(`Starting auto-polling every ${pollingInterval}ms for device ${device.name}`);
      
      // Create a new interval that calls the read registers function
      pollingTimerRef.current = window.setInterval(() => {
        console.log(`Auto-polling: Fetching data for device ${device.name}...`);
        // Use the async function with silent success (don't show success message on each poll)
        handleReadRegistersAsync(false);
      }, pollingInterval);
    }
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [autoPolling, pollingInterval, deviceId, device]);

  const handleBack = () => {
    navigate('/devices');
  };

  const handleEdit = () => {
    setActiveTab('edit');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editedDevice) return;

    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      await updateDevice(editedDevice);
      setDevice(editedDevice);
      setIsEditing(false);
      setActiveTab('details');
      setSuccess('Device updated successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating device:', err);
      setError(err.message || 'Failed to update device');
      
      if (err.response && err.response.data) {
        setErrorDetails({
          message: err.response.data.message || 'Failed to update device',
          error: err.response.data.error,
          deviceInfo: {
            name: editedDevice.name,
            connectionType: editedDevice.connectionSetting?.connectionType,
            address: editedDevice.connectionSetting?.connectionType === 'tcp' 
              ? `${editedDevice.connectionSetting?.tcp?.ip}:${editedDevice.connectionSetting?.tcp?.port}` 
              : editedDevice.connectionSetting?.rtu?.serialPort
          }
        });
      } else {
        setErrorDetails({
          message: err.message || 'Failed to update device',
          deviceInfo: {
            name: editedDevice.name
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedDevice({ ...device } as Device);
    setIsEditing(false);
    setActiveTab('details');
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      await deleteDevice(deviceId);
      navigate('/devices');
    } catch (err: any) {
      console.error('Error deleting device:', err);
      setError(err.message || 'Failed to delete device');
      setLoading(false);
    }
  };

  // Helper function to add a log entry
  const addCommunicationLog = (log: Omit<CommunicationLog, 'id' | 'timestamp'>) => {
    const logEntry = {
      ...log,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date()
    };
    
    setCommunicationLogs(prev => {
      const newLogs = [...prev, logEntry];
      // Keep only the most recent 100 logs
      if (newLogs.length > 100) {
        return newLogs.slice(newLogs.length - 100);
      }
      return newLogs;
    });
    
    // Scroll to bottom of logs
    setTimeout(() => {
      if (communicationLogRef.current) {
        communicationLogRef.current.scrollTop = communicationLogRef.current.scrollHeight;
      }
    }, 100);
  };

  // Clear communication logs
  const clearCommunicationLogs = () => {
    setCommunicationLogs([]);
    addCommunicationLog({
      type: 'info',
      operation: 'system',
      message: 'Communication logs cleared'
    });
  };

  const handleTestConnection = async () => {
    if (!deviceId || !device) return;

    try {
      setTestingConnection(true);
      setError(null);
      setErrorDetails(null);
      setSuccess(null);
      
      // Update communication status
      setCommunicationStatus({
        type: 'sending',
        operation: 'Connection Test',
        timestamp: new Date(),
        message: `Testing connection to ${device.name}`
      });
      
      // Add to logs
      addCommunicationLog({
        type: 'request',
        operation: 'Connection Test',
        message: `Request: Test connection to device ${device.name}`,
        details: {
          deviceId: deviceId,
          connectionType: device.connectionSetting?.connectionType,
          address: device.connectionSetting?.connectionType === 'tcp' 
            ? `${device.connectionSetting?.tcp?.ip}:${device.connectionSetting?.tcp?.port}` 
            : device.connectionSetting?.rtu?.serialPort
        }
      });

      // Call the API endpoint via useDevices hook
      const result = await testConnection(deviceId);
      
      if (result.success) {
        setSuccess(result.message || 'Connection test successful');
        
        // Update communication status
        setCommunicationStatus({
          type: 'success',
          operation: 'Connection Test',
          timestamp: new Date(),
          message: result.message || 'Connection test successful'
        });
        
        // Add to logs
        addCommunicationLog({
          type: 'response',
          operation: 'Connection Test',
          message: `Response: ${result.message || 'Connection test successful'}`,
          details: result
        });
        
        // Only clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
          // Reset communication status after a delay
          setTimeout(() => {
            setCommunicationStatus({
              type: 'idle',
              timestamp: new Date()
            });
          }, 2000);
        }, 3000);
      } else {
        // Store the detailed error information
        setErrorDetails({
          message: result.message || 'Connection test failed',
          error: result.error || undefined,
          errorType: result.errorType || undefined,
          troubleshooting: result.troubleshooting || undefined,
          deviceInfo: result.deviceInfo || undefined
        });
        
        // Also set simple error message for backward compatibility
        setError(result.message || 'Connection test failed');
        
        // Update communication status
        setCommunicationStatus({
          type: 'error',
          operation: 'Connection Test',
          timestamp: new Date(),
          message: result.message || 'Connection test failed'
        });
        
        // Add to logs
        addCommunicationLog({
          type: 'error',
          operation: 'Connection Test',
          message: `Error: ${result.message || 'Connection test failed'}`,
          details: result
        });
      }
    } catch (err: any) {
      console.error('Error testing connection:', err);
      // Keep error message persistently displayed
      setError(err.message || 'Connection test failed');
      setErrorDetails({
        message: err.message || 'Connection test failed',
      });
      
      // Update communication status
      setCommunicationStatus({
        type: 'error',
        operation: 'Connection Test',
        timestamp: new Date(),
        message: err.message || 'Connection test failed'
      });
      
      // Add to logs
      addCommunicationLog({
        type: 'error',
        operation: 'Connection Test',
        message: `Exception: ${err.message || 'Connection test failed'}`,
        details: err
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Memoized function to read registers to avoid recreation on every render
  const handleReadRegistersAsync = useCallback(async (showSuccess = true) => {
    if (!deviceId || !device) return;

    try {
      setReadingData(true);
      if (showSuccess) {
        setError(null);
        setErrorDetails(null);
        setSuccess(null);
      }
      
      // Update communication status
      setCommunicationStatus({
        type: 'sending',
        operation: 'Read Data',
        timestamp: new Date(),
        message: `Reading data from ${device.name}`
      });
      
      // Add to logs
      addCommunicationLog({
        type: 'request',
        operation: 'Read Data',
        message: `Request: Reading data from device ${device.name}`,
        details: {
          deviceId: deviceId,
          registers: device.registers?.map(r => r.name) || [],
          connectionType: device.connectionSetting?.connectionType,
          address: device.connectionSetting?.connectionType === 'tcp' 
            ? `${device.connectionSetting?.tcp?.ip}:${device.connectionSetting?.tcp?.port}` 
            : device.connectionSetting?.rtu?.serialPort
        }
      });

      // Call the actual API endpoint via the readRegisters function
      try {
        const result = await readRegisters(deviceId);
        if (result && result.readings) {
          setReadings(result.readings);
          
          // Log Modbus response to console
          console.log('Modbus Register Data:', {
            timestamp: new Date().toISOString(),
            deviceId,
            deviceName: device.name,
            readings: result.readings
          });
          
          if (showSuccess) {
            setSuccess('Successfully read data from device');
          }
          
          // Update communication status
          setCommunicationStatus({
            type: 'success',
            operation: 'Read Data',
            timestamp: new Date(),
            message: 'Successfully read data from device'
          });
          
          // Add to logs
          addCommunicationLog({
            type: 'response',
            operation: 'Read Data',
            message: `Response: Successfully read ${result.readings.length} registers`,
            details: result
          });
          
          // Clear success message after 3 seconds, but only if we're showing success messages
          if (showSuccess) {
            setTimeout(() => {
              setSuccess(null);
              // Reset communication status after a delay
              setTimeout(() => {
                setCommunicationStatus({
                  type: 'idle',
                  timestamp: new Date()
                });
              }, 2000);
            }, 3000);
          }
          
          return result;
        } else {
          throw new Error('No readings returned from device');
        }
      } catch (apiError: any) {
        console.error('Error reading device data:', apiError);
        setError(apiError.message || 'Failed to read data from device');
        
        // Update communication status
        setCommunicationStatus({
          type: 'error',
          operation: 'Read Data',
          timestamp: new Date(),
          message: apiError.message || 'Failed to read data from device'
        });
        
        // Create error details object for better error display
        if (apiError.response && apiError.response.data) {
          setErrorDetails({
            message: apiError.response.data.message || 'Failed to read data from device',
            error: apiError.response.data.error,
            errorType: apiError.response.data.errorType,
            troubleshooting: apiError.response.data.troubleshooting,
            deviceInfo: apiError.response.data.deviceInfo || {
              name: device.name,
              connectionType: device.connectionSetting?.connectionType,
              address: device.connectionSetting?.connectionType === 'tcp' 
                ? `${device.connectionSetting?.tcp?.ip}:${device.connectionSetting?.tcp?.port}` 
                : device.connectionSetting?.rtu?.serialPort
            }
          });
          
          // Add to logs
          addCommunicationLog({
            type: 'error',
            operation: 'Read Data',
            message: `Error: ${apiError.response.data.message || 'Failed to read data from device'}`,
            details: apiError.response.data
          });
        } else {
          setErrorDetails({
            message: apiError.message || 'Failed to read data from device',
            deviceInfo: {
              name: device.name,
              connectionType: device.connectionSetting?.connectionType,
              address: device.connectionSetting?.connectionType === 'tcp' 
                ? `${device.connectionSetting?.tcp?.ip}:${device.connectionSetting?.tcp?.port}` 
                : device.connectionSetting?.rtu?.serialPort
            }
          });
          
          // Add to logs
          addCommunicationLog({
            type: 'error',
            operation: 'Read Data',
            message: `Error: ${apiError.message || 'Failed to read data from device'}`,
            details: apiError
          });
        }
      }
    } catch (err: any) {
      console.error('Error reading registers:', err);
      setError(err.message || 'Failed to read registers');
      setErrorDetails({
        message: err.message || 'Failed to read registers',
        deviceInfo: device ? {
          name: device.name,
          connectionType: device.connectionSetting?.connectionType,
          address: device.connectionSetting?.connectionType === 'tcp' 
            ? `${device.connectionSetting?.tcp?.ip}:${device.connectionSetting?.tcp?.port}` 
            : device.connectionSetting?.rtu?.serialPort
        } : undefined
      });
      
      return null;
    }
  }, [deviceId, device, readRegisters]);
  
  // Regular handler for button click that calls the async function with full UI feedback
  const handleReadRegisters = () => {
    handleReadRegistersAsync(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!editedDevice) return;

    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number'
          ? parseInt(value)
          : value;

    setEditedDevice({
      ...editedDevice,
      [name]: newValue,
    });
  };

  if (loading && !device) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !device) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h2 className="mb-2 text-xl font-semibold text-red-700">Error Loading Device</h2>
        <p className="mb-4 text-red-600">{error}</p>
        <button
          onClick={handleBack}
          className="inline-flex items-center rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Devices
        </button>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-gray-500" />
        <h2 className="mb-2 text-xl font-semibold text-gray-700">Device Not Found</h2>
        <p className="mb-4 text-gray-600">The requested device could not be found.</p>
        <button
          onClick={handleBack}
          className="inline-flex items-center rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Devices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with device name and actions */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <button
            onClick={handleBack}
            className="mb-2 flex items-center text-blue-500 hover:text-blue-700"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to devices
          </button>
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-800">{device.name}</h1>
            <div
              className={`ml-3 h-3 w-3 rounded-full ${
                device.enabled && device.lastSeen ? 'bg-green-500' : 'bg-red-500'
              }`}
              title={device.enabled ? (device.lastSeen ? 'Online' : 'Enabled but not connected') : 'Offline'}
            ></div>
          </div>
        </div>
        
        {/* Communication Status Indicator */}
        <div className={`hidden sm:flex items-center ${
          communicationStatus.type === 'idle' ? 'text-gray-500' :
          communicationStatus.type === 'sending' ? 'text-blue-500 animate-pulse' :
          communicationStatus.type === 'success' ? 'text-green-500' :
          'text-red-500'
        }`}>
          {communicationStatus.type === 'idle' ? (
            <Wifi size={18} className="mr-2" />
          ) : communicationStatus.type === 'sending' ? (
            <ArrowUpCircle size={18} className="mr-2 animate-pulse" />
          ) : communicationStatus.type === 'success' ? (
            <ArrowDownCircle size={18} className="mr-2" />
          ) : (
            <XCircle size={18} className="mr-2" />
          )}
          <span className="text-sm">
            {communicationStatus.type === 'idle' ? 'Ready' : communicationStatus.message}
          </span>
          
          {/* Toggle Monitoring Button */}
          <button 
            onClick={() => setShowMonitoring(!showMonitoring)}
            className="ml-3 text-gray-500 hover:text-gray-700"
            title={showMonitoring ? "Hide communication monitor" : "Show communication monitor"}
          >
            {showMonitoring ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex gap-2">
          {canTestDevices && (
            <button
              onClick={handleTestConnection}
              disabled={testingConnection || readingData || !device.enabled}
              className="flex items-center gap-1 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testingConnection ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Server size={16} />
                  Test Connection
                </>
              )}
            </button>
          )}

          {canEditDevices && (
            <button
              onClick={handleEdit}
              disabled={isEditing}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Edit size={16} />
              Edit
            </button>
          )}

          {canDeleteDevices && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 rounded-md border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
            >
              <Trash size={16} />
              Delete
            </button>
          )}
          
          {/* Mobile-only monitoring toggle */}
          <button 
            onClick={() => setShowMonitoring(!showMonitoring)}
            className="sm:hidden flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            {showMonitoring ? <EyeOff size={16} /> : <Eye size={16} />}
            {showMonitoring ? 'Hide Monitor' : 'Show Monitor'}
          </button>
        </div>
      </div>
      
      {/* Mobile communication status */}
      <div className={`flex sm:hidden items-center mt-2 p-2 rounded ${
        communicationStatus.type === 'idle' ? 'bg-gray-100 text-gray-600' :
        communicationStatus.type === 'sending' ? 'bg-blue-100 text-blue-600' :
        communicationStatus.type === 'success' ? 'bg-green-100 text-green-600' :
        'bg-red-100 text-red-600'
      }`}>
        {communicationStatus.type === 'idle' ? (
          <Wifi size={18} className="mr-2" />
        ) : communicationStatus.type === 'sending' ? (
          <Send size={18} className="mr-2 animate-pulse" />
        ) : communicationStatus.type === 'success' ? (
          <CheckCircle size={18} className="mr-2" />
        ) : (
          <AlertCircle size={18} className="mr-2" />
        )}
        <span className="text-sm font-medium">
          {communicationStatus.type === 'idle' ? 'Ready' : communicationStatus.message}
        </span>
        {communicationStatus.type !== 'idle' && (
          <span className="ml-auto text-xs">
            {new Date(communicationStatus.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Communication Monitoring Panel */}
      {showMonitoring && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-2">
            <h3 className="flex items-center font-medium text-gray-700">
              <Radio size={16} className="mr-2 text-blue-500" />
              Communication Monitor
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {communicationLogs.length} events
              </span>
              <button 
                onClick={clearCommunicationLogs}
                className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                title="Clear logs"
              >
                <XCircle size={16} />
              </button>
              <button 
                onClick={() => setShowMonitoring(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                title="Close monitor"
              >
                <EyeOff size={16} />
              </button>
            </div>
          </div>
          
          <div 
            ref={communicationLogRef}
            className="h-48 overflow-y-auto p-2 font-mono text-xs"
          >
            {communicationLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                No communication logs yet. Try testing the connection or reading data.
              </div>
            ) : (
              <div className="space-y-2">
                {communicationLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`rounded-md p-2 ${
                      log.type === 'request' ? 'bg-blue-50 text-blue-800' :
                      log.type === 'response' ? 'bg-green-50 text-green-800' :
                      log.type === 'error' ? 'bg-red-50 text-red-800' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        {log.type === 'request' && <UploadCloud size={14} className="mr-1.5" />}
                        {log.type === 'response' && <DownloadCloud size={14} className="mr-1.5" />}
                        {log.type === 'error' && <AlertCircle size={14} className="mr-1.5" />}
                        {log.type === 'info' && <Info size={14} className="mr-1.5" />}
                        <span className="font-medium">{log.operation}</span>
                      </div>
                      <span className="text-xs opacity-70">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words">{log.message}</div>
                    {log.details && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs font-medium">Details</summary>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-white p-2 text-xs text-gray-800">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success or error messages */}
      {success && (
        <div className="rounded border-l-4 border-green-500 bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="mr-3 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {errorDetails ? (
        <ConnectionErrorDisplay 
          title="Connection Error"
          message={errorDetails.message}
          error={errorDetails.error}
          errorType={errorDetails.errorType}
          troubleshooting={errorDetails.troubleshooting}
          deviceInfo={errorDetails.deviceInfo}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />
      ) : error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex">
              <AlertCircle className="mr-3 mt-0.5 flex-shrink-0 text-red-500" />
              <div>
                <h3 className="font-medium text-red-800">Connection Error</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">{error}</p>
              </div>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="ml-4 inline-flex flex-shrink-0 rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <HardDrive size={16} className="mr-2" />
                Device Details
              </div>
            </button>
            <button
              onClick={() => setActiveTab('registers')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'registers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <List size={16} className="mr-2" />
                Registers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('readings')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'readings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <Activity size={16} className="mr-2" />
                Data Readings
              </div>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <Zap size={16} className="mr-2" />
                Advanced
              </div>
            </button>
            {isEditing && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                  activeTab === 'edit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <Settings size={16} className="mr-2" />
                  Edit Device
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="flex items-center text-lg font-medium text-gray-700">
                  <Server size={18} className="mr-2 text-blue-500" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <div className="mt-1 text-gray-900">{device.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          device.enabled && device.lastSeen ? 'bg-green-100 text-green-800' : 
                          device.enabled ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {device.enabled && device.lastSeen ? 'Online' : 
                         device.enabled ? 'Enabled (No Connection)' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  {device.make && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Manufacturer
                      </label>
                      <div className="mt-1 text-gray-900">{device.make}</div>
                    </div>
                  )}
                  {device.model && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Model</label>
                      <div className="mt-1 text-gray-900">{device.model}</div>
                    </div>
                  )}
                  {device.lastSeen && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Last Seen</label>
                      <div className="mt-1 text-gray-900">
                        {new Date(device.lastSeen).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {device.tags && device.tags.length > 0 && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-500">Tags</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {device.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center text-lg font-medium text-gray-700">
                  <Settings size={18} className="mr-2 text-blue-500" />
                  Connection Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Connection Type
                    </label>
                    <div className="mt-1 text-gray-900">
                      {device.connectionSetting?.connectionType === 'rtu' ? 'Modbus RTU' : 'Modbus TCP'}
                    </div>
                  </div>
                  
                  {device.connectionSetting?.connectionType === 'tcp' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">IP Address</label>
                        <div className="mt-1 text-gray-900">{device.connectionSetting?.tcp?.ip || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Port</label>
                        <div className="mt-1 text-gray-900">{device.connectionSetting?.tcp?.port || 502}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Slave ID</label>
                        <div className="mt-1 text-gray-900">{device.connectionSetting?.tcp?.slaveId || 1}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Serial Port</label>
                        <div className="mt-1 text-gray-900">{device.connectionSetting?.rtu?.serialPort || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Baud Rate</label>
                        <div className="mt-1 text-gray-900">{device.connectionSetting?.rtu?.baudRate || 9600}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Slave ID</label>
                        <div className="mt-1 text-gray-900">{device.connectionSetting?.rtu?.slaveId || 1}</div>
                      </div>
                    </>
                  )}
                  
                  {/* Display connection status with diagnostic information */}
                  <div className="col-span-2 mt-2">
                    <label className="block text-sm font-medium text-gray-500">Connection Status</label>
                    <div className="mt-1">
                      <div className={`flex items-center rounded-md border p-2 ${
                        device.enabled && device.lastSeen ? 'border-green-200 bg-green-50' : 
                        device.enabled ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className={`mr-2 h-2.5 w-2.5 rounded-full ${
                          device.enabled && device.lastSeen ? 'bg-green-500' : 
                          device.enabled ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className={
                          device.enabled && device.lastSeen ? 'text-green-800' : 
                          device.enabled ? 'text-yellow-800' : 'text-red-800'
                        }>
                          {device.enabled && device.lastSeen 
                            ? `Online (Last connected: ${new Date(device.lastSeen).toLocaleString()})` 
                            : device.enabled 
                              ? 'Enabled but not connected yet. Try using Test Connection.' 
                              : 'Device is disabled'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {device.description && (
                <div className="col-span-1 space-y-2 md:col-span-2">
                  <h3 className="flex items-center text-lg font-medium text-gray-700">
                    <FileText size={18} className="mr-2 text-blue-500" />
                    Description
                  </h3>
                  <p className="text-gray-700">{device.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'registers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Register Configuration</h3>
                {canEditDevices && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    <Edit size={14} />
                    Edit Registers
                  </button>
                )}
              </div>

              {device.registers && device.registers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Name
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Address
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Function Code
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Length
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Scale Factor
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Unit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {device.registers.map((register, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {register.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {register.address}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {register.functionCode || '3'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {register.length}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {register.scaleFactor || '1'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {register.unit || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <FileText size={32} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-700">
                    No Registers Configured
                  </h3>
                  <p className="mb-4 text-gray-500">
                    This device doesn't have any registers configured yet.
                  </p>
                  {canEditDevices && (
                    <button
                      onClick={handleEdit}
                      className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    >
                      Configure Registers
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'readings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Data Readings</h3>
                {canTestDevices && (
                  <button
                    onClick={handleReadRegisters}
                    disabled={readingData || !device.enabled}
                    className="flex items-center gap-1 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {readingData ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Reading...
                      </>
                    ) : (
                      <>
                        <Activity size={16} />
                        Read Data
                      </>
                    )}
                  </button>
                )}
              </div>

              {!device.enabled && (
                <div className="rounded border-l-4 border-yellow-400 bg-yellow-50 p-4">
                  <div className="flex">
                    <AlertCircle className="mr-3 text-yellow-400" />
                    <div>
                      <p className="text-sm text-yellow-700">
                        Device is currently disabled. Enable the device to read data.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {readings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Register
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Address
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Value
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          Unit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {readings.map((reading, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {reading.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {reading.address}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {typeof reading.value === 'number'
                              ? reading.value.toFixed(2)
                              : reading.value || 'Error'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {reading.unit || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <Activity size={32} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-700">No Data Read Yet</h3>
                  <p className="mb-4 text-gray-500">
                    Click the "Read Data" button to fetch current values from this device.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Advanced Communication Settings</h3>
                {canEditDevices && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    <Edit size={14} />
                    Edit Settings
                  </button>
                )}
              </div>

              {!device.advancedSettings ? (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <Zap size={32} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-700">No Advanced Settings Configured</h3>
                  <p className="mb-4 text-gray-500">
                    This device is using default communication settings. You can configure custom settings for improved performance.
                  </p>
                  {canEditDevices && (
                    <button
                      onClick={handleEdit}
                      className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    >
                      Configure Advanced Settings
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Polling and Timeout Settings */}
                  <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                    <h4 className="mb-4 flex items-center font-medium text-gray-700">
                      <Clock size={18} className="mr-2 text-blue-500" />
                      Polling & Timeout Settings
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Poll Interval</label>
                        <div className="mt-1 text-gray-900">
                          {device.advancedSettings.defaultPollInterval || device.pollingInterval || 30000} ms
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Request Timeout</label>
                        <div className="mt-1 text-gray-900">
                          {device.advancedSettings.defaultRequestTimeout || 5000} ms
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connection Options */}
                  <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                    <h4 className="mb-4 flex items-center font-medium text-gray-700">
                      <Settings size={18} className="mr-2 text-blue-500" />
                      Connection Options
                    </h4>
                    {device.advancedSettings.connectionOptions ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Connection Timeout</label>
                          <div className="mt-1 text-gray-900">
                            {device.advancedSettings.connectionOptions.timeout || 10000} ms
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Retries</label>
                          <div className="mt-1 text-gray-900">
                            {device.advancedSettings.connectionOptions.retries || 3}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Retry Interval</label>
                          <div className="mt-1 text-gray-900">
                            {device.advancedSettings.connectionOptions.retryInterval || 1000} ms
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Auto Reconnect</label>
                          <div className="mt-1 text-gray-900">
                            {device.advancedSettings.connectionOptions.autoReconnect ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        {device.advancedSettings.connectionOptions.autoReconnect && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Reconnect Interval</label>
                            <div className="mt-1 text-gray-900">
                              {device.advancedSettings.connectionOptions.reconnectInterval || 5000} ms
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500">Using default connection options</div>
                    )}
                  </div>

                  {/* Cache Options */}
                  <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                    <h4 className="mb-4 flex items-center font-medium text-gray-700">
                      <Database size={18} className="mr-2 text-blue-500" />
                      Cache Options
                    </h4>
                    {device.advancedSettings.cacheOptions ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Cache Status</label>
                          <div className="mt-1 text-gray-900">
                            {device.advancedSettings.cacheOptions.enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        {device.advancedSettings.cacheOptions.enabled && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Time-to-live (TTL)</label>
                              <div className="mt-1 text-gray-900">
                                {device.advancedSettings.cacheOptions.defaultTtl || 60000} ms
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Max Cache Size</label>
                              <div className="mt-1 text-gray-900">
                                {device.advancedSettings.cacheOptions.maxSize || 10000} entries
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Check Interval</label>
                              <div className="mt-1 text-gray-900">
                                {device.advancedSettings.cacheOptions.checkInterval || 60000} ms
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500">Using default cache options</div>
                    )}
                  </div>

                  {/* Logging Options */}
                  <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                    <h4 className="mb-4 flex items-center font-medium text-gray-700">
                      <TerminalSquare size={18} className="mr-2 text-blue-500" />
                      Logging Options
                    </h4>
                    {device.advancedSettings.logOptions ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Log Level</label>
                          <div className="mt-1 text-gray-900">
                            {device.advancedSettings.logOptions.level || 'info'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Console Logging</label>
                          <div className="mt-1 text-gray-900">
                            {device.advancedSettings.logOptions.console !== false ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-500">File Logging</label>
                          <div className="mt-1 text-gray-900">
                            {device.advancedSettings.logOptions.file?.enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        {device.advancedSettings.logOptions.file?.enabled && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Log File Path</label>
                              <div className="mt-1 text-gray-900">
                                {device.advancedSettings.logOptions.file.path || 'Default path'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Max File Size</label>
                              <div className="mt-1 text-gray-900">
                                {device.advancedSettings.logOptions.file.maxSize || 5} MB
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Max Files</label>
                              <div className="mt-1 text-gray-900">
                                {device.advancedSettings.logOptions.file.maxFiles || 5}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500">Using default logging options</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && editedDevice && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-700">Edit Device</h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Basic Information</h4>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Device Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editedDevice.name}
                        onChange={handleInputChange}
                        className="w-full rounded border p-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Manufacturer
                      </label>
                      <input
                        type="text"
                        name="make"
                        value={editedDevice.make || ''}
                        onChange={handleInputChange}
                        className="w-full rounded border p-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
                      <input
                        type="text"
                        name="model"
                        value={editedDevice.model || ''}
                        onChange={handleInputChange}
                        className="w-full rounded border p-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={editedDevice.description || ''}
                        onChange={handleInputChange}
                        className="h-20 w-full resize-none rounded border p-2"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enabled"
                        name="enabled"
                        checked={editedDevice.enabled}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
                        Device Enabled
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Connection Settings</h4>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Connection Type</label>
                    <select
                      name="connectionType"
                      value={editedDevice.connectionSetting?.connectionType || 'tcp'}
                      onChange={(e) => {
                        setEditedDevice({
                          ...editedDevice,
                          connectionSetting: {
                            ...editedDevice.connectionSetting,
                            connectionType: e.target.value as 'tcp' | 'rtu'
                          }
                        });
                      }}
                      className="w-full rounded border p-2"
                    >
                      <option value="tcp">Modbus TCP</option>
                      <option value="rtu">Modbus RTU</option>
                    </select>
                  </div>

                  {(editedDevice.connectionSetting?.connectionType || 'tcp') === 'tcp' ? (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          IP Address *
                        </label>
                        <input
                          type="text"
                          name="tcp.ip"
                          value={editedDevice.connectionSetting?.tcp?.ip || ''}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              connectionSetting: {
                                ...editedDevice.connectionSetting,
                                tcp: {
                                  ...editedDevice.connectionSetting?.tcp,
                                  ip: e.target.value
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Port *</label>
                        <input
                          type="number"
                          name="tcp.port"
                          value={editedDevice.connectionSetting?.tcp?.port || 502}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              connectionSetting: {
                                ...editedDevice.connectionSetting,
                                tcp: {
                                  ...editedDevice.connectionSetting?.tcp,
                                  port: parseInt(e.target.value)
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Slave ID *
                        </label>
                        <input
                          type="number"
                          name="tcp.slaveId"
                          value={editedDevice.connectionSetting?.tcp?.slaveId || 1}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              connectionSetting: {
                                ...editedDevice.connectionSetting,
                                tcp: {
                                  ...editedDevice.connectionSetting?.tcp,
                                  slaveId: parseInt(e.target.value)
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Serial Port *
                        </label>
                        <input
                          type="text"
                          name="rtu.serialPort"
                          value={editedDevice.connectionSetting?.rtu?.serialPort || ''}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              connectionSetting: {
                                ...editedDevice.connectionSetting,
                                rtu: {
                                  ...editedDevice.connectionSetting?.rtu,
                                  serialPort: e.target.value
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                          required
                          placeholder="COM1, /dev/ttyS0, etc."
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Baud Rate</label>
                        <select
                          name="rtu.baudRate"
                          value={editedDevice.connectionSetting?.rtu?.baudRate || 9600}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              connectionSetting: {
                                ...editedDevice.connectionSetting,
                                rtu: {
                                  ...editedDevice.connectionSetting?.rtu,
                                  baudRate: parseInt(e.target.value)
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                        >
                          <option value="9600">9600</option>
                          <option value="19200">19200</option>
                          <option value="38400">38400</option>
                          <option value="57600">57600</option>
                          <option value="115200">115200</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Slave ID *
                        </label>
                        <input
                          type="number"
                          name="rtu.slaveId"
                          value={editedDevice.connectionSetting?.rtu?.slaveId || 1}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              connectionSetting: {
                                ...editedDevice.connectionSetting,
                                rtu: {
                                  ...editedDevice.connectionSetting?.rtu,
                                  slaveId: parseInt(e.target.value)
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Advanced Settings */}
              <div className="space-y-4 border-t pt-6">
                <h4 className="flex items-center font-medium text-gray-700">
                  <Zap className="mr-2 text-blue-500" size={18} />
                  Advanced Communication Settings
                </h4>
                
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                  <p className="text-sm text-blue-700">
                    These settings control the low-level communication behavior for this device. 
                    Adjust them to optimize performance for your specific hardware and network conditions.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Polling and Timeout */}
                  <div className="space-y-3 rounded border border-gray-200 p-3">
                    <h5 className="flex items-center font-medium text-gray-700">
                      <Clock className="mr-2 text-blue-500" size={16} />
                      Polling Settings
                    </h5>
                    
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Poll Interval (ms)
                      </label>
                      <input
                        type="number"
                        name="advancedSettings.defaultPollInterval"
                        value={editedDevice.advancedSettings?.defaultPollInterval || 30000}
                        onChange={(e) => {
                          setEditedDevice({
                            ...editedDevice,
                            advancedSettings: {
                              ...editedDevice.advancedSettings || {},
                              defaultPollInterval: parseInt(e.target.value) || 30000
                            }
                          });
                        }}
                        className="w-full rounded border p-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Default: 30000 ms (30 seconds). Time between automatic polls.
                      </p>
                    </div>
                    
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Request Timeout (ms)
                      </label>
                      <input
                        type="number"
                        name="advancedSettings.defaultRequestTimeout"
                        value={editedDevice.advancedSettings?.defaultRequestTimeout || 5000}
                        onChange={(e) => {
                          setEditedDevice({
                            ...editedDevice,
                            advancedSettings: {
                              ...editedDevice.advancedSettings || {},
                              defaultRequestTimeout: parseInt(e.target.value) || 5000
                            }
                          });
                        }}
                        className="w-full rounded border p-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Default: 5000 ms (5 seconds). Maximum time to wait for a response.
                      </p>
                    </div>
                  </div>
                  
                  {/* Connection Options */}
                  <div className="space-y-3 rounded border border-gray-200 p-3">
                    <h5 className="flex items-center font-medium text-gray-700">
                      <Settings className="mr-2 text-blue-500" size={16} />
                      Connection Options
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Connection Timeout (ms)
                        </label>
                        <input
                          type="number"
                          name="advancedSettings.connectionOptions.timeout"
                          value={editedDevice.advancedSettings?.connectionOptions?.timeout || 10000}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              advancedSettings: {
                                ...editedDevice.advancedSettings || {},
                                connectionOptions: {
                                  ...editedDevice.advancedSettings?.connectionOptions || {},
                                  timeout: parseInt(e.target.value) || 10000
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                        />
                      </div>
                      
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Retries
                        </label>
                        <input
                          type="number"
                          name="advancedSettings.connectionOptions.retries"
                          value={editedDevice.advancedSettings?.connectionOptions?.retries || 3}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              advancedSettings: {
                                ...editedDevice.advancedSettings || {},
                                connectionOptions: {
                                  ...editedDevice.advancedSettings?.connectionOptions || {},
                                  retries: parseInt(e.target.value) || 3
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Retry Interval (ms)
                      </label>
                      <input
                        type="number"
                        name="advancedSettings.connectionOptions.retryInterval"
                        value={editedDevice.advancedSettings?.connectionOptions?.retryInterval || 1000}
                        onChange={(e) => {
                          setEditedDevice({
                            ...editedDevice,
                            advancedSettings: {
                              ...editedDevice.advancedSettings || {},
                              connectionOptions: {
                                ...editedDevice.advancedSettings?.connectionOptions || {},
                                retryInterval: parseInt(e.target.value) || 1000
                              }
                            }
                          });
                        }}
                        className="w-full rounded border p-2"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoReconnect"
                        name="advancedSettings.connectionOptions.autoReconnect"
                        checked={editedDevice.advancedSettings?.connectionOptions?.autoReconnect !== false}
                        onChange={(e) => {
                          setEditedDevice({
                            ...editedDevice,
                            advancedSettings: {
                              ...editedDevice.advancedSettings || {},
                              connectionOptions: {
                                ...editedDevice.advancedSettings?.connectionOptions || {},
                                autoReconnect: e.target.checked
                              }
                            }
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="autoReconnect" className="ml-2 block text-sm text-gray-700">
                        Auto Reconnect
                      </label>
                    </div>
                    
                    {editedDevice.advancedSettings?.connectionOptions?.autoReconnect !== false && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Reconnect Interval (ms)
                        </label>
                        <input
                          type="number"
                          name="advancedSettings.connectionOptions.reconnectInterval"
                          value={editedDevice.advancedSettings?.connectionOptions?.reconnectInterval || 5000}
                          onChange={(e) => {
                            setEditedDevice({
                              ...editedDevice,
                              advancedSettings: {
                                ...editedDevice.advancedSettings || {},
                                connectionOptions: {
                                  ...editedDevice.advancedSettings?.connectionOptions || {},
                                  reconnectInterval: parseInt(e.target.value) || 5000
                                }
                              }
                            });
                          }}
                          className="w-full rounded border p-2"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Cache Options */}
                  <div className="space-y-3 rounded border border-gray-200 p-3">
                    <h5 className="flex items-center font-medium text-gray-700">
                      <Database className="mr-2 text-blue-500" size={16} />
                      Cache Options
                    </h5>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="cacheEnabled"
                        name="advancedSettings.cacheOptions.enabled"
                        checked={editedDevice.advancedSettings?.cacheOptions?.enabled !== false}
                        onChange={(e) => {
                          setEditedDevice({
                            ...editedDevice,
                            advancedSettings: {
                              ...editedDevice.advancedSettings || {},
                              cacheOptions: {
                                ...editedDevice.advancedSettings?.cacheOptions || {},
                                enabled: e.target.checked
                              }
                            }
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="cacheEnabled" className="ml-2 block text-sm text-gray-700">
                        Enable Caching
                      </label>
                    </div>
                    
                    {editedDevice.advancedSettings?.cacheOptions?.enabled !== false && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Default TTL (ms)
                          </label>
                          <input
                            type="number"
                            name="advancedSettings.cacheOptions.defaultTtl"
                            value={editedDevice.advancedSettings?.cacheOptions?.defaultTtl || 60000}
                            onChange={(e) => {
                              setEditedDevice({
                                ...editedDevice,
                                advancedSettings: {
                                  ...editedDevice.advancedSettings || {},
                                  cacheOptions: {
                                    ...editedDevice.advancedSettings?.cacheOptions || {},
                                    defaultTtl: parseInt(e.target.value) || 60000
                                  }
                                }
                              });
                            }}
                            className="w-full rounded border p-2"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Default: 60000 ms (1 minute). Time-to-live for cached values.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Max Size
                            </label>
                            <input
                              type="number"
                              name="advancedSettings.cacheOptions.maxSize"
                              value={editedDevice.advancedSettings?.cacheOptions?.maxSize || 10000}
                              onChange={(e) => {
                                setEditedDevice({
                                  ...editedDevice,
                                  advancedSettings: {
                                    ...editedDevice.advancedSettings || {},
                                    cacheOptions: {
                                      ...editedDevice.advancedSettings?.cacheOptions || {},
                                      maxSize: parseInt(e.target.value) || 10000
                                    }
                                  }
                                });
                              }}
                              className="w-full rounded border p-2"
                            />
                          </div>
                          
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Check Interval (ms)
                            </label>
                            <input
                              type="number"
                              name="advancedSettings.cacheOptions.checkInterval"
                              value={editedDevice.advancedSettings?.cacheOptions?.checkInterval || 60000}
                              onChange={(e) => {
                                setEditedDevice({
                                  ...editedDevice,
                                  advancedSettings: {
                                    ...editedDevice.advancedSettings || {},
                                    cacheOptions: {
                                      ...editedDevice.advancedSettings?.cacheOptions || {},
                                      checkInterval: parseInt(e.target.value) || 60000
                                    }
                                  }
                                });
                              }}
                              className="w-full rounded border p-2"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Logging Options */}
                  <div className="space-y-3 rounded border border-gray-200 p-3">
                    <h5 className="flex items-center font-medium text-gray-700">
                      <TerminalSquare className="mr-2 text-blue-500" size={16} />
                      Logging Options
                    </h5>
                    
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Log Level
                      </label>
                      <select
                        name="advancedSettings.logOptions.level"
                        value={editedDevice.advancedSettings?.logOptions?.level || 'info'}
                        onChange={(e) => {
                          setEditedDevice({
                            ...editedDevice,
                            advancedSettings: {
                              ...editedDevice.advancedSettings || {},
                              logOptions: {
                                ...editedDevice.advancedSettings?.logOptions || {},
                                level: e.target.value
                              }
                            }
                          });
                        }}
                        className="w-full rounded border p-2"
                      >
                        <option value="debug">Debug (Most Verbose)</option>
                        <option value="info">Info (Standard)</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error (Least Verbose)</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="consoleLogging"
                        name="advancedSettings.logOptions.console"
                        checked={editedDevice.advancedSettings?.logOptions?.console !== false}
                        onChange={(e) => {
                          setEditedDevice({
                            ...editedDevice,
                            advancedSettings: {
                              ...editedDevice.advancedSettings || {},
                              logOptions: {
                                ...editedDevice.advancedSettings?.logOptions || {},
                                console: e.target.checked
                              }
                            }
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="consoleLogging" className="ml-2 block text-sm text-gray-700">
                        Console Logging
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="fileLogging"
                        name="advancedSettings.logOptions.file.enabled"
                        checked={editedDevice.advancedSettings?.logOptions?.file?.enabled === true}
                        onChange={(e) => {
                          setEditedDevice({
                            ...editedDevice,
                            advancedSettings: {
                              ...editedDevice.advancedSettings || {},
                              logOptions: {
                                ...editedDevice.advancedSettings?.logOptions || {},
                                file: {
                                  ...editedDevice.advancedSettings?.logOptions?.file || {},
                                  enabled: e.target.checked
                                }
                              }
                            }
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="fileLogging" className="ml-2 block text-sm text-gray-700">
                        File Logging
                      </label>
                    </div>
                    
                    {editedDevice.advancedSettings?.logOptions?.file?.enabled && (
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Log File Path
                          </label>
                          <input
                            type="text"
                            name="advancedSettings.logOptions.file.path"
                            value={editedDevice.advancedSettings?.logOptions?.file?.path || ''}
                            onChange={(e) => {
                              setEditedDevice({
                                ...editedDevice,
                                advancedSettings: {
                                  ...editedDevice.advancedSettings || {},
                                  logOptions: {
                                    ...editedDevice.advancedSettings?.logOptions || {},
                                    file: {
                                      ...editedDevice.advancedSettings?.logOptions?.file || {},
                                      path: e.target.value
                                    }
                                  }
                                }
                              });
                            }}
                            placeholder="logs/device-{id}.log"
                            className="w-full rounded border p-2"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Max File Size (MB)
                            </label>
                            <input
                              type="number"
                              name="advancedSettings.logOptions.file.maxSize"
                              value={editedDevice.advancedSettings?.logOptions?.file?.maxSize || 5}
                              onChange={(e) => {
                                setEditedDevice({
                                  ...editedDevice,
                                  advancedSettings: {
                                    ...editedDevice.advancedSettings || {},
                                    logOptions: {
                                      ...editedDevice.advancedSettings?.logOptions || {},
                                      file: {
                                        ...editedDevice.advancedSettings?.logOptions?.file || {},
                                        maxSize: parseInt(e.target.value) || 5
                                      }
                                    }
                                  }
                                });
                              }}
                              className="w-full rounded border p-2"
                            />
                          </div>
                          
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Max Files
                            </label>
                            <input
                              type="number"
                              name="advancedSettings.logOptions.file.maxFiles"
                              value={editedDevice.advancedSettings?.logOptions?.file?.maxFiles || 5}
                              onChange={(e) => {
                                setEditedDevice({
                                  ...editedDevice,
                                  advancedSettings: {
                                    ...editedDevice.advancedSettings || {},
                                    logOptions: {
                                      ...editedDevice.advancedSettings?.logOptions || {},
                                      file: {
                                        ...editedDevice.advancedSettings?.logOptions?.file || {},
                                        maxFiles: parseInt(e.target.value) || 5
                                      }
                                    }
                                  }
                                });
                              }}
                              className="w-full rounded border p-2"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  onClick={handleCancelEdit}
                  className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete this device? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer with communication status */}
      <div className="mt-8 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
        <div className="flex items-center text-gray-500">
          <Radio size={16} className="mr-2" />
          <span>
            {device.connectionSetting?.connectionType === 'tcp' 
              ? `TCP: ${device.connectionSetting?.tcp?.ip}:${device.connectionSetting?.tcp?.port}` 
              : `RTU: ${device.connectionSetting?.rtu?.serialPort || 'N/A'}`}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center ${
            communicationStatus.type === 'idle' ? 'text-gray-500' :
            communicationStatus.type === 'sending' ? 'text-blue-500' :
            communicationStatus.type === 'success' ? 'text-green-500' :
            'text-red-500'
          }`}>
            {communicationStatus.type === 'idle' ? (
              <span className="flex items-center">
                <Wifi size={14} className="mr-1.5" /> 
                Ready
              </span>
            ) : communicationStatus.type === 'sending' ? (
              <span className="flex items-center">
                <ArrowUpCircle size={14} className="mr-1.5 animate-pulse" /> 
                {communicationStatus.operation}
              </span>
            ) : communicationStatus.type === 'success' ? (
              <span className="flex items-center">
                <ArrowDownCircle size={14} className="mr-1.5" /> 
                Success
              </span>
            ) : (
              <span className="flex items-center">
                <XCircle size={14} className="mr-1.5" /> 
                Error
              </span>
            )}
          </div>
          
          <button 
            onClick={() => setShowMonitoring(!showMonitoring)}
            className={`flex items-center gap-1 px-2 py-1 text-xs ${
              showMonitoring 
                ? 'rounded bg-blue-100 text-blue-700' 
                : 'text-blue-600 hover:text-blue-800'
            }`}
          >
            {showMonitoring ? (
              <>
                <EyeOff size={14} className="mr-1" />
                Hide Monitor
              </>
            ) : (
              <>
                <Eye size={14} className="mr-1" />
                Show Monitor
              </>
            )}
          </button>
        </div>
        
        <div className="text-gray-500">
          <span className="text-xs">
            Last Activity: {
              communicationStatus.type !== 'idle' 
                ? new Date(communicationStatus.timestamp).toLocaleTimeString()
                : (device.lastSeen 
                  ? new Date(device.lastSeen).toLocaleTimeString() 
                  : 'Never'
                )
            }
          </span>
        </div>
      </div>
    </div>
  );
};

// Add a polling controls wrapper component
const PollingControlsWrapper = () => {
  // This is a high-order component that wraps DeviceDetails with polling functionality
  return function WithPollingControls(Component: React.ComponentType<any>) {
    const WrappedComponent = (props: any) => {
      const [autoPolling, setAutoPolling] = useState(true); // Default to enabled
      const [pollingInterval, setPollingInterval] = useState(1000); // Default to 1 second
      const pollingTimerRef = useRef<number | null>(null);
      const { deviceId } = useParams<{ deviceId: string }>();
      const { readRegisters } = useDevices();
    
    // Set up polling effect
    useEffect(() => {
      // Clean up existing timer
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      
      // Only set up polling if enabled and we have a device ID
      if (autoPolling && deviceId) {
        console.log(`Setting up auto-polling every ${pollingInterval}ms for device ${deviceId}`);
        
        // Create a polling interval
        pollingTimerRef.current = window.setInterval(async () => {
          try {
            // Read registers and log the result to console
            console.log(`Auto-polling: Fetching data for device ${deviceId}...`);
            const result = await readRegisters(deviceId);
            
            console.log('Modbus Register Data:', {
              timestamp: new Date().toISOString(),
              deviceId,
              readings: result?.readings || []
            });
          } catch (error) {
            console.error('Error in auto-polling:', error);
          }
        }, pollingInterval);
      }
      
      // Clean up on unmount
      return () => {
        if (pollingTimerRef.current) {
          window.clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
      };
    }, [autoPolling, pollingInterval, deviceId, readRegisters]);
    
    return (
      <>
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoPolling}
                onChange={e => setAutoPolling(e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Auto-poll</span>
            </label>
            
            <select
              value={pollingInterval}
              onChange={e => setPollingInterval(Number(e.target.value))}
              className="rounded border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={!autoPolling}
            >
              <option value="1000">1 second</option>
              <option value="2000">2 seconds</option>
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
            </select>
          </div>
        </div>
        <Component {...props} />
      </>
    );
  };
  
  return WrappedComponent;
  };
};

// Export the wrapped component
export default PollingControlsWrapper()(DeviceDetails);
