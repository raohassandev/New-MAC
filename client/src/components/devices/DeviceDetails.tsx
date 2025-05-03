import React, { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  HardDrive,
  Link as LinkIcon,
  Server,
  Settings,
  Info,
  Activity,
  ClipboardList,
  History,
  Wifi,
  X,
  RefreshCw,
  Trash,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import RegisterTable from './RegisterTable';
import DeviceDataChart from './DeviceDataChart';
import DeviceStatusCard from './DeviceStatusCard';

interface Device {
  _id: string;
  name: string;
  ip?: string;
  port?: number;
  slaveId?: number;
  enabled: boolean;
  lastSeen?: Date;
  make?: string;
  model?: string;
  description?: string;
  tags?: string[];
  serialPort?: string;
  baudRate?: number;
  connectionType?: 'tcp' | 'rtu';
  registers?: DeviceRegister[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface DeviceRegister {
  name: string;
  address: number;
  length: number;
  functionCode?: number;
  scaleFactor?: number;
  decimalPoint?: number;
  byteOrder?: string;
  unit?: string;
}

interface DeviceDetailsProps {
  deviceId: string;
  onEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
  onStatusChange?: (device: Device, enabled: boolean) => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({
  deviceId,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'online' | 'offline' | 'connecting' | 'error'
  >('offline');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Fetch device data
  useEffect(() => {
    const fetchDevice = async () => {
      setLoading(true);
      setError(null);

      try {
        // In a real app, you would fetch from an API
        // const response = await fetch(`/api/devices/${deviceId}`);
        // const data = await response.json();

        // For demo purposes, mock the response
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock device data
        const mockDevice: Device = {
          _id: deviceId,
          name: 'Temperature Controller TC-2000',
          ip: '192.168.1.100',
          port: 502,
          slaveId: 1,
          enabled: true,
          lastSeen: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
          make: 'ABC Controls',
          model: 'TC-2000',
          description: 'Temperature controller for HVAC system in the server room',
          tags: ['temperature', 'server-room', 'critical'],
          connectionType: 'tcp',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          registers: [
            {
              name: 'Current Temperature',
              address: 100,
              length: 1,
              functionCode: 3,
              unit: '°C',
            },
            {
              name: 'Setpoint',
              address: 101,
              length: 1,
              functionCode: 3,
              unit: '°C',
            },
            { name: 'Status', address: 102, length: 1, functionCode: 3 },
            {
              name: 'Alarm High',
              address: 103,
              length: 1,
              functionCode: 3,
              unit: '°C',
            },
            {
              name: 'Alarm Low',
              address: 104,
              length: 1,
              functionCode: 3,
              unit: '°C',
            },
          ],
        };

        setDevice(mockDevice);
        setConnectionStatus(mockDevice.enabled ? 'online' : 'offline');
      } catch (err) {
        console.error('Error fetching device:', err);
        setError('Failed to load device details. Please try again.');
        setConnectionStatus('error');
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [deviceId]);

  // Handle refreshing device connection
  const handleRefreshConnection = async () => {
    if (!device) return;

    setIsRefreshing(true);
    setConnectionStatus('connecting');

    // Simulate API call to refresh connection
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Randomly simulate success/failure for demo
      const success = Math.random() > 0.3;

      if (success) {
        setConnectionStatus('online');
        setDevice(prev => (prev ? { ...prev, lastSeen: new Date() } : null));
      } else {
        setConnectionStatus('error');
      }
    } catch (err) {
      setConnectionStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle toggling device status
  const handleToggleStatus = async () => {
    if (!device) return;

    setIsRefreshing(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedDevice = { ...device, enabled: !device.enabled };
      setDevice(updatedDevice);
      setConnectionStatus(updatedDevice.enabled ? 'online' : 'offline');

      if (onStatusChange) {
        onStatusChange(updatedDevice, updatedDevice.enabled);
      }
    } catch (err) {
      console.error('Error toggling device status:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle device deletion
  const handleDeleteDevice = async () => {
    setIsRefreshing(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onDelete && device) {
        onDelete(device);
      }
    } catch (err) {
      console.error('Error deleting device:', err);
    } finally {
      setIsRefreshing(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  // Format time ago
  const formatTimeAgo = (date: Date | undefined) => {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw size={32} className="mb-4 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading device details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !device) {
    return (
      <div className="rounded-md border-l-4 border-red-500 bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="mr-3 text-red-500" size={24} />
          <div>
            <h3 className="font-medium text-red-800">Error</h3>
            <p className="text-red-700">{error || 'Device not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col items-start justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div className="flex items-center">
            <div
              className={`mr-3 h-4 w-4 rounded-full ${
                connectionStatus === 'online'
                  ? 'bg-green-500'
                  : connectionStatus === 'offline'
                    ? 'bg-gray-400'
                    : connectionStatus === 'error'
                      ? 'bg-red-500'
                      : 'animate-pulse bg-yellow-500'
              }`}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{device.name}</h1>
              <div className="mt-1 text-sm text-gray-500">
                {device.ip && (
                  <span className="mr-4 inline-flex items-center">
                    <LinkIcon size={14} className="mr-1" />
                    {device.ip}:{device.port}
                  </span>
                )}
                {device.make && device.model && (
                  <span className="inline-flex items-center">
                    <Server size={14} className="mr-1" />
                    {device.make} {device.model}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={handleRefreshConnection}
                    disabled={isRefreshing}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="rounded-md bg-white px-3 py-1.5 text-sm shadow-md"
                    sideOffset={5}
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh Connection'}
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => onEdit && onEdit(device)}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
                  >
                    <Edit size={16} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="rounded-md bg-white px-3 py-1.5 text-sm shadow-md"
                    sideOffset={5}
                  >
                    Edit Device
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {device.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch.Root
                checked={device.enabled}
                onCheckedChange={handleToggleStatus}
                className={`relative h-5 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  device.enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
                disabled={isRefreshing}
                id="device-status"
              >
                <Switch.Thumb
                  className={`block h-4 w-4 rounded-full bg-white transition-transform duration-100 will-change-transform ${
                    device.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </Switch.Root>
            </div>
          </div>
        </div>

        {/* Device tags */}
        {device.tags && device.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {device.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main content with tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex overflow-hidden rounded-lg border-b border-gray-200 bg-white shadow-sm">
          <Tabs.Trigger
            value="overview"
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Info size={16} className="mr-2" />
            Overview
          </Tabs.Trigger>

          <Tabs.Trigger
            value="registers"
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeTab === 'registers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList size={16} className="mr-2" />
            Registers
          </Tabs.Trigger>

          <Tabs.Trigger
            value="data"
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeTab === 'data'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity size={16} className="mr-2" />
            Data & Charts
          </Tabs.Trigger>

          <Tabs.Trigger
            value="history"
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <History size={16} className="mr-2" />
            History
          </Tabs.Trigger>

          <Tabs.Trigger
            value="settings"
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeTab === 'settings'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings size={16} className="mr-2" />
            Settings
          </Tabs.Trigger>
        </Tabs.List>

        {/* Overview tab content */}
        <Tabs.Content value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              {/* Device Status Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <DeviceStatusCard
                  title="Status"
                  value={
                    connectionStatus === 'online'
                      ? 'Online'
                      : connectionStatus === 'connecting'
                        ? 'Connecting'
                        : 'Offline'
                  }
                  icon={
                    connectionStatus === 'online' ? (
                      <CheckCircle className="text-green-500" />
                    ) : connectionStatus === 'error' ? (
                      <AlertCircle className="text-red-500" />
                    ) : connectionStatus === 'connecting' ? (
                      <RefreshCw className="animate-spin text-yellow-500" />
                    ) : (
                      <AlertCircle className="text-gray-400" />
                    )
                  }
                  detail={
                    device.lastSeen
                      ? `Last seen: ${formatTimeAgo(device.lastSeen)}`
                      : 'Never connected'
                  }
                />

                <DeviceStatusCard
                  title="Connection Type"
                  value={device.connectionType === 'tcp' ? 'Modbus TCP' : 'Modbus RTU'}
                  icon={<Wifi className="text-blue-500" />}
                  detail={
                    device.connectionType === 'tcp'
                      ? `${device.ip}:${device.port}`
                      : `Serial: ${device.serialPort || 'N/A'}`
                  }
                />

                <DeviceStatusCard
                  title="Slave ID"
                  value={device.slaveId?.toString() || 'N/A'}
                  icon={<Server className="text-purple-500" />}
                  detail={`Device ID: ${device._id.substring(0, 8)}...`}
                />
              </div>

              {/* Device Data Chart */}
              <DeviceDataChart
                deviceId={device._id}
                title="Temperature Data"
                initialMetric="temperature"
                initialTimeRange="24h"
              />
            </div>

            {/* Device Information Card */}
            <div className="md:col-span-1">
              <Card.Root>
                <Card.Header>
                  <h3 className="text-lg font-medium">Device Information</h3>
                </Card.Header>
                <Card.Content>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Manufacturer</dt>
                      <dd className="mt-1 text-sm text-gray-900">{device.make || 'N/A'}</dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Model</dt>
                      <dd className="mt-1 text-sm text-gray-900">{device.model || 'N/A'}</dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {device.description || 'No description'}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(device.createdAt)}</dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(device.updatedAt)}</dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Seen</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {device.lastSeen ? formatTimeAgo(device.lastSeen) : 'Never'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <button
                      onClick={() => onEdit && onEdit(device)}
                      className="mb-2 flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      <Edit size={16} className="mr-2" />
                      Edit Device
                    </button>

                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="flex w-full items-center justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
                    >
                      <Trash size={16} className="mr-2" />
                      Delete Device
                    </button>
                  </div>
                </Card.Content>
              </Card.Root>
            </div>
          </div>
        </Tabs.Content>

        {/* Registers tab content */}
        <Tabs.Content value="registers" className="mt-4">
          <Card.Root>
            <Card.Header>
              <h3 className="text-lg font-medium">Device Registers</h3>
            </Card.Header>
            <Card.Content>
              {device.registers && device.registers.length > 0 ? (
                <RegisterTable registers={device.registers} />
              ) : (
                <div className="rounded-lg bg-gray-50 py-8 text-center">
                  <ClipboardList size={32} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">No registers configured for this device</p>
                  <button
                    onClick={() => onEdit && onEdit(device)}
                    className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <Edit size={16} className="mr-2" />
                    Configure Registers
                  </button>
                </div>
              )}
            </Card.Content>
          </Card.Root>
        </Tabs.Content>

        {/* Data tab content */}
        <Tabs.Content value="data" className="mt-4">
          <div className="space-y-6">
            <DeviceDataChart
              deviceId={device._id}
              title="Temperature"
              initialMetric="temperature"
              initialTimeRange="24h"
            />

            <DeviceDataChart
              deviceId={device._id}
              title="Humidity"
              initialMetric="humidity"
              initialTimeRange="24h"
            />

            <DeviceDataChart
              deviceId={device._id}
              title="Power Consumption"
              initialMetric="power"
              initialTimeRange="7d"
              initialChartType="bar"
            />
          </div>
        </Tabs.Content>

        {/* History tab content */}
        <Tabs.Content value="history" className="mt-4">
          <Card.Root>
            <Card.Header>
              <h3 className="text-lg font-medium">Device History</h3>
            </Card.Header>
            <Card.Content>
              <div className="rounded-lg bg-gray-50 py-8 text-center">
                <History size={32} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">Device history will be displayed here</p>
              </div>
            </Card.Content>
          </Card.Root>
        </Tabs.Content>

        {/* Settings tab content */}
        <Tabs.Content value="settings" className="mt-4">
          <Card.Root>
            <Card.Header>
              <h3 className="text-lg font-medium">Device Settings</h3>
            </Card.Header>
            <Card.Content>
              <div className="rounded-lg bg-gray-50 py-8 text-center">
                <Settings size={32} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">Device settings will be displayed here</p>
                <button
                  onClick={() => onEdit && onEdit(device)}
                  className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <Edit size={16} className="mr-2" />
                  Edit Settings
                </button>
              </div>
            </Card.Content>
          </Card.Root>
        </Tabs.Content>
      </Tabs.Root>

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-25" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-900">Delete Device</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete this device? This action cannot be undone.
            </Dialog.Description>

            <div className="mt-6 flex flex-col">
              <div className="mb-4 rounded-md bg-gray-50 p-4">
                <div className="flex items-center">
                  <HardDrive size={20} className="mr-3 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{device.name}</p>
                    <p className="text-sm text-gray-500">
                      {device.ip && `${device.ip}:${device.port}`}
                      {device.make && device.model && ` • ${device.make} ${device.model}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border-l-4 border-red-500 bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle size={20} className="mr-3 text-red-500" />
                  <div className="text-sm text-red-700">
                    <p>This will permanently delete the device and all associated data.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Dialog.Close asChild>
                <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteDevice}
                className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Deleting...' : 'Delete Device'}
              </button>
            </div>

            <Dialog.Close asChild>
              <button
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-500"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default DeviceDetails;
