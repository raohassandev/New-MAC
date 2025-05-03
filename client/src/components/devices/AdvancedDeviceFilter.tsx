import React, { useState, useEffect } from 'react';
import { Filter, X, Search, Check, ChevronDown, Tag, Settings, MapPin, Server } from 'lucide-react';

// Import UI components
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Checkbox } from '@/components/ui/Checkbox';
import { Toggle } from '@/components/ui/Toggle';
import { Popover } from '@/components/ui/Popover';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface DeviceFilter {
  search?: string;
  status?: 'online' | 'offline';
  tags?: string[];
  make?: string;
  model?: string;
  group?: string;
}

interface AdvancedDeviceFilterProps {
  onFilterChange: (filters: DeviceFilter) => void;
  devices: any[]; // This would be Device[] in a real implementation
  className?: string;
}

const AdvancedDeviceFilter: React.FC<AdvancedDeviceFilterProps> = ({
  onFilterChange,
  devices,
  className = '',
}) => {
  // Filter state
  const [filters, setFilters] = useState<DeviceFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'online' | 'offline' | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Dropdown states
  const [advancedFiltersVisible, setAdvancedFiltersVisible] = useState(false);

  // Extract unique values from devices
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string }[]>([]);

  // Extract filter options from devices
  useEffect(() => {
    if (!devices || devices.length === 0) return;

    // Extract tags
    const tags = new Set<string>();
    devices.forEach(device => {
      if (device.tags && device.tags.length > 0) {
        device.tags.forEach((tag: string) => tags.add(tag));
      }
    });
    setAvailableTags(Array.from(tags).sort());

    // Extract makes
    const makes = new Set<string>();
    devices.forEach(device => {
      if (device.make) {
        makes.add(device.make);
      }
    });
    setAvailableMakes(Array.from(makes).sort());

    // Extract models
    const models = new Set<string>();
    devices.forEach(device => {
      if (device.model) {
        models.add(device.model);
      }
    });
    setAvailableModels(Array.from(models).sort());

    // Mock groups for now - in a real implementation you would fetch this from API
    setAvailableGroups([
      { id: 'group1', name: 'Server Room' },
      { id: 'group2', name: 'Office Building' },
      { id: 'group3', name: 'Factory Floor' },
      { id: 'group4', name: 'Warehouse' },
    ]);
  }, [devices]);

  // Update filters whenever any filter state changes
  useEffect(() => {
    const updatedFilters: DeviceFilter = {
      search: searchQuery || undefined,
      status: selectedStatus || undefined,
    };

    if (selectedTags.length > 0) {
      updatedFilters.tags = selectedTags;
    }

    if (selectedMake) {
      updatedFilters.make = selectedMake;
    }

    if (selectedModel) {
      updatedFilters.model = selectedModel;
    }

    if (selectedGroup) {
      updatedFilters.group = selectedGroup;
    }

    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }, [
    searchQuery,
    selectedStatus,
    selectedTags,
    selectedMake,
    selectedModel,
    selectedGroup,
    onFilterChange,
  ]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus(null);
    setSelectedTags([]);
    setSelectedMake(null);
    setSelectedModel(null);
    setSelectedGroup(null);
  };

  // Toggle a tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  // Count active filters
  const activeFilterCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedStatus) count++;
    count += selectedTags.length;
    if (selectedMake) count++;
    if (selectedModel) count++;
    if (selectedGroup) count++;
    return count;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-grow">
          <Input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search devices..."
            icon={<Search size={16} />}
            clearable
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* Status Filter Dropdown */}
        <Dropdown
          trigger={
            <Button
              variant="outline"
              size="md"
              className="flex w-full items-center justify-between"
            >
              <span className="flex items-center">
                {selectedStatus ? (
                  <>
                    <div
                      className={`mr-2 h-2 w-2 rounded-full ${
                        selectedStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></div>
                    {selectedStatus === 'online' ? 'Online' : 'Offline'}
                  </>
                ) : (
                  'Status: All'
                )}
              </span>
              <ChevronDown size={16} className="ml-2" />
            </Button>
          }
          align="end"
          width="md"
        >
          <Dropdown.Item onClick={() => setSelectedStatus(null)} selected={selectedStatus === null}>
            All
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => setSelectedStatus('online')}
            selected={selectedStatus === 'online'}
          >
            <div className="flex items-center">
              <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
              Online
            </div>
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => setSelectedStatus('offline')}
            selected={selectedStatus === 'offline'}
          >
            <div className="flex items-center">
              <div className="mr-2 h-2 w-2 rounded-full bg-red-500"></div>
              Offline
            </div>
          </Dropdown.Item>
        </Dropdown>

        {/* Toggle Advanced Filters Button */}
        <Toggle
          pressed={advancedFiltersVisible}
          onPressedChange={setAdvancedFiltersVisible}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Filter size={16} className="mr-2" />
          {advancedFiltersVisible ? 'Hide Filters' : 'Advanced Filters'}
          {activeFilterCount() > 0 && !advancedFiltersVisible && (
            <Badge variant="info" size="sm" className="ml-2">
              {activeFilterCount()}
            </Badge>
          )}
        </Toggle>

        {/* Reset Filters Button */}
        {activeFilterCount() > 0 && (
          <Button variant="outline" onClick={resetFilters} className="inline-flex items-center">
            <X size={16} className="mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {advancedFiltersVisible && (
        <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Tags Dropdown - Using Popover */}
            <Popover
              trigger={
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    <Tag size={14} className="mr-1 inline" />
                    Tags
                  </label>
                  <Button
                    variant="outline"
                    size="md"
                    className="inline-flex w-full items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedTags.length
                        ? `${selectedTags.length} tag${
                            selectedTags.length !== 1 ? 's' : ''
                          } selected`
                        : 'Select tags'}
                    </span>
                    <ChevronDown size={16} className="ml-2" />
                  </Button>
                </div>
              }
              align="center"
              width="md"
            >
              {availableTags.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">No tags available</div>
              ) : (
                <div className="p-2">
                  <div className="mb-2">
                    {selectedTags.length > 0 && (
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => setSelectedTags([])}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                  {availableTags.map(tag => (
                    <div
                      key={tag}
                      className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() => toggleTag(tag)}
                    >
                      <Checkbox
                        checked={selectedTags.includes(tag)}
                        id={`tag-${tag}`}
                        onChange={() => toggleTag(tag)}
                        className="mr-2"
                      />
                      <label htmlFor={`tag-${tag}`} className="ml-2 cursor-pointer">
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </Popover>

            {selectedTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="info" size="sm" className="inline-flex items-center">
                    {tag}
                    <button
                      type="button"
                      className="ml-1 text-blue-600 hover:text-blue-800"
                      onClick={() => toggleTag(tag)}
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Manufacturer Dropdown */}
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <Settings size={14} className="mr-1 inline" />
                Manufacturer
              </label>
              <Dropdown
                trigger={
                  <Button
                    variant="outline"
                    size="md"
                    className="inline-flex w-full items-center justify-between"
                  >
                    <span className="truncate">{selectedMake || 'Any manufacturer'}</span>
                    <ChevronDown size={16} className="ml-2" />
                  </Button>
                }
                align="center"
                width="md"
              >
                <Dropdown.Item
                  onClick={() => setSelectedMake(null)}
                  selected={selectedMake === null}
                >
                  Any manufacturer
                </Dropdown.Item>
                {availableMakes.map(make => (
                  <Dropdown.Item
                    key={make}
                    onClick={() => setSelectedMake(make)}
                    selected={selectedMake === make}
                  >
                    {make}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>

            {/* Model Dropdown */}
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <Server size={14} className="mr-1 inline" />
                Model
              </label>
              <Dropdown
                trigger={
                  <Button
                    variant="outline"
                    size="md"
                    className="inline-flex w-full items-center justify-between"
                  >
                    <span className="truncate">{selectedModel || 'Any model'}</span>
                    <ChevronDown size={16} className="ml-2" />
                  </Button>
                }
                align="center"
                width="md"
              >
                <Dropdown.Item
                  onClick={() => setSelectedModel(null)}
                  selected={selectedModel === null}
                >
                  Any model
                </Dropdown.Item>
                {availableModels.map(model => (
                  <Dropdown.Item
                    key={model}
                    onClick={() => setSelectedModel(model)}
                    selected={selectedModel === model}
                  >
                    {model}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>

            {/* Group Dropdown */}
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <MapPin size={14} className="mr-1 inline" />
                Device Group
              </label>
              <Dropdown
                trigger={
                  <Button
                    variant="outline"
                    size="md"
                    className="inline-flex w-full items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedGroup
                        ? availableGroups.find(g => g.id === selectedGroup)?.name || 'Unknown Group'
                        : 'Any group'}
                    </span>
                    <ChevronDown size={16} className="ml-2" />
                  </Button>
                }
                align="center"
                width="md"
              >
                <Dropdown.Item
                  onClick={() => setSelectedGroup(null)}
                  selected={selectedGroup === null}
                >
                  Any group
                </Dropdown.Item>
                {availableGroups.map(group => (
                  <Dropdown.Item
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    selected={selectedGroup === group.id}
                  >
                    {group.name}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount() > 0 && (
            <div className="pt-2 text-sm text-gray-500">
              <span className="font-medium">Active filters:</span>{' '}
              {searchQuery && <span className="mr-2">Search, </span>}
              {selectedStatus && <span className="mr-2">Status, </span>}
              {selectedTags.length > 0 && (
                <span className="mr-2">Tags ({selectedTags.length}), </span>
              )}
              {selectedMake && <span className="mr-2">Manufacturer, </span>}
              {selectedModel && <span className="mr-2">Model, </span>}
              {selectedGroup && <span className="mr-2">Group</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedDeviceFilter;
