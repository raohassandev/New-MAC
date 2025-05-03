import { Check, ChevronDown, Folder, Plus, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Device } from '../../types/device.types';
import { useDevices } from '../../hooks/useDevices';

interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceIds: string[];
}

interface DeviceGroupSelectorProps {
  selectedGroup: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onCreateGroup?: (group: Omit<DeviceGroup, 'id'>) => Promise<void>;
  className?: string;
}

const DeviceGroupSelector: React.FC<DeviceGroupSelectorProps> = ({
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  className = '',
}) => {
  // State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get devices from context
  const { devices } = useDevices();

  // Mock data for groups since we don't have a backend implementation yet
  useEffect(() => {
    const mockGroups: DeviceGroup[] = [
      {
        id: 'group1',
        name: 'Server Room',
        description: 'All devices in the server room',
        deviceIds: ['1', '2'],
      },
      {
        id: 'group2',
        name: 'Office Building',
        description: 'Devices in the main office',
        deviceIds: ['3', '4'],
      },
      {
        id: 'group3',
        name: 'Factory Floor',
        description: 'Production area devices',
        deviceIds: ['5', '6', '7'],
      },
    ];

    setGroups(mockGroups);
  }, []);

  // Filtered groups based on search
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get the selected group object
  const currentGroup = selectedGroup ? groups.find(g => g.id === selectedGroup) : null;

  // New group form state
  const [newGroup, setNewGroup] = useState<{
    name: string;
    description: string;
    deviceIds: string[];
  }>({
    name: '',
    description: '',
    deviceIds: [],
  });

  // Handle creating new group
  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (onCreateGroup) {
        await onCreateGroup(newGroup);
      }

      // For now, just add it to our local state
      setGroups([
        ...groups,
        {
          id: `group${groups.length + 1}`,
          name: newGroup.name,
          description: newGroup.description,
          deviceIds: newGroup.deviceIds,
        },
      ]);

      // Reset form and close modal
      setNewGroup({
        name: '',
        description: '',
        deviceIds: [],
      });
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  // Toggle device selection in new group form
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

  return (
    <div className={`relative ${className}`}>
      {/* Group Selector Dropdown */}
      <div className="relative">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className="flex items-center">
            <Folder size={16} className="mr-2 text-gray-400" />
            {currentGroup ? currentGroup.name : 'All Devices'}
          </span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>

        {isDropdownOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
            <div className="p-2">
              {/* Search input */}
              <div className="relative mb-2">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 transform text-gray-400"
                />
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 py-1 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Group list */}
              <div className="max-h-60 overflow-y-auto">
                <div
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    onSelectGroup(null);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span>All Devices</span>
                  {selectedGroup === null && <Check size={14} className="text-blue-500" />}
                </div>

                {filteredGroups.map(group => (
                  <div
                    key={group.id}
                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      onSelectGroup(group.id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div>
                      <div>{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-gray-500">{group.description}</div>
                      )}
                    </div>
                    {selectedGroup === group.id && <Check size={14} className="text-blue-500" />}
                  </div>
                ))}

                {filteredGroups.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No groups found</div>
                )}
              </div>

              {/* Create new group button */}
              <button
                className="mt-2 flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-blue-500 hover:bg-blue-50"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus size={14} className="mr-1" />
                Create New Group
              </button>
            </div>
          </div>
        )}
      </div>

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
              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                  {error}
                </div>
              )}

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
                  disabled={loading || !newGroup.name.trim()}
                  className="rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceGroupSelector;
