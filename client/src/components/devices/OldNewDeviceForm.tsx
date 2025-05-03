import {
  Activity,
  AlertCircle,
  FileText,
  FileCode,
  List,
  Plus,
  Save,
  Server,
  Settings,
  Trash,
  X,
  ChevronDown,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Button, Table } from '@radix-ui/themes';
import {
  validateBasicInfo,
  validateConnection,
  validateRegisterRange,
  validateParameterConfig,
  validateDeviceForm,
  DeviceFormValidation,
  getFieldError,
  hasFieldError,
  createValidationResult,
  getAllErrors,
} from '../../utils/formValidation';
import { ParameterConfig, RegisterRange } from '../../types/form.types';

interface NewDeviceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (device: any | unknown) => void; //TODO: fix the data type
}

const NewDeviceForm: React.FC<NewDeviceFormProps> = ({ isOpen, onClose, onSubmit }) => {
  // Active tab state
  const [activeTab, setActiveTab] = useState('connection');

  // Connection type state - set TCP as default
  const [connectionType, setConnectionType] = useState<'tcp' | 'rtu'>('tcp');

  // Register ranges state
  const [registerRanges, setRegisterRanges] = useState<RegisterRange[]>([]);
  const [newRegisterRange, setNewRegisterRange] = useState<RegisterRange>({
    rangeName: '',
    startRegister: 0,
    length: 1,
    functionCode: 3,
  });
  const [editingRegisterIndex, setEditingRegisterIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Parameter configuration state
  const [parameterConfigs, setParameterConfigs] = useState<ParameterConfig[]>([]);
  const [newParameterConfig, setNewParameterConfig] = useState<ParameterConfig>({
    name: '',
    dataType: 'UINT-16',
    scalingFactor: 1,
    decimalPoint: 0,
    byteOrder: 'AB',
    registerRange: '',
    registerIndex: 0,
  });

  // Calculate total number of registers from all ranges
  const totalRegistersCount = registerRanges.reduce((sum, range) => sum + range.length, 0);

  // Current register range being edited for data parser
  const [currentRangeForDataParser, setCurrentRangeForDataParser] = useState<number | null>(null);
  const [showDataParserModal, setShowDataParserModal] = useState<boolean>(false);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation states
  const [validation, setValidation] = useState<DeviceFormValidation>(createValidationResult());
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  // Device data state
  const [deviceData, setDeviceData] = useState({
    name: '',
    make: '',
    model: '',
    description: '',
    ip: '',
    port: '502',
    slaveId: '1',
    serialPort: '',
    baudRate: '9600',
    dataBits: '8',
    stopBits: '1',
    parity: 'none',
    enabled: true,
    tags: [] as string[],
  });

  // Function to check if a field has validation error
  const hasError = (field: string): boolean => {
    return hasFieldError(validation, field);
  };

  // Function to get field validation error message
  const getError = (field: string): string | undefined => {
    return getFieldError(validation, field);
  };

  // Function to validate a specific field
  const validateField = (field: string, value: any) => {
    // Create a temporary validation object
    const tempValidation = createValidationResult();

    // Validate based on field type
    switch (field) {
      case 'name':
      case 'make':
      case 'model':
      case 'description':
        validateBasicInfo({ ...deviceData, [field]: value }, tempValidation);
        break;
      case 'ip':
      case 'port':
      case 'slaveId':
      case 'serialPort':
      case 'baudRate':
      case 'dataBits':
      case 'stopBits':
      case 'parity':
        validateConnection({ ...deviceData, [field]: value }, connectionType, tempValidation);
        break;
    }

    // Update the validation state with just this field
    setValidation(prev => {
      // Remove any existing errors for this field
      const sections = ['basicInfo', 'connection', 'registers', 'parameters', 'general'] as const;
      const updated = { ...prev };

      sections.forEach(section => {
        updated[section] = updated[section].filter(error => error.field !== field);
      });

      // Add new errors if any
      sections.forEach(section => {
        const newErrors = tempValidation[section].filter(error => error.field === field);
        updated[section] = [...updated[section], ...newErrors];
      });

      // Update isValid
      updated.isValid = getAllErrors(updated).length === 0;

      return updated;
    });
  };

  // Add handler to open data parser for a specific register range
  const handleOpenDataParser = (index: number) => {
    setCurrentRangeForDataParser(index);
    setShowDataParserModal(true);
  };

  // Add handler to save parameter configs to a register range
  const handleSaveDataParserToRange = () => {
    if (currentRangeForDataParser === null) return;

    // Validate that parameters don't overlap
    const rangeParams = parameterConfigs.filter(
      config => config.registerRange === registerRanges[currentRangeForDataParser].rangeName
    );

    const tempValidation = createValidationResult();
    let isValid = true;

    rangeParams.forEach(param => {
      validateParameterConfig(
        param,
        rangeParams.filter(p => p !== param),
        registerRanges,
        tempValidation
      );
      if (getAllErrors(tempValidation).length > 0) {
        isValid = false;
      }
    });

    if (!isValid) {
      setValidation(tempValidation);
      setShowValidationSummary(true);
      return;
    }

    // Update the register range with the parameter configs
    const updatedRanges = [...registerRanges];
    // Filter parameter configs that belong to the current range
    updatedRanges[currentRangeForDataParser] = {
      ...updatedRanges[currentRangeForDataParser],
      dataParser: rangeParams,
    };

    setRegisterRanges(updatedRanges);
    setShowDataParserModal(false);
    setCurrentRangeForDataParser(null);
    toast.success('Data parser configuration saved to register range');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setDeviceData({
      ...deviceData,
      [name]: newValue,
    });

    // Validate the field as user types
    validateField(name, newValue);
    setFormTouched(true);
  };

  const handleRegisterRangeInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const newValue = name === 'rangeName' ? value : parseInt(value);

    setNewRegisterRange({
      ...newRegisterRange,
      [name]: newValue,
    });

    // Validate the register range field
    const tempValidation = createValidationResult();
    validateRegisterRange(
      { ...newRegisterRange, [name]: newValue },
      registerRanges,
      tempValidation,
      isEditMode,
      editingRegisterIndex
    );

    // Update validation with just the register range validation
    setValidation(prev => ({
      ...prev,
      registers: [
        ...prev.registers.filter(err => err.field !== name),
        ...tempValidation.registers.filter(err => err.field === name),
      ],
      isValid: prev.isValid && tempValidation.isValid,
    }));
  };

  const handleParameterConfigChange = (field: string, value: string | number) => {
    const updatedConfig = {
      ...newParameterConfig,
      [field]: value,
    };

    setNewParameterConfig(updatedConfig);

    // Validate parameter config as user changes values
    if (updatedConfig.registerRange) {
      const tempValidation = createValidationResult();
      validateParameterConfig(updatedConfig, parameterConfigs, registerRanges, tempValidation);

      // Update validation with just the parameter validation
      setValidation(prev => ({
        ...prev,
        parameters: [
          ...prev.parameters.filter(err => err.field !== field),
          ...tempValidation.parameters.filter(err => err.field === field),
        ],
        isValid: prev.isValid && tempValidation.isValid,
      }));
    }
  };

  const handleAddParameterConfig = () => {
    // Validate the parameter configuration
    const tempValidation = createValidationResult();
    validateParameterConfig(newParameterConfig, parameterConfigs, registerRanges, tempValidation);

    if (!tempValidation.isValid) {
      setValidation(prev => ({
        ...prev,
        parameters: tempValidation.parameters,
        isValid: false,
      }));
      setShowValidationSummary(true);
      return;
    }

    setParameterConfigs([...parameterConfigs, { ...newParameterConfig }]);

    // Reset name field but keep other values for faster entry of multiple parameters
    setNewParameterConfig({
      ...newParameterConfig,
      name: '',
      registerIndex: newParameterConfig.registerIndex + 1,
    });

    setError(null);
    toast.success('Parameter configuration added');
  };

  const handleDeleteParameterConfig = (index: number) => {
    setParameterConfigs(parameterConfigs.filter((_, i) => i !== index));
    toast.info('Parameter configuration removed');
  };

  const handleAddRegisterRange = () => {
    // Validate the register range
    const tempValidation = createValidationResult();
    validateRegisterRange(
      newRegisterRange,
      registerRanges,
      tempValidation,
      isEditMode,
      editingRegisterIndex
    );

    if (!tempValidation.isValid) {
      setValidation(prev => ({
        ...prev,
        registers: tempValidation.registers,
        isValid: false,
      }));
      setShowValidationSummary(true);
      return;
    }

    if (isEditMode && editingRegisterIndex !== null) {
      // Update existing register range
      const updatedRanges = [...registerRanges];
      updatedRanges[editingRegisterIndex] = { ...newRegisterRange };
      setRegisterRanges(updatedRanges);
      toast.success('Register range updated successfully');
    } else {
      // Add new register range
      setRegisterRanges([...registerRanges, { ...newRegisterRange }]);
      toast.success('Register range added successfully');
    }

    // Reset form and edit state
    setNewRegisterRange({
      rangeName: '',
      startRegister: 0,
      length: 1,
      functionCode: 3,
    });
    setIsEditMode(false);
    setEditingRegisterIndex(null);
    setError(null);
  };

  const handleDeleteRegisterRange = (index: number) => {
    // Check if any parameters are using this range
    const rangeName = registerRanges[index].rangeName;
    const hasRelatedParams = parameterConfigs.some(param => param.registerRange === rangeName);

    if (hasRelatedParams) {
      const confirmDelete = window.confirm(
        `This register range has parameter configurations associated with it. Deleting it will also remove these parameters. Continue?`
      );

      if (!confirmDelete) return;

      // Remove all parameters associated with this range
      setParameterConfigs(prev => prev.filter(param => param.registerRange !== rangeName));
    }

    setRegisterRanges(registerRanges.filter((_, i) => i !== index));
    toast.info('Register range removed');
  };

  const handleEditRegisterRange = (index: number) => {
    const rangeToEdit = registerRanges[index];
    setNewRegisterRange({ ...rangeToEdit });
    setEditingRegisterIndex(index);
    setIsEditMode(true);
    // Scroll to the form
    const formElement = document.getElementById('registerRangeForm');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setNewRegisterRange({
      rangeName: '',
      startRegister: 0,
      length: 1,
      functionCode: 3,
    });
    setIsEditMode(false);
    setEditingRegisterIndex(null);
  };

  // Validate before tab change
  const handleTabChange = (value: string) => {
    // Skip validation if moving to a previous tab
    const tabOrder = ['connection', 'registers', 'data'];
    const currentTabIndex = tabOrder.indexOf(activeTab);
    const newTabIndex = tabOrder.indexOf(value);

    if (newTabIndex <= currentTabIndex) {
      setActiveTab(value);
      return;
    }

    // Validate current tab content
    const tempValidation = createValidationResult();

    if (activeTab === 'connection') {
      // Validate basic info and connection
      validateBasicInfo(deviceData, tempValidation);
      validateConnection(deviceData, connectionType, tempValidation);

      if (!tempValidation.isValid) {
        setValidation(tempValidation);
        setShowValidationSummary(true);
        return;
      }
    } else if (activeTab === 'registers') {
      // Validate that at least one register range is defined
      if (registerRanges.length === 0) {
        setError('You must define at least one register range before proceeding');
        return;
      }
    }

    setActiveTab(value);
  };

  const validateForm = (): boolean => {
    // Perform comprehensive validation
    const formValidation = validateDeviceForm(
      deviceData,
      connectionType,
      registerRanges,
      parameterConfigs
    );

    setValidation(formValidation);

    if (!formValidation.isValid) {
      setShowValidationSummary(true);

      // Focus the tab with errors
      if (formValidation.basicInfo.length > 0 || formValidation.connection.length > 0) {
        setActiveTab('connection');
      } else if (formValidation.registers.length > 0) {
        setActiveTab('registers');
      } else if (formValidation.parameters.length > 0) {
        setActiveTab('data');
      }

      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Prepare the device data for submission
    const deviceForSubmission = {
      ...deviceData,
      port: parseInt(deviceData.port),
      slaveId: parseInt(deviceData.slaveId),
      baudRate: parseInt(deviceData.baudRate),
      dataBits: parseInt(deviceData.dataBits),
      stopBits: parseInt(deviceData.stopBits),
      connectionType,
      registerRanges,
      parameterConfigs,
    };

    onSubmit(deviceForSubmission);
    toast.success('Device added successfully');
  };

  // Early return if not open
  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={() => onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-gray-600 bg-opacity-50" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <Dialog.Title className="text-xl font-semibold">Add New Modbus Device</Dialog.Title>
              <Dialog.Close className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </Dialog.Close>
            </div>

            {error && (
              <div className="mx-4 mt-4 rounded border-l-4 border-red-500 bg-red-50 p-4">
                <div className="flex items-center">
                  <AlertCircle size={20} className="mr-2 text-red-500" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Validation summary */}
            {showValidationSummary && getAllErrors(validation).length > 0 && (
              <div className="mx-4 mt-4 rounded border-l-4 border-red-500 bg-red-50 p-4">
                <div className="flex items-start">
                  <AlertCircle size={20} className="mr-2 mt-1 text-red-500" />
                  <div>
                    <h3 className="font-medium text-red-800">Please fix the following issues:</h3>
                    <ul className="mt-2 list-inside list-disc text-red-700">
                      {getAllErrors(validation).map((error, index) => (
                        <li key={index}>{error.message}</li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setShowValidationSummary(false)}
                      className="mt-2 text-red-700 underline hover:text-red-800"
                    >
                      Hide
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4">
              <div className="mb-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Device Name *
                    </label>
                    <input
                      placeholder="Enter device name"
                      name="name"
                      value={deviceData.name}
                      onChange={handleInputChange}
                      className={`w-full rounded border p-2 ${
                        hasError('name') ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    {hasError('name') && (
                      <p className="mt-1 text-sm text-red-600">{getError('name')}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Make/Manufacturer
                    </label>
                    <input
                      placeholder="E.g., Schneider, ABB"
                      name="make"
                      value={deviceData.make}
                      onChange={handleInputChange}
                      className={`w-full rounded border p-2 ${
                        hasError('make') ? 'border-red-500' : ''
                      }`}
                    />
                    {hasError('make') && (
                      <p className="mt-1 text-sm text-red-600">{getError('make')}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
                    <input
                      placeholder="Device model"
                      name="model"
                      value={deviceData.model}
                      onChange={handleInputChange}
                      className={`w-full rounded border p-2 ${
                        hasError('model') ? 'border-red-500' : ''
                      }`}
                    />
                    {hasError('model') && (
                      <p className="mt-1 text-sm text-red-600">{getError('model')}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      placeholder="Brief description"
                      name="description"
                      value={deviceData.description}
                      onChange={handleInputChange}
                      className={`h-10 w-full resize-none rounded border p-2 ${
                        hasError('description') ? 'border-red-500' : ''
                      }`}
                      maxLength={500}
                    />
                    {hasError('description') && (
                      <p className="mt-1 text-sm text-red-600">{getError('description')}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {deviceData.description.length}/500 characters
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="enabled"
                        checked={deviceData.enabled}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Device Enabled</span>
                    </label>
                  </div>
                </div>
              </div>

              <Tabs.Root
                defaultValue="connection"
                value={activeTab}
                onValueChange={handleTabChange}
              >
                <Tabs.List className="mb-4 flex space-x-4 border-b border-gray-200">
                  <Tabs.Trigger
                    value="connection"
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                      activeTab === 'connection'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Settings size={16} />
                    Connection
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="registers"
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                      activeTab === 'registers'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <List size={16} />
                    Registers
                  </Tabs.Trigger>

                  <Tabs.Trigger
                    value="data"
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                      activeTab === 'data'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Activity size={16} />
                    Data Reader
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="connection" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Connection Type
                    </label>
                    <select
                      className="mt-1 w-full rounded border p-2"
                      value={connectionType}
                      onChange={e => setConnectionType(e.target.value as 'tcp' | 'rtu')}
                    >
                      <option value="tcp">TCP</option>
                      <option value="rtu">RTU</option>
                    </select>
                  </div>

                  {connectionType === 'tcp' ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          IP Address *
                        </label>
                        <input
                          placeholder="192.168.1.100"
                          type="text"
                          name="ip"
                          value={deviceData.ip}
                          onChange={handleInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('ip') ? 'border-red-500' : ''
                          }`}
                          required
                        />
                        {hasError('ip') && (
                          <p className="mt-1 text-sm text-red-600">{getError('ip')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Port *
                        </label>
                        <input
                          placeholder="502"
                          type="number"
                          name="port"
                          value={deviceData.port}
                          onChange={handleInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('port') ? 'border-red-500' : ''
                          }`}
                          min="1"
                          max="65535"
                          required
                        />
                        {hasError('port') && (
                          <p className="mt-1 text-sm text-red-600">{getError('port')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Slave ID * (0-247)
                        </label>
                        <input
                          placeholder="1"
                          type="number"
                          name="slaveId"
                          value={deviceData.slaveId}
                          onChange={handleInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('slaveId') ? 'border-red-500' : ''
                          }`}
                          min="0"
                          max="247"
                          required
                        />
                        {hasError('slaveId') && (
                          <p className="mt-1 text-sm text-red-600">{getError('slaveId')}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Serial Port *
                        </label>
                        <input
                          placeholder="COM1, /dev/ttyS0"
                          type="text"
                          name="serialPort"
                          value={deviceData.serialPort}
                          onChange={handleInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('serialPort') ? 'border-red-500' : ''
                          }`}
                          required
                        />
                        {hasError('serialPort') && (
                          <p className="mt-1 text-sm text-red-600">{getError('serialPort')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Baud Rate
                        </label>
                        <select
                          name="baudRate"
                          value={deviceData.baudRate}
                          onChange={handleInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('baudRate') ? 'border-red-500' : ''
                          }`}
                        >
                          <option value="1200">1200</option>
                          <option value="2400">2400</option>
                          <option value="4800">4800</option>
                          <option value="9600">9600</option>
                          <option value="19200">19200</option>
                          <option value="38400">38400</option>
                          <option value="57600">57600</option>
                          <option value="115200">115200</option>
                        </select>
                        {hasError('baudRate') && (
                          <p className="mt-1 text-sm text-red-600">{getError('baudRate')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Data Bits
                        </label>
                        <select
                          name="dataBits"
                          value={deviceData.dataBits}
                          onChange={handleInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('dataBits') ? 'border-red-500' : ''
                          }`}
                        >
                          <option value="7">7</option>
                          <option value="8">8</option>
                        </select>
                        {hasError('dataBits') && (
                          <p className="mt-1 text-sm text-red-600">{getError('dataBits')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Stop Bits
                        </label>
                        <select
                          name="stopBits"
                          value={deviceData.stopBits}
                          onChange={handleInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('stopBits') ? 'border-red-500' : ''
                          }`}
                        >
                          <option value="1">1</option>
                          <option value="1.5">1.5</option>
                          <option value="2">2</option>
                        </select>
                        {hasError('stopBits') && (
                          <p className="mt-1 text-sm text-red-600">{getError('stopBits')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Parity
                        </label>
                        <select
                          className={`w-full rounded border p-2 ${
                            hasError('parity') ? 'border-red-500' : ''
                          }`}
                          name="parity"
                          value={deviceData.parity}
                          onChange={handleInputChange}
                        >
                          <option value="none">None</option>
                          <option value="even">Even</option>
                          <option value="odd">Odd</option>
                        </select>
                        {hasError('parity') && (
                          <p className="mt-1 text-sm text-red-600">{getError('parity')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Slave ID * (0-247)
                        </label>
                        <input
                          placeholder="1"
                          type="number"
                          name="slaveId"
                          value={deviceData.slaveId}
                          onChange={handleInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('slaveId') ? 'border-red-500' : ''
                          }`}
                          min="0"
                          max="247"
                          required
                        />
                        {hasError('slaveId') && (
                          <p className="mt-1 text-sm text-red-600">{getError('slaveId')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </Tabs.Content>

                <Tabs.Content value="registers">
                  <div>
                    <h2 className="mb-4 text-lg font-semibold">Register Mapping Configuration</h2>

                    <div className="mb-4 rounded-md bg-blue-50 p-3">
                      <p className="text-sm text-blue-700">
                        Configure register ranges to read from your Modbus device. Each range
                        represents a continuous block of registers.
                      </p>
                    </div>

                    <div
                      id="registerRangeForm"
                      className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2"
                    >
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Range Name *
                        </label>
                        <input
                          placeholder="e.g., Voltage Readings"
                          type="text"
                          name="rangeName"
                          value={newRegisterRange.rangeName}
                          onChange={handleRegisterRangeInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('rangeName') ? 'border-red-500' : ''
                          }`}
                        />
                        {hasError('rangeName') && (
                          <p className="mt-1 text-sm text-red-600">{getError('rangeName')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Starting Register *
                        </label>
                        <input
                          placeholder="Start Address"
                          type="number"
                          name="startRegister"
                          value={newRegisterRange.startRegister}
                          onChange={handleRegisterRangeInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('startRegister') ? 'border-red-500' : ''
                          }`}
                          min="0"
                        />
                        {hasError('startRegister') && (
                          <p className="mt-1 text-sm text-red-600">{getError('startRegister')}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Length (Number of Registers) *
                        </label>
                        <input
                          placeholder="How many registers to read"
                          type="number"
                          name="length"
                          value={newRegisterRange.length}
                          onChange={handleRegisterRangeInputChange}
                          className={`w-full rounded border p-2 ${
                            hasError('length') ? 'border-red-500' : ''
                          }`}
                          min="1"
                          max="125"
                        />
                        {hasError('length') && (
                          <p className="mt-1 text-sm text-red-600">{getError('length')}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Maximum 125 registers per range (Modbus protocol limit)
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Function Code *
                        </label>
                        <Select.Root
                          name="functionCode"
                          value={newRegisterRange.functionCode.toString()}
                          onValueChange={value =>
                            setNewRegisterRange({
                              ...newRegisterRange,
                              functionCode: parseInt(value),
                            })
                          }
                        >
                          <Select.Trigger
                            className={`flex w-full items-center justify-between rounded border bg-white p-2 ${
                              hasError('functionCode') ? 'border-red-500' : ''
                            }`}
                          >
                            <Select.Value placeholder="Select a function code" />
                            <Select.Icon>
                              <ChevronDown size={16} />
                            </Select.Icon>
                          </Select.Trigger>

                          <Select.Portal>
                            <Select.Content className="z-[999] rounded border bg-white shadow-lg">
                              <Select.Viewport className="p-1">
                                <Select.Group>
                                  <Select.Item
                                    value="1"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>1 - Read Coils</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="2"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>2 - Read Discrete Inputs</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="3"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>3 - Read Holding Registers</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="4"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>4 - Read Input Registers</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="5"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>5 - Write Single Coil</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="6"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>6 - Write Single Register</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="15"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>15 - Write Multiple Coils</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="16"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>16 - Write Multiple Registers</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="22"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>22 - Mask Write Register</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="23"
                                    className="flex cursor-pointer items-center rounded p-2 outline-none hover:bg-blue-50"
                                  >
                                    <Select.ItemText>
                                      23 - Read/Write Multiple Registers
                                    </Select.ItemText>
                                  </Select.Item>
                                </Select.Group>
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                        {hasError('functionCode') && (
                          <p className="mt-1 text-sm text-red-600">{getError('functionCode')}</p>
                        )}
                      </div>
                    </div>

                    <div className="mb-6 flex items-center gap-2">
                      {isEditMode && (
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 rounded bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                        >
                          <X size={16} /> Cancel
                        </button>
                      )}
                      <button
                        onClick={handleAddRegisterRange}
                        className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      >
                        {isEditMode ? (
                          <>
                            <Save size={16} /> Update Register Range
                          </>
                        ) : (
                          <>
                            <Plus size={16} /> Add Register Range
                          </>
                        )}
                      </button>
                    </div>

                    {/* Register range validation warning */}
                    {validation.registers.length > 0 && (
                      <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3">
                        <h4 className="text-sm font-medium text-red-800">Register Range Issues:</h4>
                        <ul className="mt-1 list-inside list-disc text-sm text-red-700">
                          {validation.registers.map((error, index) => (
                            <li key={index}>{error.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {registerRanges.length > 0 ? (
                      <div className="overflow-x-auto">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-md font-medium text-gray-700">
                            Configured Register Ranges
                          </h3>
                          <span className="text-sm text-gray-500">
                            Total Registers:{' '}
                            <span className="font-medium">{totalRegistersCount}</span>
                            {totalRegistersCount > 100 && (
                              <span className="ml-2 text-amber-600">
                                (High register count may impact performance)
                              </span>
                            )}
                          </span>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Range Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Start Register
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Length
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Function Code
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {registerRanges.map((range, index) => (
                              <tr
                                key={index}
                                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                              >
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                  {range.rangeName}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                  {range.startRegister}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                  {range.length}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                  {range.functionCode === 1 && '1 - Read Coils'}
                                  {range.functionCode === 2 && '2 - Read Discrete Inputs'}
                                  {range.functionCode === 3 && '3 - Read Holding Registers'}
                                  {range.functionCode === 4 && '4 - Read Input Registers'}
                                  {range.functionCode === 5 && '5 - Write Single Coil'}
                                  {range.functionCode === 6 && '6 - Write Single Register'}
                                  {range.functionCode === 15 && '15 - Write Multiple Coils'}
                                  {range.functionCode === 16 && '16 - Write Multiple Registers'}
                                  {range.functionCode === 22 && '22 - Mask Write Register'}
                                  {range.functionCode === 23 &&
                                    '23 - Read/Write Multiple Registers'}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => handleOpenDataParser(index)}
                                      className="text-green-600 hover:text-green-900"
                                      aria-label="Data Parser"
                                      title="Configure Buffer Data Parser"
                                    >
                                      <FileCode size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleEditRegisterRange(index)}
                                      className="text-blue-600 hover:text-blue-900"
                                      aria-label="Edit range"
                                    >
                                      <Settings size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRegisterRange(index)}
                                      className="text-red-600 hover:text-red-900"
                                      aria-label="Delete range"
                                    >
                                      <Trash size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded bg-gray-50 p-6 text-center">
                        <Server size={24} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">
                          No register ranges added yet. Add a register range for this device above.
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          Each Modbus device has different register mappings. Check your device
                          manual for details.
                        </p>
                      </div>
                    )}
                  </div>
                </Tabs.Content>

                <Tabs.Content value="data">
                  <div>
                    {registerRanges.length === 0 ? (
                      <div className="mb-4 rounded-lg bg-yellow-50 p-4 text-yellow-800">
                        <h3 className="font-medium">Define Register Ranges First</h3>
                        <p className="mt-1 text-sm">
                          You need to define at least one register range before configuring data
                          parameters. Please go to the Registers tab and add your register ranges.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 rounded-lg bg-blue-50 p-4">
                          <h3 className="font-medium text-blue-800">
                            Data Parameter Configuration
                          </h3>
                          <p className="mt-1 text-sm text-blue-700">
                            Define how to interpret the data for each register range. Parameters
                            define how to extract values from register data.
                          </p>
                        </div>

                        {/* Parameter configuration form */}
                        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Parameter Name *
                            </label>
                            <input
                              type="text"
                              value={newParameterConfig.name}
                              onChange={e => handleParameterConfigChange('name', e.target.value)}
                              className={`w-full rounded border p-2 ${
                                hasError('name') && newParameterConfig.name ? 'border-red-500' : ''
                              }`}
                              placeholder="Parameter name"
                            />
                            {hasError('name') && newParameterConfig.name && (
                              <p className="mt-1 text-sm text-red-600">{getError('name')}</p>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Register Range *
                            </label>
                            <select
                              value={newParameterConfig.registerRange || ''}
                              onChange={e =>
                                handleParameterConfigChange('registerRange', e.target.value)
                              }
                              className={`w-full rounded border p-2 ${
                                hasError('registerRange') ? 'border-red-500' : ''
                              }`}
                            >
                              <option value="">Select a register range</option>
                              {registerRanges.map((range, index) => (
                                <option key={index} value={range.rangeName}>
                                  {range.rangeName} ({range.length} regs)
                                </option>
                              ))}
                            </select>
                            {hasError('registerRange') && (
                              <p className="mt-1 text-sm text-red-600">
                                {getError('registerRange')}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Register Index *
                            </label>
                            <input
                              type="number"
                              value={newParameterConfig.registerIndex}
                              onChange={e =>
                                handleParameterConfigChange(
                                  'registerIndex',
                                  parseInt(e.target.value)
                                )
                              }
                              className={`w-full rounded border p-2 ${
                                hasError('registerIndex') ? 'border-red-500' : ''
                              }`}
                              min="0"
                              placeholder="0"
                            />
                            {hasError('registerIndex') && (
                              <p className="mt-1 text-sm text-red-600">
                                {getError('registerIndex')}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              Index within the selected register range (starting from 0)
                            </p>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Data Type *
                            </label>
                            <select
                              value={newParameterConfig.dataType}
                              onChange={e =>
                                handleParameterConfigChange('dataType', e.target.value)
                              }
                              className={`w-full rounded border p-2 ${
                                hasError('dataType') ? 'border-red-500' : ''
                              }`}
                            >
                              <option value="INT-16">Int16 (1 register)</option>
                              <option value="UINT-16">UInt16 (1 register)</option>
                              <option value="INT-32">Int32 (2 registers)</option>
                              <option value="UINT-32">UInt32 (2 registers)</option>
                              <option value="FLOAT">Float (2 registers)</option>
                              <option value="DOUBLE">Double (4 registers)</option>
                            </select>
                            {hasError('dataType') && (
                              <p className="mt-1 text-sm text-red-600">{getError('dataType')}</p>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Byte Order
                            </label>
                            <select
                              value={newParameterConfig.byteOrder}
                              onChange={e =>
                                handleParameterConfigChange('byteOrder', e.target.value)
                              }
                              className={`w-full rounded border p-2 ${
                                hasError('byteOrder') ? 'border-red-500' : ''
                              }`}
                            >
                              {['INT-16', 'UINT-16'].includes(newParameterConfig.dataType) ? (
                                <>
                                  <option value="AB">AB (Big Endian)</option>
                                  <option value="BA">BA (Little Endian)</option>
                                </>
                              ) : (
                                <>
                                  <option value="ABCD">ABCD (Big Endian)</option>
                                  <option value="DCBA">DCBA (Little Endian)</option>
                                  <option value="BADC">BADC (Mixed Endian)</option>
                                  <option value="CDAB">CDAB (Mixed Endian)</option>
                                </>
                              )}
                            </select>
                            {hasError('byteOrder') && (
                              <p className="mt-1 text-sm text-red-600">{getError('byteOrder')}</p>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Scaling Factor
                            </label>
                            <input
                              type="number"
                              value={newParameterConfig.scalingFactor}
                              onChange={e =>
                                handleParameterConfigChange(
                                  'scalingFactor',
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              className={`w-full rounded border p-2 ${
                                hasError('scalingFactor') ? 'border-red-500' : ''
                              }`}
                              step="0.001"
                              min="0.001"
                              placeholder="1"
                            />
                            {hasError('scalingFactor') && (
                              <p className="mt-1 text-sm text-red-600">
                                {getError('scalingFactor')}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              The raw value will be multiplied by this factor
                            </p>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Decimal Points
                            </label>
                            <input
                              type="number"
                              value={newParameterConfig.decimalPoint}
                              onChange={e =>
                                handleParameterConfigChange(
                                  'decimalPoint',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className={`w-full rounded border p-2 ${
                                hasError('decimalPoint') ? 'border-red-500' : ''
                              }`}
                              min="0"
                              max="10"
                              placeholder="0"
                            />
                            {hasError('decimalPoint') && (
                              <p className="mt-1 text-sm text-red-600">
                                {getError('decimalPoint')}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 flex justify-end md:col-span-3">
                            <button
                              onClick={handleAddParameterConfig}
                              className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                            >
                              <Plus size={16} /> Add Parameter
                            </button>
                          </div>
                        </div>

                        {/* Parameter list */}
                        {parameterConfigs.length > 0 ? (
                          <div className="overflow-x-auto">
                            <h3 className="text-md mb-3 font-medium text-gray-700">
                              Configured Parameters
                            </h3>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Name
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Register Range
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Register Index
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Data Type
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Byte Order
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Scaling
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {parameterConfigs.map((param, index) => (
                                  <tr
                                    key={index}
                                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                  >
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                                      {param.name}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                                      {param.registerRange}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                                      {param.registerIndex}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                                      {param.dataType}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                                      {param.byteOrder}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                                      ×{param.scalingFactor} ({param.decimalPoint} dp)
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-right text-sm">
                                      <button
                                        onClick={() => handleDeleteParameterConfig(index)}
                                        className="text-red-600 hover:text-red-900"
                                        title="Delete parameter"
                                      >
                                        <Trash size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                            <FileText size={36} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-600">No parameters configured yet</p>
                            <p className="mt-1 text-sm text-gray-500">
                              Use the form above to add parameter configurations for your register
                              ranges
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Tabs.Content>
              </Tabs.Root>
            </div>

            <div className="flex justify-between gap-2 border-t p-4">
              <div>
                {formTouched && !validation.isValid && (
                  <button
                    onClick={() => setShowValidationSummary(!showValidationSummary)}
                    className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800 hover:bg-amber-100"
                  >
                    <AlertCircle size={16} />
                    {showValidationSummary ? 'Hide Validation Issues' : 'Show Validation Issues'}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg
                        className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Add Device
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Data Parser Modal */}
      {showDataParserModal && currentRangeForDataParser !== null && (
        <Dialog.Root open={showDataParserModal} onOpenChange={() => setShowDataParserModal(false)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-gray-600 bg-opacity-50" />
            <Dialog.Content className="fixed inset-0 z-[60] flex items-center justify-center">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-lg">
                <div className="flex items-center justify-between border-b p-4">
                  <Dialog.Title className="text-xl font-semibold">
                    Configure Buffer Data Parser
                  </Dialog.Title>
                  <Dialog.Close className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                  </Dialog.Close>
                </div>

                <div className="p-4">
                  <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-medium">
                      Configure how to parse data for{' '}
                      {registerRanges[currentRangeForDataParser]?.rangeName}
                    </p>
                    <p>
                      Define parameter names, data types, and scaling factors for each register in
                      this range.
                    </p>
                  </div>

                  {/* Parameter Configuration Form */}
                  <div className="mb-6 rounded-lg border bg-gray-50 p-4">
                    <h4 className="mb-3 font-medium text-gray-800">Add New Parameter</h4>

                    <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Parameter Name *
                        </label>
                        <input
                          type="text"
                          value={newParameterConfig.name}
                          onChange={e => handleParameterConfigChange('name', e.target.value)}
                          className={`w-full rounded border p-1.5 text-sm ${
                            hasError('name') ? 'border-red-500' : ''
                          }`}
                          placeholder="Parameter name"
                          required
                        />
                        {hasError('name') && (
                          <p className="mt-1 text-sm text-red-600">{getError('name')}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Data Type *
                        </label>
                        <select
                          value={newParameterConfig.dataType}
                          onChange={e => handleParameterConfigChange('dataType', e.target.value)}
                          className={`flex w-full items-center justify-between rounded border bg-white p-1.5 text-sm ${
                            hasError('dataType') ? 'border-red-500' : ''
                          }`}
                        >
                          <option value="INT-16">Int16 (1 register)</option>
                          <option value="UINT-16">UInt16 (1 register)</option>
                          <option value="INT-32">Int32 (2 registers)</option>
                          <option value="UINT-32">UInt32 (2 registers)</option>
                          <option value="FLOAT">Float (2 registers)</option>
                          <option value="DOUBLE">Double (4 registers)</option>
                        </select>
                        {hasError('dataType') && (
                          <p className="mt-1 text-sm text-red-600">{getError('dataType')}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Scaling Factor
                        </label>
                        <input
                          type="number"
                          value={newParameterConfig.scalingFactor}
                          onChange={e =>
                            handleParameterConfigChange(
                              'scalingFactor',
                              parseFloat(e.target.value) || 1
                            )
                          }
                          className={`w-full rounded border p-1.5 text-sm ${
                            hasError('scalingFactor') ? 'border-red-500' : ''
                          }`}
                          step="0.001"
                          min="0.001"
                        />
                        {hasError('scalingFactor') && (
                          <p className="mt-1 text-sm text-red-600">{getError('scalingFactor')}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Decimal Points
                        </label>
                        <input
                          type="number"
                          value={newParameterConfig.decimalPoint}
                          onChange={e =>
                            handleParameterConfigChange(
                              'decimalPoint',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className={`w-full rounded border p-1.5 text-sm ${
                            hasError('decimalPoint') ? 'border-red-500' : ''
                          }`}
                          min="0"
                          max="10"
                        />
                        {hasError('decimalPoint') && (
                          <p className="mt-1 text-sm text-red-600">{getError('decimalPoint')}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Byte Order
                        </label>
                        <select
                          value={newParameterConfig.byteOrder}
                          onChange={e => handleParameterConfigChange('byteOrder', e.target.value)}
                          className={`flex w-full items-center justify-between rounded border bg-white p-1.5 text-sm ${
                            hasError('byteOrder') ? 'border-red-500' : ''
                          }`}
                        >
                          {['INT-16', 'UINT-16'].includes(newParameterConfig.dataType) ? (
                            <>
                              <option value="AB">AB (Big Endian)</option>
                              <option value="BA">BA (Little Endian)</option>
                            </>
                          ) : (
                            <>
                              <option value="ABCD">ABCD (Big Endian)</option>
                              <option value="DCBA">DCBA (Little Endian)</option>
                              <option value="BADC">BADC (Mixed Endian)</option>
                              <option value="CDAB">CDAB (Mixed Endian)</option>
                            </>
                          )}
                        </select>
                        {hasError('byteOrder') && (
                          <p className="mt-1 text-sm text-red-600">{getError('byteOrder')}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Register Index
                        </label>
                        <input
                          type="number"
                          value={newParameterConfig.registerIndex}
                          onChange={e =>
                            handleParameterConfigChange(
                              'registerIndex',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className={`w-full rounded border p-1.5 text-sm ${
                            hasError('registerIndex') ? 'border-red-500' : ''
                          }`}
                          min="0"
                          max={registerRanges[currentRangeForDataParser]?.length - 1 || 0}
                        />
                        {hasError('registerIndex') && (
                          <p className="mt-1 text-sm text-red-600">{getError('registerIndex')}</p>
                        )}
                        <span className="mt-1 block text-xs text-gray-500">
                          Index within range (0-
                          {registerRanges[currentRangeForDataParser]?.length - 1 || 0})
                        </span>
                      </div>
                    </div>

                    {/* Auto-set register range to current range */}
                    <input
                      type="hidden"
                      value={registerRanges[currentRangeForDataParser]?.rangeName || ''}
                      onChange={() =>
                        handleParameterConfigChange(
                          'registerRange',
                          registerRanges[currentRangeForDataParser]?.rangeName || ''
                        )
                      }
                    />

                    <button
                      onClick={() => {
                        // Set register range to current range
                        handleParameterConfigChange(
                          'registerRange',
                          registerRanges[currentRangeForDataParser]?.rangeName || ''
                        );
                        handleAddParameterConfig();
                      }}
                      className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    >
                      <Plus size={16} /> Add Parameter
                    </button>
                  </div>

                  {/* Validation warnings */}
                  {validation.parameters.length > 0 && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
                      <h4 className="text-sm font-medium text-red-800">
                        Parameter Configuration Issues:
                      </h4>
                      <ul className="mt-1 list-inside list-disc text-sm text-red-700">
                        {validation.parameters.map((error, index) => (
                          <li key={index}>{error.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Parameter Configuration Table */}
                  {parameterConfigs.filter(
                    config =>
                      config.registerRange === registerRanges[currentRangeForDataParser]?.rangeName
                  ).length > 0 ? (
                    <div className="mt-4">
                      <Table.Root variant="surface" size="2">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell>Parameter Name</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Data Type</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Scaling Factor</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Decimal Point</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Byte Order</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Register Index</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {parameterConfigs
                            .filter(
                              config =>
                                config.registerRange ===
                                registerRanges[currentRangeForDataParser]?.rangeName
                            )
                            .map((config, index) => (
                              <Table.Row key={index}>
                                <Table.Cell>{config.name}</Table.Cell>
                                <Table.Cell>{config.dataType}</Table.Cell>
                                <Table.Cell>{config.scalingFactor}</Table.Cell>
                                <Table.Cell>{config.decimalPoint}</Table.Cell>
                                <Table.Cell>{config.byteOrder}</Table.Cell>
                                <Table.Cell>{config.registerIndex}</Table.Cell>
                                <Table.Cell>
                                  <Button
                                    color="red"
                                    variant="soft"
                                    size="1"
                                    onClick={() => {
                                      // Find index in the full parameterConfigs array
                                      const fullIndex = parameterConfigs.findIndex(
                                        p =>
                                          p.name === config.name &&
                                          p.registerRange === config.registerRange &&
                                          p.registerIndex === config.registerIndex
                                      );
                                      if (fullIndex !== -1) {
                                        handleDeleteParameterConfig(fullIndex);
                                      }
                                    }}
                                  >
                                    <Trash size={16} />
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                        </Table.Body>
                      </Table.Root>
                    </div>
                  ) : (
                    <div className="rounded bg-gray-50 p-6 text-center">
                      <FileText size={24} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">
                        No parameter configurations added for this register range yet.
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Add parameters using the form above.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDataParserModal(false)}
                      className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDataParserToRange}
                      className="flex items-center rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      <Save size={16} className="mr-2" /> Save Parser Configuration
                    </button>
                  </div>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </Dialog.Root>
  );
};

export default NewDeviceForm;
