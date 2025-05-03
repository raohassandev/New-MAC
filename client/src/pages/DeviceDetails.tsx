import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useDevices } from '../hooks/useDevices';
import { useAuth } from '../context/AuthContext';
import { Device, DeviceReading } from '../types/device.types';

const DeviceDetails: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { getDevice, updateDevice, deleteDevice, loadingDevice } = useDevices();
  const { user } = useAuth();

  const [device, setDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [readingData, setReadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedDevice, setEditedDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'registers' | 'readings' | 'edit'>(
    'details'
  );
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

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

  const handleTestConnection = async () => {
    if (!deviceId || !device) return;

    try {
      setTestingConnection(true);
      setError(null);
      setSuccess(null);

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate success for demo purposes
      setSuccess('Connection test successful');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error testing connection:', err);
      setError(err.message || 'Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleReadRegisters = async () => {
    if (!deviceId || !device) return;

    try {
      setReadingData(true);
      setError(null);

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock readings
      const mockReadings: DeviceReading[] =
        device.registers?.map(register => ({
          name: register.name,
          address: register.address,
          value: Math.random() * 100,
          unit: register.unit || '',
        })) || [];

      setReadings(mockReadings);
    } catch (err: any) {
      console.error('Error reading registers:', err);
      setError(err.message || 'Failed to read registers');
    } finally {
      setReadingData(false);
    }
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
                device.enabled ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
          </div>
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
        </div>
      </div>

      {/* Success or error messages */}
      {success && (
        <div className="rounded border-l-4 border-green-500 bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="mr-3 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded border-l-4 border-red-500 bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="mr-3 text-red-500" />
            <span className="text-red-700">{error}</span>
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
                          device.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {device.enabled ? 'Online' : 'Offline'}
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
                    <div className="mt-1 text-gray-900">{device.connectionType || 'TCP'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">IP Address</label>
                    <div className="mt-1 text-gray-900">{device.ip}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Port</label>
                    <div className="mt-1 text-gray-900">{device.port}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Slave ID</label>
                    <div className="mt-1 text-gray-900">{device.slaveId}</div>
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

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        IP Address *
                      </label>
                      <input
                        type="text"
                        name="ip"
                        value={editedDevice.ip || ''}
                        onChange={handleInputChange}
                        className="w-full rounded border p-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Port *</label>
                      <input
                        type="number"
                        name="port"
                        value={editedDevice.port || 502}
                        onChange={handleInputChange}
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
                        name="slaveId"
                        value={editedDevice.slaveId}
                        onChange={handleInputChange}
                        className="w-full rounded border p-2"
                        required
                      />
                    </div>
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
    </div>
  );
};

export default DeviceDetails;
