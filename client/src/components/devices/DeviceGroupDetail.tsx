import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Edit,
  Server,
  Trash,
  X,
  PlusCircle,
  Settings,
  Save,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { useDevices } from '../../hooks/useDevices';
import { useAuth } from '../../context/AuthContext';
import { Device } from '../../types/device.types';
import DeviceSelector from '../../components/devices/DeviceSelector';

interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceIds: string[];
  tags?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

const DeviceGroupDetail: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { devices, loading: devicesLoading } = useDevices();
  const { user } = useAuth();

  // Permissions
  const userPermissions = user?.permissions || [];
  const canManageGroups =
    userPermissions.includes('manage_devices') || userPermissions.includes('manage_groups');

  // State
  const [group, setGroup] = useState<DeviceGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedGroup, setEditedGroup] = useState<Partial<DeviceGroup>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch group data
  useEffect(() => {
    const fetchGroupData = async () => {
      if (!groupId) return;

      setLoading(true);
      setError(null);

      try {
        // In a real implementation, this would be an API call
        // const response = await fetch(`/api/device-groups/${groupId}`);
        // const data = await response.json();

        // For now, use mock data
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

        // Mock data
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

        const foundGroup = mockGroups.find(g => g.id === groupId);

        if (foundGroup) {
          setGroup(foundGroup);
          setEditedGroup({
            name: foundGroup.name,
            description: foundGroup.description,
            deviceIds: [...foundGroup.deviceIds],
            tags: foundGroup.tags ? [...foundGroup.tags] : [],
          });
        } else {
          setError('Group not found');
        }
      } catch (err) {
        console.error('Error fetching group:', err);
        setError('Failed to fetch group details');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/device-groups');
  };

  // Handle edit mode
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Handle save edits
  const handleSave = async () => {
    if (!group || !editedGroup.name) {
      toast.error('Group name is required');
      return;
    }

    try {
      setLoading(true);

      // In a real implementation, this would be an API call
      // const response = await fetch(`/api/device-groups/${group.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(editedGroup)
      // });
      // const data = await response.json();

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedGroup: DeviceGroup = {
        ...group,
        name: editedGroup.name || group.name,
        description: editedGroup.description,
        deviceIds: editedGroup.deviceIds || [],
        tags: editedGroup.tags || [],
        updatedAt: new Date().toISOString(),
      };

      setGroup(updatedGroup);
      setIsEditing(false);
      setSuccess('Group updated successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating group:', err);
      setError('Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    if (group) {
      setEditedGroup({
        name: group.name,
        description: group.description,
        deviceIds: [...group.deviceIds],
        tags: group.tags ? [...group.tags] : [],
      });
    }
    setIsEditing(false);
  };

  // Handle delete group
  const handleDeleteGroup = async () => {
    try {
      setLoading(true);

      // In a real implementation, this would be an API call
      // const response = await fetch(`/api/device-groups/${group.id}`, {
      //   method: 'DELETE'
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Group deleted successfully');
      navigate('/device-groups');
    } catch (err) {
      console.error('Error deleting group:', err);
      setError('Failed to delete group');
      setLoading(false);
    }
  };

  // Handle device selection change
  const handleDeviceSelectionChange = (deviceIds: string[]) => {
    setEditedGroup(prev => ({
      ...prev,
      deviceIds,
    }));
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedGroup(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle tag input
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();

      if (!editedGroup.tags?.includes(newTag)) {
        setEditedGroup(prev => ({
          ...prev,
          tags: [...(prev.tags || []), newTag],
        }));
      }

      // Clear input
      e.currentTarget.value = '';
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setEditedGroup(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove),
    }));
  };

  // Loading state
  if (loading && !group) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error && !group) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h2 className="mb-2 text-xl font-semibold text-red-700">Error Loading Group</h2>
        <p className="mb-4 text-red-600">{error}</p>
        <button
          onClick={handleBack}
          className="inline-flex items-center rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Device Groups
        </button>
      </div>
    );
  }

  // Group not found
  if (!group) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-gray-500" />
        <h2 className="mb-2 text-xl font-semibold text-gray-700">Group Not Found</h2>
        <p className="mb-4 text-gray-600">The requested device group could not be found.</p>
        <button
          onClick={handleBack}
          className="inline-flex items-center rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Device Groups
        </button>
      </div>
    );
  }

  // Calculate devices stats
  const getDevicesStats = () => {
    if (!devices) return { total: 0, online: 0, offline: 0 };

    const groupDevices = devices.filter(device => group.deviceIds.includes(device._id));

    const total = groupDevices.length;
    const online = groupDevices.filter(device => device.enabled).length;
    const offline = total - online;

    return { total, online, offline };
  };

  const deviceStats = getDevicesStats();

  return (
    <div className="space-y-6">
      {/* Header with group name and actions */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <button
            onClick={handleBack}
            className="mb-2 flex items-center text-blue-500 hover:text-blue-700"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to device groups
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{group.name}</h1>
        </div>

        <div className="flex gap-2">
          {canManageGroups && !isEditing && (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1 rounded-md border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
              >
                <Trash size={16} />
                Delete
              </button>
            </>
          )}

          {isEditing && (
            <>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                <Save size={16} />
                Save Changes
              </button>
            </>
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

      {/* Group details and devices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Group details */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">Group Details</h2>
            </div>

            <div className="p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={editedGroup.name || ''}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={editedGroup.description || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Tags</label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {editedGroup.tags?.map((tag, index) => (
                        <div
                          key={index}
                          className="flex items-center rounded-full bg-blue-100 px-2 py-1 text-sm text-blue-800"
                        >
                          {tag}
                          <button
                            className="ml-1.5 text-blue-600 hover:text-blue-800"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add tag (press Enter)"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      onKeyDown={handleTagInput}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1 text-gray-900">
                      {group.description || 'No description provided'}
                    </p>
                  </div>

                  {group.tags && group.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Tags</h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {group.tags.map((tag, index) => (
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

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created</h3>
                    <p className="mt-1 text-gray-900">
                      {group.createdAt && new Date(group.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                    <p className="mt-1 text-gray-900">
                      {group.updatedAt && new Date(group.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">Group Statistics</h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-2xl font-semibold text-gray-900">{deviceStats.total}</div>
                  <div className="text-sm text-gray-500">Total Devices</div>
                </div>

                <div className="rounded-lg bg-green-50 p-3">
                  <div className="text-2xl font-semibold text-green-600">{deviceStats.online}</div>
                  <div className="text-sm text-green-800">Online</div>
                </div>

                <div className="rounded-lg bg-red-50 p-3">
                  <div className="text-2xl font-semibold text-red-600">{deviceStats.offline}</div>
                  <div className="text-sm text-red-800">Offline</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Devices */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">Devices in Group</h2>
              {isEditing && (
                <div className="text-sm text-gray-500">
                  Select or deselect devices to update the group
                </div>
              )}
            </div>

            <div className="p-6">
              {isEditing ? (
                <DeviceSelector
                  selectedDevices={editedGroup.deviceIds || []}
                  onChange={handleDeviceSelectionChange}
                />
              ) : devicesLoading ? (
                <div className="py-4 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-500">Loading devices...</p>
                </div>
              ) : !devices || devices.length === 0 ? (
                <div className="rounded-lg bg-gray-50 py-6 text-center">
                  <Server size={36} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">No devices available in the system</p>
                </div>
              ) : group.deviceIds.length === 0 ? (
                <div className="rounded-lg bg-gray-50 py-6 text-center">
                  <Server size={36} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">No devices assigned to this group</p>
                  {canManageGroups && (
                    <button
                      onClick={handleEdit}
                      className="mt-2 inline-flex items-center rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
                    >
                      <PlusCircle size={14} className="mr-1.5" />
                      Add devices
                    </button>
                  )}
                </div>
              ) : (
                <div>
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
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                          >
                            IP Address
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {devices
                          .filter(device => group.deviceIds.includes(device._id))
                          .map(device => (
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
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                                    device.enabled
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {device.enabled ? 'Online' : 'Offline'}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                {device.ip ? `${device.ip}:${device.port}` : 'N/A'}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                <a
                                  href={`/devices/${device._id}`}
                                  className="mr-3 text-blue-600 hover:text-blue-900"
                                >
                                  View
                                </a>
                                <a
                                  href={`/devices/${device._id}`}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Edit
                                </a>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete the group "{group.name}"? This action cannot be
              undone.
            </p>
            {deviceStats.total > 0 && (
              <div className="mb-4 rounded-md border border-yellow-100 bg-yellow-50 p-3">
                <p className="text-yellow-800">
                  <AlertCircle size={16} className="mr-1 inline" />
                  This group contains {deviceStats.total} devices. The devices will not be deleted,
                  but they will no longer be part of this group.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
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

export default DeviceGroupDetail;
