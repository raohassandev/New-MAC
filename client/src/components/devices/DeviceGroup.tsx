import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Edit,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Trash,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../hooks/useDevices';
import { Device } from '../../types/device.types';

interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceIds: string[];
  tags?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

const DeviceGroups: React.FC = () => {
  // State
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null);
  const [newGroup, setNewGroup] = useState<{
    name: string;
    description: string;
    deviceIds: string[];
  }>({
    name: '',
    description: '',
    deviceIds: [],
  });

  // Get devices and user info
  const { devices } = useDevices();
  const { user } = useAuth();

  // Permissions
  const userPermissions = user?.permissions || [];
  const canManageGroups =
    userPermissions.includes('manage_devices') || userPermissions.includes('manage_groups');

  // Mock API for device groups (replace with actual API when available)
  useEffect(() => {
    const fetchDeviceGroups = async () => {
      setLoading(true);
      setError(null);

      try {
        // In a real implementation, this would be an API call
        // const response = await fetch('/api/device-groups');
        // const data = await response.json();

        // For now, use mock data
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

        const mockGroups: DeviceGroup[] = [
          {
            id: 'group1',
            name: 'Server Room',
            description: 'All devices in the server room',
            deviceIds: ['1', '2', '3'],
            tags: ['server', 'high-priority'],
            createdAt: new Date('2023-01-15').toISOString(),
            updatedAt: new Date('2023-04-10').toISOString(),
          },
          {
            id: 'group2',
            name: 'Office Building',
            description: 'Devices in the main office building',
            deviceIds: ['4', '5'],
            tags: ['office', 'medium-priority'],
            createdAt: new Date('2023-02-20').toISOString(),
            updatedAt: new Date('2023-03-15').toISOString(),
          },
          {
            id: 'group3',
            name: 'Factory Floor',
            description: 'Production area devices',
            deviceIds: ['6', '7', '8', '9'],
            tags: ['production', 'high-priority'],
            createdAt: new Date('2023-03-05').toISOString(),
            updatedAt: new Date('2023-04-20').toISOString(),
          },
          {
            id: 'group4',
            name: 'Warehouse',
            description: 'Warehouse monitoring devices',
            deviceIds: ['10', '11'],
            tags: ['storage', 'low-priority'],
            createdAt: new Date('2023-03-10').toISOString(),
            updatedAt: new Date('2023-03-10').toISOString(),
          },
        ];

        setGroups(mockGroups);
      } catch (err) {
        console.error('Error fetching device groups:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch device groups'));
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceGroups();
  }, []);

  // Filter groups based on search query
  const filteredGroups = groups.filter(
    group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (group.tags && group.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Calculate total device count for a group
  const getGroupDeviceCount = (group: DeviceGroup) => {
    return group.deviceIds.length;
  };

  // Calculate online device count for a group
  const getGroupOnlineDeviceCount = (group: DeviceGroup) => {
    if (!devices) return 0;

    let onlineCount = 0;
    group.deviceIds.forEach(id => {
      const device = devices.find(d => d._id === id);
      if (device && device.enabled) {
        onlineCount++;
      }
    });

    return onlineCount;
  };

  // Get device names for a group
  const getGroupDeviceNames = (group: DeviceGroup) => {
    if (!devices) return [];

    return group.deviceIds.map(id => {
      const device = devices.find(d => d._id === id);
      return device ? device.name : 'Unknown Device';
    });
  };

  // Handle opening the create modal
  const handleOpenCreateModal = () => {
    setNewGroup({
      name: '',
      description: '',
      deviceIds: [],
    });
    setIsCreateModalOpen(true);
  };

  // Handle opening the edit modal
  const handleOpenEditModal = (group: DeviceGroup) => {
    setSelectedGroup(group);
    setNewGroup({
      name: group.name,
      description: group.description || '',
      deviceIds: [...group.deviceIds],
    });
    setIsEditModalOpen(true);
  };

  // Handle opening the delete modal
  const handleOpenDeleteModal = (group: DeviceGroup) => {
    setSelectedGroup(group);
    setIsDeleteModalOpen(true);
  };

  // Handle creating a new group
  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      // In a real implementation, this would be an API call
      // const response = await fetch('/api/device-groups', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newGroup)
      // });
      // const data = await response.json();

      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

      const newId = `group${groups.length + 1}`;
      const createdGroup: DeviceGroup = {
        id: newId,
        name: newGroup.name,
        description: newGroup.description,
        deviceIds: newGroup.deviceIds,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setGroups([...groups, createdGroup]);
      setIsCreateModalOpen(false);
      toast.success('Device group created successfully');
    } catch (err) {
      console.error('Error creating device group:', err);
      toast.error('Failed to create device group');
    }
  };

  // Handle updating an existing group
  const handleUpdateGroup = async () => {
    if (!selectedGroup || !newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      // In a real implementation, this would be an API call
      // const response = await fetch(`/api/device-groups/${selectedGroup.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newGroup)
      // });
      // const data = await response.json();

      // For now, update local state
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

      const updatedGroup: DeviceGroup = {
        ...selectedGroup,
        name: newGroup.name,
        description: newGroup.description,
        deviceIds: newGroup.deviceIds,
        updatedAt: new Date().toISOString(),
      };

      setGroups(groups.map(group => (group.id === selectedGroup.id ? updatedGroup : group)));

      setIsEditModalOpen(false);
      toast.success('Device group updated successfully');
    } catch (err) {
      console.error('Error updating device group:', err);
      toast.error('Failed to update device group');
    }
  };

  // Handle deleting a group
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    try {
      // In a real implementation, this would be an API call
      // const response = await fetch(`/api/device-groups/${selectedGroup.id}`, {
      //   method: 'DELETE'
      // });

      // For now, update local state
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

      setGroups(groups.filter(group => group.id !== selectedGroup.id));
      setIsDeleteModalOpen(false);
      toast.success('Device group deleted successfully');
    } catch (err) {
      console.error('Error deleting device group:', err);
      toast.error('Failed to delete device group');
    }
  };

  // Toggle device selection in group form
  const toggleDeviceSelection = (deviceId: string) => {
    setNewGroup(prev => {
      if (prev.deviceIds.includes(deviceId)) {
        return {
          ...prev,
          deviceIds: prev.deviceIds.filter(id => id !== deviceId),
        };
      } else {
        return {
          ...prev,
          deviceIds: [...prev.deviceIds, deviceId],
        };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border-l-4 border-red-500 bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="mr-3 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800">Error</h3>
            <p className="text-red-700">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Device Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize your devices into logical groups for easier management
          </p>
        </div>
        {canManageGroups && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <FolderPlus size={16} />
            Create Group
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search groups..."
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
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <Folder size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">No device groups found</h3>
          <p className="mb-4 text-gray-500">
            {searchQuery
              ? 'Try adjusting your search'
              : "You haven't created any device groups yet."}
          </p>
          {canManageGroups && !searchQuery && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              <Plus size={16} className="mr-2" />
              Create your first group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map(group => (
            <div
              key={group.id}
              className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg"
            >
              <div className="border-b p-4">
                <div className="flex items-start justify-between">
                  <Link
                    to={`/device-groups/${group.id}`}
                    className="text-lg font-medium text-blue-600 hover:text-blue-800"
                  >
                    {group.name}
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => {}}
                      className="rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {/* Dropdown menu would go here */}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {group.description || 'No description'}
                </p>

                {group.tags && group.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4">
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center">
                      <Server size={16} className="mr-1.5 text-gray-400" />
                      <span>{getGroupDeviceCount(group)} devices</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {getGroupOnlineDeviceCount(group)} online
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {canManageGroups && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(group)}
                          className="rounded-full p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                          title="Edit Group"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(group)}
                          className="rounded-full p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                          title="Delete Group"
                        >
                          <Trash size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Create Device Group</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Group Name *</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Select Devices
                </label>
                <div className="max-h-60 overflow-y-auto rounded-md border border-gray-300">
                  {devices && devices.length > 0 ? (
                    devices.map((device: Device) => (
                      <div
                        key={device._id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          id={`device-${device._id}`}
                          checked={newGroup.deviceIds.includes(device._id)}
                          onChange={() => toggleDeviceSelection(device._id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`device-${device._id}`}
                          className="ml-2 block text-sm text-gray-900"
                        >
                          {device.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500">No devices available</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  className="rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {isEditModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Edit Device Group</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Group Name *</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Select Devices
                </label>
                <div className="max-h-60 overflow-y-auto rounded-md border border-gray-300">
                  {devices && devices.length > 0 ? (
                    devices.map((device: Device) => (
                      <div
                        key={device._id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          id={`edit-device-${device._id}`}
                          checked={newGroup.deviceIds.includes(device._id)}
                          onChange={() => toggleDeviceSelection(device._id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`edit-device-${device._id}`}
                          className="ml-2 block text-sm text-gray-900"
                        >
                          {device.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500">No devices available</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateGroup}
                  className="rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  Update Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete the group "{selectedGroup.name}"? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
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

export default DeviceGroups;
