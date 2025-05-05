import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Server, Settings, Tag, Info, Database, HelpCircle } from 'lucide-react';
import { toast } from 'react-toastify';

// Import UI components
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Form } from '../../components/ui/Form';
import { Tabs } from '../../components/ui/Tabs';
import { Dialog } from '../../components/ui/Dialog';
import { Switch } from '../../components/ui/Switch';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';

// Import services for device drivers
import { getDeviceDrivers, DeviceDriver } from '../../services/deviceDrivers';

// Import types
import { DataPoint } from '../../types/device.types';

// Device usage categories
const DEVICE_USAGE_CATEGORIES = [
  { id: 'energy_analysis', name: 'Energy Analyzer', description: 'Devices that measure and analyze energy consumption' },
  { id: 'power_source', name: 'Power Source', description: 'Power generation or synchronization modules' },
  { id: 'temperature', name: 'Temperature Sensor', description: 'Devices measuring temperature in industrial settings' },
  { id: 'motion', name: 'Motion Sensor', description: 'RPM sensors, motion detectors, and speed measurements' },
  { id: 'level', name: 'Level Sensor', description: 'Liquid or solid material level measurement devices' },
  { id: 'pressure', name: 'Pressure Sensor', description: 'Devices measuring pressure in industrial processes' },
  { id: 'flow', name: 'Flow Meter', description: 'Devices measuring flow of liquids or gases' },
  { id: 'automation', name: 'Automation Control', description: 'PLCs and other control systems' },
  { id: 'other', name: 'Other', description: 'Other device types not listed above' },
];

interface NewDeviceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  title?: string;
  isEditing?: boolean;
}

const NewDeviceForm: React.FC<NewDeviceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = 'Add New Device',
  isEditing = false,
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [deviceData, setDeviceData] = useState({
    name: '',
    deviceDriverId: '',
    usage: '',
    usageNotes: '',
    location: '',
    enabled: true,
    connectionSetting: {
      connectionType: 'tcp',
      tcp: {
        ip: '',
        port: 502,
        slaveId: 1
      },
      rtu: {
        serialPort: '',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        slaveId: 1
      }
    },
    make: '',
    model: '',
    description: '',
    tags: [] as string[],
    dataPoints: [] as DataPoint[],
  });
  
  const [deviceDrivers, setDeviceDrivers] = useState<DeviceDriver[]>([]);
  const [selectedDeviceDriver, setSelectedDeviceDriver] = useState<DeviceDriver | null>(null);
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [driverLoadError, setDriverLoadError] = useState<string | null>(null);

  // Fetch device drivers from AMX database
  useEffect(() => {
    const fetchDeviceDrivers = async () => {
      setIsLoadingDrivers(true);
      setDriverLoadError(null);
      try {
        const drivers = await getDeviceDrivers();
        setDeviceDrivers(drivers);
      } catch (error) {
        console.error('Failed to load device drivers:', error);
        setDriverLoadError('Failed to load device drivers. Please try again later.');
      } finally {
        setIsLoadingDrivers(false);
      }
    };

    fetchDeviceDrivers();
  }, []);

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      setDeviceData({
        ...deviceData,
        ...initialData,
      });

      // If device has a device driver ID, find and set the selected device driver
      if (initialData.deviceDriverId) {
        const driver = deviceDrivers.find(d => d._id === initialData.deviceDriverId);
        if (driver) {
          setSelectedDeviceDriver(driver);
        }
      }
    }
  }, [initialData, deviceDrivers]);

  // Handle selecting a device driver
  const handleDeviceDriverChange = (driverId: string) => {
    const driver = deviceDrivers.find(d => d._id === driverId);
    setSelectedDeviceDriver(driver || null);

    if (driver) {
      // Update device data with driver information
      setDeviceData(prevData => ({
        ...prevData,
        deviceDriverId: driverId,
        make: driver.make || prevData.make,
        model: driver.model || prevData.model,
        description: driver.description || prevData.description,
        dataPoints: driver.dataPoints || [],
        connectionSetting: {
          ...prevData.connectionSetting,
          connectionType: driver.connectionSetting?.connectionType || prevData.connectionSetting.connectionType,
        }
      }));
    }

    // Clear error when field is changed
    if (errors.deviceDriverId) {
      setErrors({
        ...errors,
        deviceDriverId: '',
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    // Handle nested properties for connection settings
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      if (parent === 'tcp' || parent === 'rtu') {
        setDeviceData({
          ...deviceData,
          connectionSetting: {
            ...deviceData.connectionSetting,
            [parent]: {
              ...deviceData.connectionSetting[parent as 'tcp' | 'rtu'],
              [child]: newValue,
            }
          }
        });
      }
    } else {
      setDeviceData({
        ...deviceData,
        [name]: newValue,
      });
    }

    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  // Handle connection type change
  const handleConnectionTypeChange = (type: string) => {
    setDeviceData({
      ...deviceData,
      connectionSetting: {
        ...deviceData.connectionSetting,
        connectionType: type as 'tcp' | 'rtu'
      }
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !deviceData.tags.includes(newTag.trim())) {
      setDeviceData({
        ...deviceData,
        tags: [...deviceData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDeviceData({
      ...deviceData,
      tags: deviceData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!deviceData.name.trim()) {
      newErrors.name = 'Device name is required';
    }

    // Only require device driver if device drivers are loaded
    if (deviceDrivers.length > 0 && !deviceData.deviceDriverId) {
      newErrors.deviceDriverId = 'Please select a device driver';
    }

    // Validate usage category
    if (!deviceData.usage) {
      newErrors.usage = 'Please select a device usage category';
    }

    // Connection settings validation
    if (deviceData.connectionSetting) {
      if (deviceData.connectionSetting.connectionType === 'tcp') {
        // TCP validation
        const tcp = deviceData.connectionSetting.tcp;
        if (!tcp || !tcp.ip || !tcp.ip.trim()) {
          newErrors['tcp.ip'] = 'IP address is required';
        }

        // Ensure port is a valid number
        if (tcp && (isNaN(Number(tcp.port)) || Number(tcp.port) <= 0 || Number(tcp.port) > 65535)) {
          newErrors['tcp.port'] = 'Port must be a valid number between 1-65535';
        }

        // Ensure slave ID is a valid number
        if (tcp && (isNaN(Number(tcp.slaveId)) || Number(tcp.slaveId) <= 0 || Number(tcp.slaveId) > 255)) {
          newErrors['tcp.slaveId'] = 'Slave ID must be a valid number between 1-255';
        }
      } else if (deviceData.connectionSetting.connectionType === 'rtu') {
        // RTU validation
        const rtu = deviceData.connectionSetting.rtu;
        if (!rtu || !rtu.serialPort || !rtu.serialPort.trim()) {
          newErrors['rtu.serialPort'] = 'Serial port is required';
        }

        // Additional RTU validations if needed
        if (rtu && (isNaN(Number(rtu.slaveId)) || Number(rtu.slaveId) <= 0 || Number(rtu.slaveId) > 255)) {
          newErrors['rtu.slaveId'] = 'Slave ID must be a valid number between 1-255';
        }
      }
    } else {
      // Connection settings must exist
      newErrors['connectionSetting'] = 'Connection settings are required';
    }

    // Set errors and return validation result
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      // Automatically switch to first tab with errors
      if (errors.name || errors.deviceDriverId) {
        setActiveTab('basic');
      } else if (errors['tcp.ip'] || errors['tcp.port'] || errors['tcp.slaveId'] || 
                errors['rtu.serialPort'] || errors['rtu.baudRate'] || errors['rtu.slaveId']) {
        setActiveTab('connection');
      } else if (errors.usage) {
        setActiveTab('metadata');
      }
      return;
    }

    // Prepare data for submission with proper type conversion
    try {
      const submissionData = {
        ...deviceData,
        // Ensure numeric values with proper conversions
        connectionSetting: {
          ...deviceData.connectionSetting,
          tcp: {
            ...deviceData.connectionSetting.tcp,
            port: parseInt(deviceData.connectionSetting.tcp.port.toString()) || 502,
            slaveId: parseInt(deviceData.connectionSetting.tcp.slaveId.toString()) || 1
          },
          rtu: {
            ...deviceData.connectionSetting.rtu,
            baudRate: parseInt(deviceData.connectionSetting.rtu.baudRate.toString()) || 9600,
            dataBits: parseInt(deviceData.connectionSetting.rtu.dataBits.toString()) || 8,
            stopBits: parseInt(deviceData.connectionSetting.rtu.stopBits.toString()) || 1,
            slaveId: parseInt(deviceData.connectionSetting.rtu.slaveId.toString()) || 1
          }
        }
      };

      // Add default values for empty fields to prevent backend validation errors
      if (!submissionData.description) submissionData.description = '';
      if (!submissionData.make) submissionData.make = '';
      if (!submissionData.model) submissionData.model = '';
      if (!submissionData.location) submissionData.location = '';
      if (!submissionData.usageNotes) submissionData.usageNotes = '';
      
      // Ensure required arrays are defined
      submissionData.tags = submissionData.tags || [];
      submissionData.dataPoints = submissionData.dataPoints || [];

      // Call the onSubmit handler with the prepared data
      onSubmit(submissionData);
    } catch (error) {
      console.error('Error preparing device data for submission:', error);
      toast.error('There was an error processing your form data. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const tabItems = [
    { id: 'basic', label: 'Basic Details', icon: <Server size={16} /> },
    { id: 'driver', label: 'Device Driver', icon: <Database size={16} /> },
    { id: 'connection', label: 'Connection', icon: <Settings size={16} /> },
    { id: 'metadata', label: 'Metadata', icon: <Info size={16} /> },
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <Dialog.Content className="w-full max-w-4xl">
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Close />
        </Dialog.Header>

        <Form onSubmit={handleSubmit}>
          <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} variant="boxed">
            {/* Basic Details Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4 pt-4">
                <Form.Group>
                  <Form.Label htmlFor="name" required>
                    Device Name
                  </Form.Label>
                  <Input
                    id="name"
                    name="name"
                    value={deviceData.name}
                    onChange={handleInputChange}
                    placeholder="Enter a unique name for this device"
                    error={errors.name}
                  />
                  <Form.Description>
                    Choose a descriptive name that helps identify this specific device
                  </Form.Description>
                </Form.Group>

                <Form.Group>
                  <Form.Label htmlFor="description">Description</Form.Label>
                  <Form.Textarea
                    id="description"
                    name="description"
                    value={deviceData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the device"
                    rows={3}
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label htmlFor="location">Location</Form.Label>
                  <Input
                    id="location"
                    name="location"
                    value={deviceData.location}
                    onChange={handleInputChange}
                    placeholder="Where is this device installed? (e.g., Building A, Floor 2, Panel 3)"
                  />
                </Form.Group>

                <Switch
                  label="Device Enabled"
                  description="Device will be available for communication when enabled"
                  checked={deviceData.enabled}
                  onChange={e =>
                    setDeviceData({
                      ...deviceData,
                      enabled: (e.target as HTMLInputElement).checked,
                    })
                  }
                />
              </div>
            )}

            {/* Device Driver Tab */}
            {activeTab === 'driver' && (
              <div className="space-y-4 pt-4">
                <Form.Group>
                  <Form.Label htmlFor="deviceDriverId" required>
                    Select Device Driver
                  </Form.Label>
                  
                  {isLoadingDrivers ? (
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-500"></div>
                      <span>Loading device drivers...</span>
                    </div>
                  ) : driverLoadError ? (
                    <Alert variant="error">{driverLoadError}</Alert>
                  ) : deviceDrivers.length === 0 ? (
                    <Alert variant="warning">
                      No device drivers found. Please create a device driver first.
                    </Alert>
                  ) : (
                    <>
                      <Form.Select
                        id="deviceDriverId"
                        name="deviceDriverId"
                        value={deviceData.deviceDriverId}
                        onChange={(e) => handleDeviceDriverChange(e.target.value)}
                        options={[
                          { value: '', label: 'Select a device driver' },
                          ...deviceDrivers.map(driver => ({
                            value: driver._id,
                            label: `${driver.name} ${driver.make ? `(${driver.make} ${driver.model || ''})`.trim() : ''}`
                          }))
                        ]}
                        error={errors.deviceDriverId}
                      />
                      <Form.Description>
                        Device drivers contain communication parameters and register configurations
                      </Form.Description>
                    </>
                  )}
                </Form.Group>

                {selectedDeviceDriver && (
                  <div className="mt-4">
                    <Card>
                      <Card.Header>
                        <Card.Title>Selected Device Driver: {selectedDeviceDriver.name}</Card.Title>
                      </Card.Header>
                      <Card.Content>
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Manufacturer</dt>
                            <dd className="text-sm text-gray-900">{selectedDeviceDriver.make || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Model</dt>
                            <dd className="text-sm text-gray-900">{selectedDeviceDriver.model || 'N/A'}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Description</dt>
                            <dd className="text-sm text-gray-900">{selectedDeviceDriver.description || 'No description provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Device Type</dt>
                            <dd className="text-sm text-gray-900">{selectedDeviceDriver.deviceType || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Data Points</dt>
                            <dd className="text-sm text-gray-900">
                              {selectedDeviceDriver.dataPoints?.length || 0} configured
                            </dd>
                          </div>
                        </dl>
                      </Card.Content>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* Connection Tab */}
            {activeTab === 'connection' && (
              <div className="space-y-4 pt-4">
                <Form.Group>
                  <Form.Label htmlFor="connectionType">Connection Type</Form.Label>
                  <Form.Select
                    id="connectionType"
                    name="connectionType"
                    value={deviceData.connectionSetting.connectionType}
                    onChange={(e) => handleConnectionTypeChange(e.target.value)}
                    options={[
                      { value: 'tcp', label: 'Modbus TCP' },
                      { value: 'rtu', label: 'Modbus RTU' },
                    ]}
                  />
                </Form.Group>

                {deviceData.connectionSetting.connectionType === 'tcp' ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Form.Group>
                      <Form.Label htmlFor="tcp.ip" required>
                        IP Address
                      </Form.Label>
                      <Input
                        id="tcp.ip"
                        name="tcp.ip"
                        value={deviceData.connectionSetting.tcp.ip}
                        onChange={handleInputChange}
                        placeholder="192.168.1.100"
                        error={errors['tcp.ip']}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="tcp.port">Port</Form.Label>
                      <Input
                        id="tcp.port"
                        name="tcp.port"
                        type="number"
                        value={deviceData.connectionSetting.tcp.port}
                        onChange={handleInputChange}
                        placeholder="502"
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="tcp.slaveId">Slave ID</Form.Label>
                      <Input
                        id="tcp.slaveId"
                        name="tcp.slaveId"
                        type="number"
                        value={deviceData.connectionSetting.tcp.slaveId}
                        onChange={handleInputChange}
                        placeholder="1"
                      />
                    </Form.Group>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Form.Group>
                      <Form.Label htmlFor="rtu.serialPort" required>
                        Serial Port
                      </Form.Label>
                      <Input
                        id="rtu.serialPort"
                        name="rtu.serialPort"
                        value={deviceData.connectionSetting.rtu.serialPort}
                        onChange={handleInputChange}
                        placeholder="COM1, /dev/ttyS0"
                        error={errors['rtu.serialPort']}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="rtu.baudRate">Baud Rate</Form.Label>
                      <Form.Select
                        id="rtu.baudRate"
                        name="rtu.baudRate"
                        value={deviceData.connectionSetting.rtu.baudRate.toString()}
                        onChange={handleInputChange}
                        options={[
                          { value: '9600', label: '9600' },
                          { value: '19200', label: '19200' },
                          { value: '38400', label: '38400' },
                          { value: '57600', label: '57600' },
                          { value: '115200', label: '115200' },
                        ]}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="rtu.dataBits">Data Bits</Form.Label>
                      <Form.Select
                        id="rtu.dataBits"
                        name="rtu.dataBits"
                        value={deviceData.connectionSetting.rtu.dataBits.toString()}
                        onChange={handleInputChange}
                        options={[
                          { value: '7', label: '7' },
                          { value: '8', label: '8' },
                        ]}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="rtu.stopBits">Stop Bits</Form.Label>
                      <Form.Select
                        id="rtu.stopBits"
                        name="rtu.stopBits"
                        value={deviceData.connectionSetting.rtu.stopBits.toString()}
                        onChange={handleInputChange}
                        options={[
                          { value: '1', label: '1' },
                          { value: '2', label: '2' },
                        ]}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="rtu.parity">Parity</Form.Label>
                      <Form.Select
                        id="rtu.parity"
                        name="rtu.parity"
                        value={deviceData.connectionSetting.rtu.parity}
                        onChange={handleInputChange}
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'even', label: 'Even' },
                          { value: 'odd', label: 'Odd' },
                        ]}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="rtu.slaveId">Slave ID</Form.Label>
                      <Input
                        id="rtu.slaveId"
                        name="rtu.slaveId"
                        type="number"
                        value={deviceData.connectionSetting.rtu.slaveId}
                        onChange={handleInputChange}
                        placeholder="1"
                      />
                    </Form.Group>
                  </div>
                )}

                <div className="mt-2 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <HelpCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Connection Tips</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc space-y-1 pl-5">
                          <li>For Modbus TCP, ensure the device has a static IP address</li>
                          <li>Default Modbus TCP port is 502</li>
                          <li>For Modbus RTU, use the correct COM port or device path</li>
                          <li>Slave ID (Unit ID) must match the device's configuration</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Tab */}
            {activeTab === 'metadata' && (
              <div className="space-y-4 pt-4">
                <Form.Group>
                  <Form.Label htmlFor="usage" required>
                    Device Usage Category
                  </Form.Label>
                  <Form.Select
                    id="usage"
                    name="usage"
                    value={deviceData.usage}
                    onChange={handleInputChange}
                    options={[
                      { value: '', label: 'Select device usage' },
                      ...DEVICE_USAGE_CATEGORIES.map(category => ({
                        value: category.id,
                        label: category.name
                      }))
                    ]}
                    error={errors.usage}
                  />
                  {deviceData.usage && (
                    <Form.Description>
                      {DEVICE_USAGE_CATEGORIES.find(c => c.id === deviceData.usage)?.description}
                    </Form.Description>
                  )}
                </Form.Group>

                <Form.Group>
                  <Form.Label htmlFor="usageNotes">Usage Notes</Form.Label>
                  <Form.Textarea
                    id="usageNotes"
                    name="usageNotes"
                    value={deviceData.usageNotes}
                    onChange={handleInputChange}
                    placeholder="Additional details about how this device is being used"
                    rows={3}
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label htmlFor="tags">Tags</Form.Label>
                  <div className="flex">
                    <Input
                      id="tags"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Add tag and press Enter"
                      icon={<Tag size={16} />}
                      className="flex-grow"
                    />
                    <Button type="button" onClick={handleAddTag} className="ml-2" variant="outline">
                      <Plus size={16} />
                    </Button>
                  </div>

                  {deviceData.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {deviceData.tags.map(tag => (
                        <div
                          key={tag}
                          className="flex items-center rounded-full bg-blue-100 px-2 py-1 text-sm text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1.5 text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.Group>
              </div>
            )}
          </Tabs>

          <div className="mt-6 flex justify-end space-x-2 border-t pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Save size={16} className="mr-2" />
              {isEditing ? 'Update Device' : 'Create Device'}
            </Button>
          </div>
        </Form>
      </Dialog.Content>
    </Dialog>
  );
};

export default NewDeviceForm;