import React, { useState } from 'react';
import {
  Plus,
  Server,
  Grid as GridIcon,
  List as ListIcon,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  RefreshCw,
} from 'lucide-react';

import { Device as DeviceFromTypes } from '../../types/device.types';

import { Device as DeviceType } from '../../types/device.types';
// Import UI components
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { Tooltip } from '@/components/ui/Tooltip';
import { Toggle } from '@/components/ui/Toggle';
import { Empty } from '@/components/ui/Empty';

// Import device-specific components
import AdvancedDeviceFilter from './AdvancedDeviceFilter';
import DeviceForm from './DeviceForm';
import DeviceGroupSelector from './DeviceGroupSelector';
import DeviceImportExport from './DeviceImportExport';

// Import types and hooks
import { useDevices } from '../../hooks/useDevices';
import { Device } from '../../types/device.types';
import DeviceCard from './DeviceCard';

interface DeviceListProps {
  title?: string;
  showTitle?: boolean;
  showFilters?: boolean;
  showImportExport?: boolean;
  showGroupSelector?: boolean;
  initialFilters?: Record<string, any>;
  className?: string;
}

type SortField = 'name' | 'status' | 'lastSeen' | 'make' | 'model';
type SortDirection = 'asc' | 'desc';

const DeviceList: React.FC<DeviceListProps> = ({
  title = 'Devices',
  showTitle = true,
  showFilters = true,
  showImportExport = true,
  showGroupSelector = true,
  initialFilters = {},
  className = '',
}) => {
  // State
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState(initialFilters);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  // Get devices from hooks
  const { devices, loading, error, addDevice, updateDevice, deleteDevice, refreshDevices } =
    useDevices();

  // Filtered and sorted devices
  const filteredDevices = React.useMemo(() => {
    if (!devices) return [];

    // Start with all devices
    let result = [...devices];

    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(
        device =>
          device.name.toLowerCase().includes(searchTerm) ||
          device.ip?.toLowerCase().includes(searchTerm) ||
          device.make?.toLowerCase().includes(searchTerm) ||
          device.model?.toLowerCase().includes(searchTerm) ||
          device.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.status) {
      result = result.filter(
        device =>
          (filters.status === 'online' && device.enabled) ||
          (filters.status === 'offline' && !device.enabled)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(device => device.tags?.some(tag => filters.tags.includes(tag)));
    }

    if (filters.make) {
      result = result.filter(device => device.make === filters.make);
    }

    if (filters.model) {
      result = result.filter(device => device.model === filters.model);
    }

    if (selectedGroup) {
      // In a real app, we would filter by group ID
      // For now, just a placeholder
      console.log('Filter by group:', selectedGroup);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = Number(a.enabled) - Number(b.enabled);
          break;
        case 'lastSeen':
          if (!a.lastSeen && !b.lastSeen) comparison = 0;
          else if (!a.lastSeen) comparison = 1;
          else if (!b.lastSeen) comparison = -1;
          else {
            const dateA = new Date(a.lastSeen).getTime();
            const dateB = new Date(b.lastSeen).getTime();
            comparison = dateA - dateB;
          }
          break;
        case 'make':
          comparison = (a.make || '').localeCompare(b.make || '');
          break;
        case 'model':
          comparison = (a.model || '').localeCompare(b.model || '');
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [devices, filters, sortField, sortDirection, selectedGroup]);

  // Handle adding a new device
  const handleAddDevice = (deviceData: any) => {
    addDevice(deviceData);
    setIsAddDeviceModalOpen(false);
  };

  // Handle editing a device
  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
  };

  // Handle saving edited device
  const handleSaveEditedDevice = (deviceData: any) => {
    updateDevice({ ...editingDevice, ...deviceData });
    setEditingDevice(null);
  };

  // Handle deleting a device
  const handleDeleteDevice = (device: Device) => {
    deleteDevice(device._id);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    setFilters({ ...filters, ...newFilters });
  };

  // Handle changing sort
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Otherwise, change field and reset to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  //   // Handle selecting a device
  //   const handleSelectDevice = (deviceId: string) => {
  //     setSelectedDevices((prev) =>
  //       prev.includes(deviceId)
  //         ? prev.filter((id) => id !== deviceId)
  //         : [...prev, deviceId]
  //     );
  //   };

  //   // Handle select all devices
  //   const handleSelectAll = () => {
  //     if (selectedDevices.length === filteredDevices.length) {
  //       setSelectedDevices([]);
  //     } else {
  //       setSelectedDevices(filteredDevices.map((device) => device._id));
  //     }
  //   };
  // Add a type assertion for the handler functions
  const handleEditDeviceWithCorrectType = (device: any) => {
    // Cast device to the expected type if needed
    handleEditDevice(device as DeviceFromTypes);
  };

  const handleDeleteDeviceWithCorrectType = (device: any) => {
    // Cast device to the expected type if needed
    handleDeleteDevice(device as DeviceFromTypes);
  };
  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (action === 'delete' && selectedDevices.length > 0) {
      // Confirm first
      if (window.confirm(`Are you sure you want to delete ${selectedDevices.length} devices?`)) {
        selectedDevices.forEach(id => deleteDevice(id));
        setSelectedDevices([]);
      }
    }
  };

  // Import devices
  const handleImportDevices = async (importedDevices: any[]) => {
    try {
      // In a real app, this would be a batch operation
      for (const device of importedDevices) {
        await addDevice(device);
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      {showTitle && (
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <div className="flex space-x-2">
            <Button
              variant="default"
              onClick={() => setIsAddDeviceModalOpen(true)}
              icon={<Plus size={16} />}
            >
              Add Device
            </Button>

            {showImportExport && (
              <DeviceImportExport devices={devices || []} onImportDevices={handleImportDevices} />
            )}
          </div>
        </div>
      )}

      {/* Filters and controls */}
      {showFilters && (
        <div className="mb-6">
          <AdvancedDeviceFilter onFilterChange={handleFilterChange} devices={devices || []} />
        </div>
      )}

      {/* Secondary controls */}
      <div className="mb-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        {showGroupSelector && (
          <div className="w-full md:w-auto">
            <DeviceGroupSelector selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} />
          </div>
        )}

        <div className="ml-auto flex items-center space-x-2">
          {/* Sort Dropdown */}
          <Dropdown
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                icon={sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              >
                Sort: {sortField}
              </Button>
            }
            align="end"
          >
            <Dropdown.Item onClick={() => handleSortChange('name')} selected={sortField === 'name'}>
              Name
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => handleSortChange('status')}
              selected={sortField === 'status'}
            >
              Status
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => handleSortChange('lastSeen')}
              selected={sortField === 'lastSeen'}
            >
              Last Seen
            </Dropdown.Item>
            <Dropdown.Item onClick={() => handleSortChange('make')} selected={sortField === 'make'}>
              Manufacturer
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => handleSortChange('model')}
              selected={sortField === 'model'}
            >
              Model
            </Dropdown.Item>
          </Dropdown>

          {/* View Toggle */}
          <div className="flex items-center overflow-hidden rounded-md border">
            <Toggle
              pressed={viewMode === 'grid'}
              onPressedChange={() => setViewMode('grid')}
              className="p-1.5 text-gray-500 data-[state=on]:bg-gray-100"
            >
              <GridIcon size={16} />
            </Toggle>
            <Toggle
              pressed={viewMode === 'list'}
              onPressedChange={() => setViewMode('list')}
              className="p-1.5 text-gray-500 data-[state=on]:bg-gray-100"
            >
              <ListIcon size={16} />
            </Toggle>
          </div>

          {/* Refresh button */}
          <Tooltip content="Refresh devices">
            <Button
              variant="outline"
              size="icon"
              onClick={refreshDevices}
              className="p-1.5"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedDevices.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-blue-50 p-3">
          <div className="text-sm">
            <span className="font-medium">{selectedDevices.length}</span> devices selected
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedDevices([])}>
              Clear Selection
            </Button>
            <Dropdown
              trigger={
                <Button variant="default" size="sm">
                  Bulk Actions
                </Button>
              }
              align="end"
            >
              <Dropdown.Item danger onClick={() => handleBulkAction('delete')}>
                Delete Selected
              </Dropdown.Item>
            </Dropdown>
          </div>
        </div>
      )}

      {/* Devices grid/list */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="mb-4 rounded border-l-4 border-red-500 bg-red-50 p-4">
          <div className="flex">
            <AlertCircle size={24} className="mr-3 text-red-500" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
      ) : filteredDevices.length === 0 ? (
        <Empty
          title="No devices found"
          description={
            Object.keys(filters).length > 0
              ? 'Try adjusting your filters or add a new device'
              : 'Get started by adding your first device'
          }
          icon={<Server size={48} />}
          action={
            <Button onClick={() => setIsAddDeviceModalOpen(true)} icon={<Plus size={16} />}>
              Add Device
            </Button>
          }
        />
      ) : (
        <div className="relative">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDevices.map((device: DeviceType) => {
                // Convert the device to ensure proper types
                const convertedDevice = {
                  ...device,
                  // Ensure lastSeen is a Date object if it exists
                  lastSeen: device.lastSeen
                    ? typeof device.lastSeen === 'string'
                      ? new Date(device.lastSeen)
                      : device.lastSeen
                    : undefined,
                };

                return (
                  <DeviceCard
                    key={device._id}
                    device={convertedDevice}
                    onEdit={handleEditDeviceWithCorrectType}
                    onDelete={handleDeleteDeviceWithCorrectType}
                  />
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Make/Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredDevices.map(device => (
                    <tr key={device._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div
                            className={`mr-2 h-2.5 w-2.5 rounded-full ${
                              device.enabled ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          ></div>
                          <div className="font-medium text-gray-900">{device.name}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge variant={device.enabled ? 'success' : 'danger'} size="sm">
                          {device.enabled ? 'Online' : 'Offline'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {device.ip ? `${device.ip}:${device.port || 502}` : 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {device.make || '-'} {device.model || ''}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDevice(device)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDevice(device)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Device Modal */}
      <DeviceForm
        isOpen={isAddDeviceModalOpen}
        onClose={() => setIsAddDeviceModalOpen(false)}
        onSubmit={handleAddDevice}
        title="Add New Device"
      />

      {/* Edit Device Modal */}
      {editingDevice && (
        <DeviceForm
          isOpen={!!editingDevice}
          onClose={() => setEditingDevice(null)}
          onSubmit={handleSaveEditedDevice}
          initialData={editingDevice}
          title={`Edit Device: ${editingDevice.name}`}
          isEditing
        />
      )}
    </div>
  );
};

export default DeviceList;
