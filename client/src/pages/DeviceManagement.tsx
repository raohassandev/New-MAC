import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Download,
  Edit,
  FileText,
  Filter,
  Grid,
  HardDrive,
  List,
  Map as MapIcon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sliders,
  Trash,
  X,
} from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '../redux/store';
import {
  selectDeviceRefreshInterval,
  selectDevicePollingEnabled,
} from '../redux/features/siteConfiguration';

// Define useAppSelector to avoid circular dependencies
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import NewDeviceForm from '../components/devices/NewDeviceForm';
import { useAuth } from '../context/AuthContext';
import { useDevices } from '../hooks/useDevices';
// Import Device type from one consistent source
import { Device } from '../services/devices';
import { Button } from '../components/ui/Button';
import Table from '../components/ui/Table';

type ViewMode = 'grid' | 'list' | 'map';

const DeviceManagement: React.FC = () => {
  // Hooks
  const {
    devices,
    loading,
    error,
    refreshDevices,
    addDevice,
    updateDevice,
    deleteDevice,
    testConnection,
  } = useDevices();
  
  // Debug logging - check if devices are being loaded
  console.log('[DeviceManagement] Component loaded');
  console.log('[DeviceManagement] Devices:', devices);
  console.log('[DeviceManagement] Loading state:', loading);
  console.log('[DeviceManagement] Error state:', error);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Permissions
  const userPermissions = user?.permissions || [];
  // Removed unused variable canAddDevices
  const canEditDevices =
    userPermissions.includes('manage_devices') || userPermissions.includes('edit_devices');
  const canDeleteDevices =
    userPermissions.includes('manage_devices') || userPermissions.includes('delete_devices');
  const canTestDevices =
    userPermissions.includes('manage_devices') || userPermissions.includes('test_devices');

  // Get configuration values from siteConfiguration feature
  const deviceRefreshInterval = useAppSelector(selectDeviceRefreshInterval);
  const devicePollingEnabled = useAppSelector(selectDevicePollingEnabled);

  // Auto-refresh timer ref
  const refreshTimerRef = useRef<number | null>(null);

  // State
  // We've removed isNewDeviceModalOpen state since we're using only isNewDeviceFormOpen
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  // Remove unused variable warning
  // const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [isNewDeviceFormOpen, setIsNewDeviceFormOpen] = useState(false);
  const [testResults, setTestResults] = useState<{
    deviceId: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Extract all tags and device types from devices
  useEffect(() => {
    if (devices && devices.length > 0) {
      // Extract unique tags
      const allTags = devices.reduce((acc: string[], device) => {
        if (device.tags && device.tags.length > 0) {
          return [...acc, ...device.tags];
        }
        return acc;
      }, []);

      setTags([...new Set(allTags)]);

      // Extract unique device types based on make/model
      const types = devices.reduce((acc: string[], device) => {
        if (device.make && !acc.includes(device.make)) {
          return [...acc, device.make];
        }
        return acc;
      }, []);

      setDeviceTypes([...new Set(types)]);
    }
  }, [devices]);

  // Apply filters, sorting and search when dependencies change
  useEffect(() => {
    if (!devices) return;

    let filtered = [...devices];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        device =>
          device.name.toLowerCase().includes(query) ||
          (device.connectionSetting?.tcp?.ip &&
            device.connectionSetting.tcp.ip.toLowerCase().includes(query)) ||
          (device.make && device.make.toLowerCase().includes(query)) ||
          (device.model && device.model.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(device => {
        // Check if device is online based on both enabled and lastSeen
        const isOnline = device.enabled && device.lastSeen;
        return statusFilter === 'online' ? isOnline : !isOnline;
      });
    }

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter(device => device.make === typeFilter);
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      filtered = filtered.filter(device =>
        selectedTags.some(tag => device.tags && device.tags.includes(tag))
      );
    }

    // Apply group filter (placeholder for future implementation)
    if (groupFilter) {
      // This would filter by device group once implemented
    }

    filtered.sort((a, b) => {
      // Check if the property exists on both devices
      if (!(sortField in a) || !(sortField in b)) {
        return 0; // Skip comparison if property doesn't exist
      }

      // Use a type assertion to any for indexing
      const aVal: any = (a as any)[sortField];
      const bVal: any = (b as any)[sortField];

      // Handle special cases
      if (sortField === 'lastSeen') {
        const valueA = aVal ? new Date(aVal).getTime() : 0;
        const valueB = bVal ? new Date(bVal).getTime() : 0;
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      // Handle undefined values
      const valueA = aVal === undefined ? '' : aVal;
      const valueB = bVal === undefined ? '' : bVal;

      // Perform comparison
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredDevices(filtered as [Device]);
  }, [
    devices,
    searchQuery,
    statusFilter,
    typeFilter,
    groupFilter,
    selectedTags,
    sortField,
    sortDirection,
  ]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setTypeFilter(null);
    setGroupFilter(null);
    setSelectedTags([]);
  };

  // Handle device selection for bulk operations
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      } else {
        return [...prev, deviceId];
      }
    });
  };

  // Handle bulk selection of all filtered devices
  const handleSelectAll = () => {
    if (selectedDevices.length === filteredDevices.length) {
      // Deselect all if all are selected
      setSelectedDevices([]);
    } else {
      // Select all filtered devices
      setSelectedDevices(filteredDevices.map(device => device._id));
    }
  };

  // Handle bulk enable/disable of selected devices
  const handleBulkStatusChange = async (enable: boolean) => {
    for (const deviceId of selectedDevices) {
      const device = devices?.find(d => d._id === deviceId);
      if (device && device.enabled !== enable) {
        await updateDevice({ ...device, enabled: enable });
      }
    }

    // Refresh devices after all updates
    await refreshDevices();
    // Clear selection
    setSelectedDevices([]);
    setBulkActionMenuOpen(false);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedDevices.length === 0) return;

    setDeviceToDelete('bulk');
    setShowDeleteModal(true);
    setBulkActionMenuOpen(false);
  };

  // Handle single device delete
  const handleDeleteDevice = (deviceId: string) => {
    setDeviceToDelete(deviceId);
    setShowDeleteModal(true);
  };

  // Confirm device deletion
  const confirmDeleteDevice = async () => {
    try {
      if (deviceToDelete === 'bulk') {
        // Delete all selected devices
        for (const deviceId of selectedDevices) {
          await deleteDevice(deviceId);
        }
        setSelectedDevices([]);
      } else if (deviceToDelete) {
        // Delete single device
        await deleteDevice(deviceToDelete);
      }

      setShowDeleteModal(false);
      setDeviceToDelete(null);
    } catch (error) {
      console.error('Error deleting device(s):', error);
    }
  };

  // Set up polling based on configuration
  useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Only set up polling if enabled in configuration
    if (devicePollingEnabled) {
      refreshTimerRef.current = window.setInterval(() => {
        console.log(`Auto-refreshing devices every ${deviceRefreshInterval / 1000} seconds`);
        refreshDevices();
      }, deviceRefreshInterval);
    }

    // Clean up on unmount
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [deviceRefreshInterval, devicePollingEnabled, refreshDevices]);

  // Handle adding new device
  const handleAddDevice = async (deviceData: any) => {
    try {
      console.log('[DeviceManagement] Handling add device:', deviceData);
      // Don't close the form until we know the request was successful
      const newDevice = await addDevice(deviceData);
      console.log('[DeviceManagement] Device added successfully:', newDevice);

      // Only close the form after successful creation
      setIsNewDeviceFormOpen(false);
      await refreshDevices();

      // Show success message
      toast.success('Device created successfully');
      return newDevice;
    } catch (error) {
      console.error('[DeviceManagement] Error adding device:', error);

      // Propagate the error to the form component for display
      throw error;
    }
  };

  // Handle view device details
  const handleViewDevice = (deviceId: string) => {
    navigate(`/devices/${deviceId}`);
  };

  // Handle edit device
  const handleEditDevice = (deviceId: string) => {
    navigate(`/devices/${deviceId}`);
  };

  // Handle test connection
  const handleTestConnection = async (deviceId: string) => {
    setTestingDevice(deviceId);
    setTestResults(null);

    try {
      const result = await testConnection(deviceId);
      setTestResults({
        deviceId,
        success: result.success,
        message: result.message,
      });
    } catch (error: any) {
      setTestResults({
        deviceId,
        success: false,
        message: error.message || 'Connection test failed',
      });
    } finally {
      setTestingDevice(null);
    }
  };

  // Export devices to CSV
  const handleExportDevices = () => {
    if (!filteredDevices.length) return;

    // Create CSV content
    const headers = [
      'Name',
      'IP Address',
      'Port',
      'Status',
      'Slave ID',
      'Last Seen',
      'Make',
      'Model',
      'Tags',
    ].join(',');

    const rows = filteredDevices.map(device =>
      [
        device.name,
        device.connectionSetting?.tcp?.ip || device.connectionSetting?.rtu?.serialPort || '',
        device.connectionSetting?.tcp?.port || device.connectionSetting?.rtu?.baudRate || '',
        device.enabled ? 'Enabled' : 'Disabled',
        device.connectionSetting?.tcp?.slaveId || device.connectionSetting?.rtu?.slaveId || '',
        device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never',
        device.make || '',
        device.model || '',
        device.tags ? device.tags.join(';') : '',
      ].join(',')
    );

    const csvContent = [headers, ...rows].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `devices_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle tag selection
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // Otherwise, sort by this field in ascending order
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Format date for display
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'Never';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString();
  };

  // Get device statistics
  const getDeviceStats = () => {
    const total = filteredDevices.length;
    const online = filteredDevices.filter(device => device.enabled && device.lastSeen).length;
    const warning = filteredDevices.filter(device => device.enabled && !device.lastSeen).length;
    const offline = total - online - warning;

    return { total, online, offline, warning };
  };

  const onNewDeviceFormSubmit = (value: any) => {
    handleAddDevice(value);
  };

  const onNewDeviceFormClose = () => {
    setIsNewDeviceFormOpen(false);
  };

  const stats = getDeviceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Physical Device Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and monitor your actual Modbus devices (not templates)
          </p>
        </div>
        <div className="flex space-x-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/system-configuration')}
              className="flex items-center gap-2"
            >
              <Sliders size={16} />
              Configure Polling
            </Button>
            <Button
              variant="default"
              onClick={() => setIsNewDeviceFormOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add New Device
            </Button>
          </div>
          {filteredDevices.length > 0 && (
            <Button
              variant="outline"
              onClick={handleExportDevices}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Device Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center rounded-lg bg-white p-4 shadow-sm">
          <div className="mr-4 rounded-full bg-blue-100 p-3">
            <Server size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Devices</p>
            <p className="text-xl font-semibold">{stats.total}</p>
          </div>
        </div>

        <div className="flex items-center rounded-lg bg-white p-4 shadow-sm">
          <div className="mr-4 rounded-full bg-green-100 p-3">
            <CheckCircle size={20} className="text-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Online Devices</p>
            <p className="text-xl font-semibold">{stats.online}</p>
          </div>
        </div>

        <div className="flex items-center rounded-lg bg-white p-4 shadow-sm">
          <div className="mr-4 rounded-full bg-red-100 p-3">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Offline Devices</p>
            <p className="text-xl font-semibold">{stats.offline}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-4 flex flex-col gap-4 md:flex-row">
          {/* Search */}
          <div className="relative flex-grow">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search devices..."
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter || ''}
            onChange={e => setStatusFilter(e.target.value || null)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>

          {/* Device Type Filter */}
          <select
            value={typeFilter || ''}
            onChange={e => setTypeFilter(e.target.value || null)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {deviceTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
            disabled={
              !searchQuery &&
              !statusFilter &&
              !typeFilter &&
              !groupFilter &&
              selectedTags.length === 0
            }
          >
            <div className="flex items-center gap-1">
              <Filter size={16} />
              Reset
            </div>
          </button>

          {/* View Mode Toggles */}
          <div className="flex overflow-hidden rounded-md border border-gray-300">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 ${
                viewMode === 'map'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Map View"
            >
              <MapIcon size={16} />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refreshDevices}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </div>
              {devicePollingEnabled && (
                <span className="text-xs text-green-600">
                  Auto: {deviceRefreshInterval / 1000}s
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Tag Filters */}
        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  selectedTags.includes(tag)
                    ? 'border-blue-300 bg-blue-100 text-blue-800'
                    : 'border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Bulk Actions */}
        {selectedDevices.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedDevices.length} devices selected
              </span>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    onClick={() => setBulkActionMenuOpen(!bulkActionMenuOpen)}
                    className="flex items-center gap-1 rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                  >
                    Bulk Actions
                    <ChevronDown size={16} />
                  </button>

                  {bulkActionMenuOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white py-1 shadow-lg">
                      <button
                        onClick={() => handleBulkStatusChange(true)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        disabled={!canEditDevices}
                      >
                        Enable Selected
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange(false)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        disabled={!canEditDevices}
                      >
                        Disable Selected
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                        disabled={!canDeleteDevices}
                      >
                        Delete Selected
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedDevices([])}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Results Message */}
      {testResults && (
        <div
          className={`rounded-md p-4 ${
            testResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          } border`}
        >
          <div className="flex items-start">
            {testResults.success ? (
              <CheckCircle size={20} className="mr-3 mt-0.5 text-green-500" />
            ) : (
              <AlertCircle size={20} className="mr-3 mt-0.5 text-red-500" />
            )}
            <div>
              <p className={testResults.success ? 'text-green-800' : 'text-red-800'}>
                {testResults.message}
              </p>
              <button
                onClick={() => setTestResults(null)}
                className="mt-1 text-sm text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded border-l-4 border-red-500 bg-red-50 p-4">
          <div className="flex">
            <AlertCircle size={20} className="mr-3 text-red-500" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Devices Display */}
      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <p className="mt-4 text-gray-500">Loading devices...</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <HardDrive size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">No physical devices found</h3>
          <p className="mb-4 text-gray-500">
            {searchQuery || statusFilter || typeFilter || groupFilter || selectedTags.length > 0
              ? 'Try adjusting your filters'
              : "You haven't added any physical devices yet. First create a template in the Template Library, then use it to create a device."}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedDevices.length === filteredDevices.length &&
                          filteredDevices.length > 0
                        }
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <button
                        className="ml-2 flex items-center"
                        onClick={() => handleSortChange('name')}
                      >
                        <span>Name</span>
                        {sortField === 'name' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </div>
                  </Table.Head>
                  <Table.Head>
                    <button
                      className="flex items-center"
                      onClick={() => handleSortChange('enabled')}
                    >
                      <span>Status</span>
                      {sortField === 'enabled' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </Table.Head>
                  <Table.Head>
                    <button className="flex items-center" onClick={() => handleSortChange('ip')}>
                      <span>Connection Info</span>
                      {sortField === 'ip' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </Table.Head>
                  <Table.Head>
                    <button className="flex items-center" onClick={() => handleSortChange('make')}>
                      <span>Make/Model</span>
                      {sortField === 'make' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </Table.Head>
                  <Table.Head>
                    <button
                      className="flex items-center"
                      onClick={() => handleSortChange('lastSeen')}
                    >
                      <span>Last Seen</span>
                      {sortField === 'lastSeen' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </Table.Head>
                  <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredDevices.map(device => (
                  <Table.Row key={device._id} className="hover:bg-gray-50">
                    <Table.Cell>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(device._id)}
                          onChange={() => handleSelectDevice(device._id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div
                          className="ml-4 flex cursor-pointer items-center hover:text-blue-600"
                          onClick={() => handleViewDevice(device._id)}
                        >
                          <div
                            className={`mr-2 h-2.5 w-2.5 rounded-full ${
                              device.enabled && device.lastSeen ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          ></div>
                          <div className="font-medium text-gray-900">{device.name}</div>
                        </div>
                      </div>

                      {/* Tags */}
                      {device.tags && device.tags.length > 0 && (
                        <div className="ml-6 mt-1 flex flex-wrap gap-1">
                          {device.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                          device.enabled && device.lastSeen
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {device.enabled && device.lastSeen ? 'Online' : 'Offline'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      {device.connectionSetting?.tcp?.ip
                        ? `${device.connectionSetting.tcp.ip}:${device.connectionSetting.tcp.port} (ID: ${device.connectionSetting.tcp.slaveId})`
                        : device.connectionSetting?.rtu?.serialPort
                          ? `${device.connectionSetting.rtu.serialPort}:${device.connectionSetting.rtu.baudRate} (ID: ${device.connectionSetting.rtu.slaveId})`
                          : 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      {device.make && device.model
                        ? `${device.make} ${device.model}`
                        : device.make || device.model || 'N/A'}
                    </Table.Cell>
                    <Table.Cell>{formatDate(device.lastSeen)}</Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleViewDevice(device._id)}
                          title="View Details"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FileText size={16} />
                        </button>

                        {canTestDevices && (
                          <button
                            onClick={() => handleTestConnection(device._id)}
                            title="Test Connection"
                            className="text-blue-600 hover:text-blue-900"
                            disabled={testingDevice === device._id}
                          >
                            {testingDevice === device._id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Server size={16} />
                            )}
                          </button>
                        )}

                        {canEditDevices && (
                          <button
                            onClick={() => handleEditDevice(device._id)}
                            title="Edit"
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit size={16} />
                          </button>
                        )}

                        {canDeleteDevices && (
                          <button
                            onClick={() => handleDeleteDevice(device._id)}
                            title="Delete"
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash size={16} />
                          </button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDevices.map(device => (
            <div
              key={device._id}
              className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg"
            >
              <div className="relative border-b p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3
                      className="cursor-pointer text-lg font-medium text-gray-900 hover:text-blue-600"
                      onClick={() => handleViewDevice(device._id)}
                    >
                      {device.name}
                    </h3>
                    {device.make && device.model && (
                      <p className="text-sm text-gray-500">
                        {device.make} {device.model}
                      </p>
                    )}
                  </div>
                  <div
                    className={`h-3 w-3 rounded-full ${
                      device.enabled && device.lastSeen
                        ? 'bg-green-500'
                        : device.enabled
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    title={
                      device.enabled
                        ? device.lastSeen
                          ? 'Online'
                          : 'Enabled but not connected'
                        : 'Offline'
                    }
                  ></div>
                </div>

                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    {device.connectionSetting?.tcp?.ip
                      ? `${device.connectionSetting.tcp?.ip}:${device.connectionSetting?.tcp?.port}`
                      : 'No connection info'}
                  </p>
                </div>

                {device.tags && device.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {device.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device._id)}
                  onChange={() => handleSelectDevice(device._id)}
                  className="absolute right-4 top-4 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Last seen: {formatDate(device.lastSeen)}
                  </span>

                  <div className="relative">
                    <button
                      id={`device-actions-${device._id}`}
                      aria-haspopup="true"
                      className="rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {/* Dropdown menu would go here */}
                  </div>
                </div>

                <div className="mt-3 flex justify-between space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleViewDevice(device._id)}
                    className="flex-1"
                  >
                    View Details
                  </Button>

                  {canTestDevices && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(device._id)}
                      disabled={testingDevice === device._id}
                      className="flex-1"
                    >
                      {testingDevice === device._id ? (
                        <span className="flex items-center justify-center">
                          <RefreshCw size={12} className="mr-1 animate-spin" />
                          Testing...
                        </span>
                      ) : (
                        'Test Connection'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <MapIcon size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">Map View</h3>
          <p className="text-gray-500">
            The map view is coming soon. It will show the geographical locations of your devices.
          </p>
        </div>
      )}

      {/* New Device Modal */}
      <NewDeviceForm
        isOpen={isNewDeviceFormOpen}
        onClose={onNewDeviceFormClose}
        onSubmit={onNewDeviceFormSubmit}
        title="Add New Physical Device"
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Confirm Delete</h2>
            <p className="mb-4">
              {deviceToDelete === 'bulk'
                ? `Are you sure you want to delete ${selectedDevices.length} selected devices? This action cannot be undone.`
                : 'Are you sure you want to delete this device? This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeviceToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteDevice}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
