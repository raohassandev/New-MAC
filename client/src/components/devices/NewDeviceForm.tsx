import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Server,
  Settings,
  Tag,
  Info,
  Database,
  HelpCircle,
  AlertCircle,
  Zap,
  Clock,
  RefreshCw,
  TerminalSquare,
} from 'lucide-react';
import { toast } from 'react-toastify';

// Import UI components
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Form } from '../../components/ui/Form';
import { Tabs } from '../../components/ui/Tabs';
// import { Dialog } from '../../components/ui/Dialog';
import { Switch } from '../../components/ui/Switch';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';

// Import services for device drivers
import { getDeviceDrivers, DeviceDriver } from '../../services/deviceDrivers';

// Import types
import { DataPoint } from '../../types/device.types';

// Device usage categories
const DEVICE_USAGE_CATEGORIES = [
  {
    id: 'energy_analysis',
    name: 'Energy Analyzer',
    description: 'Devices that measure and analyze energy consumption',
  },
  {
    id: 'power_source',
    name: 'Power Source',
    description: 'Power generation or synchronization modules',
  },
  {
    id: 'temperature',
    name: 'Temperature Sensor',
    description: 'Devices measuring temperature in industrial settings',
  },
  {
    id: 'motion',
    name: 'Motion Sensor',
    description: 'RPM sensors, motion detectors, and speed measurements',
  },
  {
    id: 'level',
    name: 'Level Sensor',
    description: 'Liquid or solid material level measurement devices',
  },
  {
    id: 'pressure',
    name: 'Pressure Sensor',
    description: 'Devices measuring pressure in industrial processes',
  },
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
        slaveId: 1,
      },
      rtu: {
        serialPort: '',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        slaveId: 1,
      },
    },
    make: '',
    model: '',
    description: '',
    tags: [] as string[],
    dataPoints: [] as DataPoint[],
    advancedSettings: {
      defaultPollInterval: 30000, // 30 seconds
      defaultRequestTimeout: 5000, // 5 seconds
      connectionOptions: {
        timeout: 10000, // 10 seconds
        retries: 3,
        retryInterval: 1000, // 1 second
        autoReconnect: true,
        reconnectInterval: 5000, // 5 seconds
      },
      cacheOptions: {
        enabled: true,
        defaultTtl: 60000, // 1 minute
        maxSize: 10000,
        checkInterval: 60000, // 1 minute
      },
      logOptions: {
        level: 'info',
        console: true,
        file: {
          enabled: false,
          path: '',
          maxSize: 5, // 5 MB
          maxFiles: 5,
        },
      },
    },
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
          connectionType:
            driver.connectionSetting?.connectionType || prevData.connectionSetting.connectionType,
        },
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

    // Handle nested properties using path notation (e.g. 'tcp.ip', 'advancedSettings.defaultPollInterval')
    if (name.includes('.')) {
      const paths = name.split('.');

      // Handle connection settings (special case for backward compatibility)
      if (paths[0] === 'tcp' || paths[0] === 'rtu') {
        setDeviceData({
          ...deviceData,
          connectionSetting: {
            ...deviceData.connectionSetting,
            [paths[0]]: {
              ...deviceData.connectionSetting[paths[0] as 'tcp' | 'rtu'],
              [paths[1]]: newValue,
            },
          },
        });
      }
      // Handle advanced settings with up to 3 levels of nesting
      else if (paths[0] === 'advancedSettings') {
        if (paths.length === 2) {
          // Handle 'advancedSettings.defaultPollInterval'
          setDeviceData({
            ...deviceData,
            advancedSettings: {
              ...deviceData.advancedSettings,
              [paths[1]]: newValue,
            },
          });
        } else if (paths.length === 3) {
          // Handle 'advancedSettings.connectionOptions.timeout'
          const key1 = paths[1] as keyof typeof deviceData.advancedSettings;
          const existingValue = deviceData.advancedSettings?.[key1];
          const currentObj = (existingValue && typeof existingValue === 'object' && existingValue !== null) 
            ? existingValue as Record<string, any>
            : {};
          
          setDeviceData({
            ...deviceData,
            advancedSettings: {
              ...deviceData.advancedSettings,
              [paths[1]]: {
                ...currentObj,
                [paths[2]]: newValue,
              },
            },
          });
        } else if (paths.length === 4) {
          // Handle 'advancedSettings.logOptions.file.enabled'
          const level1 = paths[1]; // logOptions
          const level2 = paths[2]; // file
          const level3 = paths[3]; // enabled

          // Safely cast to avoid TypeScript errors
          const level1Obj =
            deviceData.advancedSettings[level1 as keyof typeof deviceData.advancedSettings];

          setDeviceData({
            ...deviceData,
            advancedSettings: {
              ...deviceData.advancedSettings,
              [level1]: {
                ...(level1Obj as any),
                [level2]: {
                  ...(level1Obj as any)[level2],
                  [level3]: newValue,
                },
              },
            },
          });
        }
      } else {
        // Handle other nested properties
        console.warn(`Unhandled nested property: ${name}`);
      }
    } else {
      // Handle root level properties
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
        connectionType: type as 'tcp' | 'rtu',
      },
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

    // Only require device driver if device drivers are available in the database
    if (deviceDrivers.length > 0 && !deviceData.deviceDriverId) {
      newErrors.deviceDriverId = 'Please select a device driver';
    } else if (deviceDrivers.length === 0) {
      // Add a more descriptive top-level error when no device drivers available
      newErrors.noDeviceDrivers =
        'No device drivers available. Please create a device driver first before adding a device.';
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
        if (
          tcp &&
          (isNaN(Number(tcp.slaveId)) || Number(tcp.slaveId) <= 0 || Number(tcp.slaveId) > 255)
        ) {
          newErrors['tcp.slaveId'] = 'Slave ID must be a valid number between 1-255';
        }
      } else if (deviceData.connectionSetting.connectionType === 'rtu') {
        // RTU validation
        const rtu = deviceData.connectionSetting.rtu;
        if (!rtu || !rtu.serialPort || !rtu.serialPort.trim()) {
          newErrors['rtu.serialPort'] = 'Serial port is required';
        }

        // Additional RTU validations if needed
        if (
          rtu &&
          (isNaN(Number(rtu.slaveId)) || Number(rtu.slaveId) <= 0 || Number(rtu.slaveId) > 255)
        ) {
          newErrors['rtu.slaveId'] = 'Slave ID must be a valid number between 1-255';
        }
      }
    } else {
      // Connection settings must exist
      newErrors['connectionSetting'] = 'Connection settings are required';
    }

    // Advanced settings validation
    if (deviceData.advancedSettings) {
      // Validate polling interval
      if (
        isNaN(Number(deviceData.advancedSettings.defaultPollInterval)) ||
        Number(deviceData.advancedSettings.defaultPollInterval) < 100
      ) {
        newErrors['advancedSettings.defaultPollInterval'] = 'Poll interval must be at least 100ms';
      }

      // Validate request timeout
      if (
        isNaN(Number(deviceData.advancedSettings.defaultRequestTimeout)) ||
        Number(deviceData.advancedSettings.defaultRequestTimeout) < 100
      ) {
        newErrors['advancedSettings.defaultRequestTimeout'] =
          'Request timeout must be at least 100ms';
      }

      // Validate connection options
      if (deviceData.advancedSettings.connectionOptions) {
        const connOpts = deviceData.advancedSettings.connectionOptions;

        if (isNaN(Number(connOpts.timeout)) || Number(connOpts.timeout) < 100) {
          newErrors['advancedSettings.connectionOptions.timeout'] =
            'Connection timeout must be at least 100ms';
        }

        if (isNaN(Number(connOpts.retries)) || Number(connOpts.retries) < 0) {
          newErrors['advancedSettings.connectionOptions.retries'] =
            'Retries must be a non-negative number';
        }

        if (isNaN(Number(connOpts.retryInterval)) || Number(connOpts.retryInterval) < 100) {
          newErrors['advancedSettings.connectionOptions.retryInterval'] =
            'Retry interval must be at least 100ms';
        }

        if (
          connOpts.autoReconnect &&
          (isNaN(Number(connOpts.reconnectInterval)) || Number(connOpts.reconnectInterval) < 100)
        ) {
          newErrors['advancedSettings.connectionOptions.reconnectInterval'] =
            'Reconnect interval must be at least 100ms';
        }
      }

      // Validate cache options
      if (
        deviceData.advancedSettings.cacheOptions &&
        deviceData.advancedSettings.cacheOptions.enabled
      ) {
        const cacheOpts = deviceData.advancedSettings.cacheOptions;

        if (isNaN(Number(cacheOpts.defaultTtl)) || Number(cacheOpts.defaultTtl) < 1000) {
          newErrors['advancedSettings.cacheOptions.defaultTtl'] =
            'Cache TTL must be at least 1000ms (1 second)';
        }

        if (isNaN(Number(cacheOpts.maxSize)) || Number(cacheOpts.maxSize) < 100) {
          newErrors['advancedSettings.cacheOptions.maxSize'] =
            'Cache max size must be at least 100 entries';
        }

        if (isNaN(Number(cacheOpts.checkInterval)) || Number(cacheOpts.checkInterval) < 1000) {
          newErrors['advancedSettings.cacheOptions.checkInterval'] =
            'Cache check interval must be at least 1000ms (1 second)';
        }
      }

      // Validate log file options
      if (
        deviceData.advancedSettings.logOptions &&
        deviceData.advancedSettings.logOptions.file &&
        deviceData.advancedSettings.logOptions.file.enabled
      ) {
        const fileOpts = deviceData.advancedSettings.logOptions.file;

        if (isNaN(Number(fileOpts.maxSize)) || Number(fileOpts.maxSize) <= 0) {
          newErrors['advancedSettings.logOptions.file.maxSize'] =
            'Max file size must be a positive number';
        }

        if (isNaN(Number(fileOpts.maxFiles)) || Number(fileOpts.maxFiles) <= 0) {
          newErrors['advancedSettings.logOptions.file.maxFiles'] =
            'Max files must be a positive number';
        }
      }
    }

    // Set errors and return validation result
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NewDeviceForm] Form submission started');
    setSubmissionError(null);

    if (!validateForm()) {
      console.log('[NewDeviceForm] Form validation failed', errors);

      // Special case for no device drivers available
      if (errors.noDeviceDrivers) {
        toast.error('Cannot create device: No device drivers available');
        return;
      }

      toast.error('Please fill in all required fields');
      // Automatically switch to first tab with errors
      if (errors.name || errors.deviceDriverId) {
        setActiveTab('basic');
      } else if (
        errors['tcp.ip'] ||
        errors['tcp.port'] ||
        errors['tcp.slaveId'] ||
        errors['rtu.serialPort'] ||
        errors['rtu.baudRate'] ||
        errors['rtu.slaveId']
      ) {
        setActiveTab('connection');
      } else if (errors.usage) {
        setActiveTab('metadata');
      } else if (
        errors['advancedSettings.defaultPollInterval'] ||
        errors['advancedSettings.defaultRequestTimeout'] ||
        errors['advancedSettings.connectionOptions.timeout']
      ) {
        setActiveTab('advanced');
      }
      return;
    }

    console.log('[NewDeviceForm] Form validation successful');
    setIsSubmitting(true);

    // Prepare data for submission with proper type conversion
    try {
      console.log('[NewDeviceForm] Preparing submission data');
      const submissionData = {
        ...deviceData,
        // Ensure numeric values with proper conversions
        connectionSetting: {
          ...deviceData.connectionSetting,
          tcp: {
            ...deviceData.connectionSetting.tcp,
            port: parseInt(deviceData.connectionSetting.tcp.port.toString()) || 502,
            slaveId: parseInt(deviceData.connectionSetting.tcp.slaveId.toString()) || 1,
          },
          rtu: {
            ...deviceData.connectionSetting.rtu,
            baudRate: parseInt(deviceData.connectionSetting.rtu.baudRate.toString()) || 9600,
            dataBits: parseInt(deviceData.connectionSetting.rtu.dataBits.toString()) || 8,
            stopBits: parseInt(deviceData.connectionSetting.rtu.stopBits.toString()) || 1,
            slaveId: parseInt(deviceData.connectionSetting.rtu.slaveId.toString()) || 1,
          },
        },
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

      console.log('[NewDeviceForm] Final submission data:', submissionData);

      // Call the onSubmit handler with the prepared data
      console.log('[NewDeviceForm] Calling onSubmit handler');

      try {
        await onSubmit(submissionData);
        // If we get here, submission was successful
        console.log('[NewDeviceForm] Submission successful');
      } catch (error: any) {
        console.error('[NewDeviceForm] Error during form submission:', error);

        // Set error message to display to user
        const errorMessage =
          error?.response?.data?.message || error?.message || 'Failed to create device';
        setSubmissionError(errorMessage);
        toast.error(errorMessage);

        // Do not close the form - keep it open so user can see the error and try again
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('[NewDeviceForm] Error preparing device data for submission:', error);
      toast.error('There was an error processing your form data. Please try again.');
      setIsSubmitting(false);
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
    { id: 'advanced', label: 'Advanced Settings', icon: <Zap size={16} /> },
  ];

  if (!isOpen) return null;

  const handleCloseModal = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // If called from an event handler, prevent default
    if (e) e.preventDefault();
    
    // Make sure we call the onClose callback to update the parent component's state
    onClose();
    console.log("Modal close handler called");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
      <div className="w-[95vw] md:w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4 md:p-6">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">{title}</h2>
          <button 
            type="button"
            onClick={handleCloseModal} 
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 md:p-6">

        <Form onSubmit={handleSubmit}>
          {/* No Device Drivers Error */}
          {errors.noDeviceDrivers && (
            <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Device Driver Required</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>{errors.noDeviceDrivers}</p>
                    <p className="mt-1">
                      You must have at least one device driver defined before you can add devices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} variant="boxed">
            {/* Tabs content with scroll */}
            <div className="overflow-y-auto max-h-[50vh] sm:max-h-[55vh] md:max-h-[60vh] pr-2">
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
                  onCheckedChange={(checked) => {
                    setDeviceData({
                      ...deviceData,
                      enabled: checked,
                    });
                  }}
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
                    <div className="space-y-3">
                      <Alert variant="warning">
                        No device drivers available in the database. You need to create device
                        drivers before adding devices.
                      </Alert>
                      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                        <p>Device drivers define:</p>
                        <ul className="mt-1 list-disc pl-5">
                          <li>Communication register mapping</li>
                          <li>Data points and their properties</li>
                          <li>Default connection settings</li>
                        </ul>
                        <p className="mt-2">
                          Go to Device Drivers section to create device drivers first.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Form.Select
                        id="deviceDriverId"
                        name="deviceDriverId"
                        value={deviceData.deviceDriverId}
                        onChange={e => handleDeviceDriverChange(e.target.value)}
                        options={[
                          { value: '', label: 'Select a device driver' },
                          ...deviceDrivers.map(driver => ({
                            value: driver._id,
                            label: `${driver.name} ${driver.make ? `(${driver.make} ${driver.model || ''})`.trim() : ''}`,
                          })),
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
                            <dd className="text-sm text-gray-900">
                              {selectedDeviceDriver.make || 'N/A'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Model</dt>
                            <dd className="text-sm text-gray-900">
                              {selectedDeviceDriver.model || 'N/A'}
                            </dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Description</dt>
                            <dd className="text-sm text-gray-900">
                              {selectedDeviceDriver.description || 'No description provided'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Device Type</dt>
                            <dd className="text-sm text-gray-900">
                              {selectedDeviceDriver.deviceType || 'N/A'}
                            </dd>
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
                    onChange={e => handleConnectionTypeChange(e.target.value)}
                    options={[
                      { value: 'tcp', label: 'Modbus TCP' },
                      { value: 'rtu', label: 'Modbus RTU' },
                    ]}
                  />
                </Form.Group>

                {deviceData.connectionSetting.connectionType === 'tcp' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        label: category.name,
                      })),
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

            {/* Advanced Settings Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6 pt-4">
                {/* Polling and Timeout Settings */}
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 flex items-center text-base font-medium text-gray-900">
                    <Clock size={18} className="mr-2" />
                    Polling & Timeout
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.defaultPollInterval">
                        Poll Interval (ms)
                      </Form.Label>
                      <Input
                        id="advancedSettings.defaultPollInterval"
                        name="advancedSettings.defaultPollInterval"
                        type="number"
                        value={deviceData.advancedSettings.defaultPollInterval}
                        onChange={handleInputChange}
                      />
                      <Form.Description>
                        Default interval between polling requests (milliseconds)
                      </Form.Description>
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.defaultRequestTimeout">
                        Request Timeout (ms)
                      </Form.Label>
                      <Input
                        id="advancedSettings.defaultRequestTimeout"
                        name="advancedSettings.defaultRequestTimeout"
                        type="number"
                        value={deviceData.advancedSettings.defaultRequestTimeout}
                        onChange={handleInputChange}
                      />
                      <Form.Description>
                        Default timeout for communication requests (milliseconds)
                      </Form.Description>
                    </Form.Group>
                  </div>
                </div>

                {/* Connection Options */}
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 flex items-center text-base font-medium text-gray-900">
                    <RefreshCw size={18} className="mr-2" />
                    Connection Options
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.connectionOptions.timeout">
                        Connection Timeout (ms)
                      </Form.Label>
                      <Input
                        id="advancedSettings.connectionOptions.timeout"
                        name="advancedSettings.connectionOptions.timeout"
                        type="number"
                        value={deviceData.advancedSettings.connectionOptions.timeout}
                        onChange={handleInputChange}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.connectionOptions.retries">
                        Retries
                      </Form.Label>
                      <Input
                        id="advancedSettings.connectionOptions.retries"
                        name="advancedSettings.connectionOptions.retries"
                        type="number"
                        value={deviceData.advancedSettings.connectionOptions.retries}
                        onChange={handleInputChange}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.connectionOptions.retryInterval">
                        Retry Interval (ms)
                      </Form.Label>
                      <Input
                        id="advancedSettings.connectionOptions.retryInterval"
                        name="advancedSettings.connectionOptions.retryInterval"
                        type="number"
                        value={deviceData.advancedSettings.connectionOptions.retryInterval}
                        onChange={handleInputChange}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Switch
                        label="Auto Reconnect"
                        checked={deviceData.advancedSettings.connectionOptions.autoReconnect}
                        onCheckedChange={checked => {
                          setDeviceData({
                            ...deviceData,
                            advancedSettings: {
                              ...deviceData.advancedSettings,
                              connectionOptions: {
                                ...deviceData.advancedSettings.connectionOptions,
                                autoReconnect: checked,
                              },
                            },
                          });
                        }}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.connectionOptions.reconnectInterval">
                        Reconnect Interval (ms)
                      </Form.Label>
                      <Input
                        id="advancedSettings.connectionOptions.reconnectInterval"
                        name="advancedSettings.connectionOptions.reconnectInterval"
                        type="number"
                        value={deviceData.advancedSettings.connectionOptions.reconnectInterval}
                        onChange={handleInputChange}
                        disabled={!deviceData.advancedSettings.connectionOptions.autoReconnect}
                      />
                    </Form.Group>
                  </div>
                </div>

                {/* Cache Options */}
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 flex items-center text-base font-medium text-gray-900">
                    <Database size={18} className="mr-2" />
                    Cache Options
                  </h3>
                  <Form.Group>
                    <Switch
                      label="Enable Caching"
                      checked={deviceData.advancedSettings.cacheOptions.enabled}
                      onCheckedChange={checked => {
                        setDeviceData({
                          ...deviceData,
                          advancedSettings: {
                            ...deviceData.advancedSettings,
                            cacheOptions: {
                              ...deviceData.advancedSettings.cacheOptions,
                              enabled: checked,
                            },
                          },
                        });
                      }}
                    />
                  </Form.Group>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.cacheOptions.defaultTtl">
                        Default TTL (ms)
                      </Form.Label>
                      <Input
                        id="advancedSettings.cacheOptions.defaultTtl"
                        name="advancedSettings.cacheOptions.defaultTtl"
                        type="number"
                        value={deviceData.advancedSettings.cacheOptions.defaultTtl}
                        onChange={handleInputChange}
                        disabled={!deviceData.advancedSettings.cacheOptions.enabled}
                      />
                      <Form.Description>Time-to-live for cached values</Form.Description>
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.cacheOptions.maxSize">
                        Max Size
                      </Form.Label>
                      <Input
                        id="advancedSettings.cacheOptions.maxSize"
                        name="advancedSettings.cacheOptions.maxSize"
                        type="number"
                        value={deviceData.advancedSettings.cacheOptions.maxSize}
                        onChange={handleInputChange}
                        disabled={!deviceData.advancedSettings.cacheOptions.enabled}
                      />
                      <Form.Description>Maximum items in cache</Form.Description>
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.cacheOptions.checkInterval">
                        Check Interval (ms)
                      </Form.Label>
                      <Input
                        id="advancedSettings.cacheOptions.checkInterval"
                        name="advancedSettings.cacheOptions.checkInterval"
                        type="number"
                        value={deviceData.advancedSettings.cacheOptions.checkInterval}
                        onChange={handleInputChange}
                        disabled={!deviceData.advancedSettings.cacheOptions.enabled}
                      />
                      <Form.Description>Interval to check for expired items</Form.Description>
                    </Form.Group>
                  </div>
                </div>

                {/* Logging Options */}
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 flex items-center text-base font-medium text-gray-900">
                    <TerminalSquare size={18} className="mr-2" />
                    Logging Options
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Form.Group>
                      <Form.Label htmlFor="advancedSettings.logOptions.level">Log Level</Form.Label>
                      <Form.Select
                        id="advancedSettings.logOptions.level"
                        name="advancedSettings.logOptions.level"
                        value={deviceData.advancedSettings.logOptions.level}
                        onChange={handleInputChange}
                        options={[
                          { value: 'debug', label: 'Debug (Most Verbose)' },
                          { value: 'info', label: 'Info (Standard)' },
                          { value: 'warn', label: 'Warning' },
                          { value: 'error', label: 'Error (Least Verbose)' },
                        ]}
                      />
                      <Form.Description>Minimum level of messages to log</Form.Description>
                    </Form.Group>

                    <Form.Group>
                      <Switch
                        label="Console Logging"
                        checked={deviceData.advancedSettings.logOptions.console}
                        onCheckedChange={checked => {
                          setDeviceData({
                            ...deviceData,
                            advancedSettings: {
                              ...deviceData.advancedSettings,
                              logOptions: {
                                ...deviceData.advancedSettings.logOptions,
                                console: checked,
                              },
                            },
                          });
                        }}
                      />
                      <Form.Description>Output logs to server console</Form.Description>
                    </Form.Group>
                  </div>

                  <div className="mt-3">
                    <Switch
                      label="Enable File Logging"
                      checked={deviceData.advancedSettings.logOptions.file?.enabled}
                      onCheckedChange={checked => {
                        setDeviceData({
                          ...deviceData,
                          advancedSettings: {
                            ...deviceData.advancedSettings,
                            logOptions: {
                              ...deviceData.advancedSettings.logOptions,
                              file: {
                                ...deviceData.advancedSettings.logOptions.file,
                                enabled: checked,
                              },
                            },
                          },
                        });
                      }}
                    />

                    {deviceData.advancedSettings.logOptions.file?.enabled && (
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Form.Group>
                          <Form.Label htmlFor="advancedSettings.logOptions.file.path">
                            Log File Path
                          </Form.Label>
                          <Input
                            id="advancedSettings.logOptions.file.path"
                            name="advancedSettings.logOptions.file.path"
                            value={deviceData.advancedSettings.logOptions.file.path}
                            onChange={handleInputChange}
                            placeholder="logs/device-{id}.log"
                          />
                          <Form.Description>Path where log files will be stored</Form.Description>
                        </Form.Group>

                        <Form.Group>
                          <Form.Label htmlFor="advancedSettings.logOptions.file.maxSize">
                            Max File Size (MB)
                          </Form.Label>
                          <Input
                            id="advancedSettings.logOptions.file.maxSize"
                            name="advancedSettings.logOptions.file.maxSize"
                            type="number"
                            value={deviceData.advancedSettings.logOptions.file.maxSize}
                            onChange={handleInputChange}
                          />
                        </Form.Group>

                        <Form.Group>
                          <Form.Label htmlFor="advancedSettings.logOptions.file.maxFiles">
                            Max Files
                          </Form.Label>
                          <Input
                            id="advancedSettings.logOptions.file.maxFiles"
                            name="advancedSettings.logOptions.file.maxFiles"
                            type="number"
                            value={deviceData.advancedSettings.logOptions.file.maxFiles}
                            onChange={handleInputChange}
                          />
                          <Form.Description>
                            Maximum number of rotated log files to keep
                          </Form.Description>
                        </Form.Group>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <HelpCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Advanced Settings Information
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>These settings control how the system communicates with this device:</p>
                        <ul className="list-disc space-y-1 pl-5 pt-2">
                          <li>Polling Interval: Time between automatic data requests</li>
                          <li>Connection Options: Controls retry behavior and reconnection</li>
                          <li>Cache: Stores recent values to reduce communication overhead</li>
                          <li>Logging: Controls what information is recorded about this device</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </Tabs>

          {submissionError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error creating device</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{submissionError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 md:mt-6 flex justify-end gap-2 sm:space-x-2 border-t pt-3 sm:pt-4">
            <Button 
              variant="outline" 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCloseModal();
              }} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || deviceDrivers.length === 0}
              title={
                deviceDrivers.length === 0 ? 'Device drivers are required to create a device' : ''
              }
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {isEditing ? 'Update Device' : 'Create Device'}
                </>
              )}
            </Button>
          </div>
        </Form>
        </div>
      </div>
    </div>
  );
};

export default NewDeviceForm;
