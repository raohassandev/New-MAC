import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, ArrowLeft, Save, Trash, File, CreditCard, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useDeviceDrivers } from '../hooks/useDeviceDrivers';
import { DeviceDriver } from '../types/deviceDriver.types';
import { formatDate } from '../utils/formatters';
import NewDeviceDriverForm from '../components/templates/index';

const DeviceDriverDetails: React.FC = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const [deviceDriver, setDeviceDriver] = useState<DeviceDriver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { getDeviceDriver, updateDeviceDriver, deleteDeviceDriver } = useDeviceDrivers();

  useEffect(() => {
    if (!driverId) {
      setError('Device driver ID is required');
      setLoading(false);
      return;
    }

    const fetchDeviceDriver = async () => {
      try {
        setLoading(true);
        console.log(`Attempting to fetch device driver with ID: ${driverId}`);
        const data = await getDeviceDriver(driverId);
        console.log('Device driver data received:', JSON.stringify(data, null, 2));
        setDeviceDriver(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching device driver:', err);
        setError('Failed to load device driver. Error: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceDriver();
  }, [driverId, getDeviceDriver]);

  const handleBack = () => {
    navigate('/device-drivers');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (updatedDeviceDriver: DeviceDriver) => {
    try {
      setLoading(true);
      const result = await updateDeviceDriver(driverId!, updatedDeviceDriver);
      setDeviceDriver(result);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error updating device driver:', err);
      setError('Failed to update device driver');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this device driver?')) {
      return;
    }
    
    try {
      setLoading(true);
      await deleteDeviceDriver(driverId!);
      navigate('/device-drivers');
    } catch (err) {
      console.error('Error deleting device driver:', err);
      setError('Failed to delete device driver');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <RotateCcw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-gray-600">Loading device driver details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 rounded-full bg-red-100 p-4">
            <File className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Error Loading Device Driver</h2>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back to Device Drivers</span>
        </Button>
      </div>
    );
  }

  if (!deviceDriver) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <File className="h-8 w-8 text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Device Driver Not Found</h2>
          <p className="mt-2 text-gray-600">The requested device driver could not be found.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back to Device Drivers</span>
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Cancel</span>
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Edit Device Driver</h1>
          <div></div> {/* Empty div for flex spacing */}
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <NewDeviceDriverForm 
            initialData={deviceDriver} 
            onSubmit={handleSave}
            onClose={handleCancel}
            isEditing={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </Button>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleEdit}
            className="flex items-center space-x-2"
          >
            <Edit size={16} />
            <span>Edit</span>
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex items-center space-x-2"
          >
            <Trash size={16} />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Information */}
        <div className="col-span-1 lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-6 flex items-center">
              <CreditCard className="mr-4 h-8 w-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-800">{deviceDriver.name}</h1>
            </div>
            
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-700">Description</h2>
              <p className="text-gray-600">{deviceDriver.description || 'No description provided.'}</p>
            </div>
            
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h2 className="mb-2 text-lg font-semibold text-gray-700">Device Type</h2>
                <p className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                  {deviceDriver.deviceType}
                </p>
              </div>
              <div>
                <h2 className="mb-2 text-lg font-semibold text-gray-700">Status</h2>
                <p className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  deviceDriver.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {deviceDriver.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <h2 className="mb-2 text-lg font-semibold text-gray-700">Make</h2>
                <p className="text-gray-600">{deviceDriver.make || 'N/A'}</p>
              </div>
              <div>
                <h2 className="mb-2 text-lg font-semibold text-gray-700">Model</h2>
                <p className="text-gray-600">{deviceDriver.model || 'N/A'}</p>
              </div>
              <div>
                <h2 className="mb-2 text-lg font-semibold text-gray-700">Register Count</h2>
                <p className="text-gray-600">{deviceDriver.dataPoints?.length || 0} registers</p>
              </div>
            </div>
            
            {deviceDriver.tags && deviceDriver.tags.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-2 text-lg font-semibold text-gray-700">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {deviceDriver.tags.map((tag, index) => (
                    <span key={index} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Data Points */}
          <div className="mt-6 rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Data Points</h2>
            {deviceDriver.dataPoints && deviceDriver.dataPoints.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Count</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Function Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Parameters</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {deviceDriver.dataPoints.map((dataPoint, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {dataPoint.range.startAddress}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {dataPoint.range.count}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {dataPoint.range.fc}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {dataPoint.parser.parameters && dataPoint.parser.parameters.length > 0 ? (
                            <div className="flex flex-col space-y-2">
                              {dataPoint.parser.parameters.map((param, paramIndex) => (
                                <div key={paramIndex} className="flex flex-wrap gap-x-4 gap-y-1">
                                  <span className="font-medium">{param.name}:</span>
                                  <span>{param.dataType}{param.unit ? ` (${param.unit})` : ''}</span>
                                  {param.description && <span className="w-full text-xs text-gray-500">{param.description}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No parameters</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No data points defined for this device driver.</p>
            )}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="col-span-1">
          {/* Connection Settings */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Connection Settings</h2>
            {deviceDriver.connectionSetting ? (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Connection Type</h3>
                  <p className="text-gray-800">{deviceDriver.connectionSetting.connectionType.toUpperCase()}</p>
                </div>
                
                {deviceDriver.connectionSetting.connectionType === 'tcp' && deviceDriver.connectionSetting.tcp && (
                  <>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">IP Address</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.tcp.ip}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">Port</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.tcp.port}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">Slave ID</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.tcp.slaveId}</p>
                    </div>
                  </>
                )}
                
                {deviceDriver.connectionSetting.connectionType === 'rtu' && deviceDriver.connectionSetting.rtu && (
                  <>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">Serial Port</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.rtu.serialPort}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">Baud Rate</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.rtu.baudRate}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">Data Bits</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.rtu.dataBits}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">Stop Bits</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.rtu.stopBits}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">Parity</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.rtu.parity}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-gray-600">Slave ID</h3>
                      <p className="text-gray-800">{deviceDriver.connectionSetting.rtu.slaveId}</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No connection settings defined.</p>
            )}
          </div>
          
          {/* Metadata */}
          <div className="mt-6 rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Metadata</h2>
            <div className="space-y-4">
              {deviceDriver.createdBy && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Created By</h3>
                  <p className="text-gray-800">{deviceDriver.createdBy.username || 'Unknown'}</p>
                  {deviceDriver.createdBy.email && (
                    <p className="text-sm text-gray-500">{deviceDriver.createdBy.email}</p>
                  )}
                </div>
              )}
              
              {deviceDriver.createdAt && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Created Date</h3>
                  <p className="text-gray-800">{formatDate(deviceDriver.createdAt.toString())}</p>
                </div>
              )}
              
              {deviceDriver.updatedAt && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Last Updated</h3>
                  <p className="text-gray-800">{formatDate(deviceDriver.updatedAt.toString())}</p>
                </div>
              )}
              
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-600">ID</h3>
                <p className="break-all text-xs text-gray-500">{deviceDriver._id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDriverDetails;