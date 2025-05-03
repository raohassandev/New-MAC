// client/src/components/devices/NewDeviceForm/DataReaderTab.tsx
import React, { useState } from 'react';
import {
  Plus,
  Trash,
  Edit,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Info,
  HelpCircle,
  AlertTriangle,
  Zap,
  Copy,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Tooltip } from '../../ui/Tooltip';
import { useDeviceForm } from './DeviceFormContext';
import ParameterEditor from './ParameterEditor';
import { ParameterConfig } from '../../../types/form.types';

// Helper component to display the info panel
const InfoPanel: React.FC = () => {
  return (
    <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start">
        <Info className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
        <div>
          <h4 className="text-sm font-medium text-blue-800">About Data Parameters</h4>
          <p className="mt-1 text-sm text-blue-700">
            Data parameters define how to read and interpret values from your device's Modbus
            registers. Each parameter represents a specific value (like temperature, pressure, etc.)
            and needs a data type, register range, and index.
          </p>
          <div className="mt-3 text-sm text-blue-700">
            <p className="font-medium">Key concepts:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                <span className="font-semibold">Register Range:</span> A block of registers defined
                in the previous tab
              </li>
              <li>
                <span className="font-semibold">Register Index:</span> The position within the range
                (0-based)
              </li>
              <li>
                <span className="font-semibold">Data Type:</span> How to interpret the binary data
                (INT16, FLOAT32, etc.)
              </li>
              <li>
                <span className="font-semibold">Byte Order:</span> The order of bytes in multi-byte
                values (endianness)
              </li>
            </ul>
          </div>

          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2">
            <h5 className="font-medium text-amber-800">Important Rules:</h5>
            <ul className="mt-1 list-inside list-disc space-y-1 text-amber-700">
              <li>
                <span className="font-semibold">Unique Names:</span> Each parameter must have a
                unique name
              </li>
              <li>
                <span className="font-semibold">Register Usage:</span> Parameters (except bit types)
                cannot share the same register index
              </li>
              <li>
                <span className="font-semibold">No Overlaps:</span> Multi-register parameters
                (FLOAT32, INT32, etc.) cannot overlap register ranges
              </li>
              <li>
                <span className="font-semibold">Bit Parameters:</span> Bit/Boolean types can share
                registers but must use different bit positions
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to get a visual indicator for data type
const getDataTypeVisual = (dataType: string) => {
  if (dataType.includes('FLOAT') || dataType.includes('DOUBLE')) {
    return <Thermometer className="h-4 w-4 text-blue-500" title="Floating point value" />;
  } else if (dataType.includes('INT') || dataType.includes('UINT')) {
    return <Zap className="h-4 w-4 text-amber-500" title="Integer value" />;
  } else if (dataType === 'BOOLEAN' || dataType === 'BIT') {
    return <AlertTriangle className="h-4 w-4 text-purple-500" title="Boolean/bit value" />;
  } else if (dataType === 'STRING' || dataType === 'ASCII') {
    return <Copy className="h-4 w-4 text-green-500" title="String value" />;
  }
  return null;
};

// Helper to get word count from data type
const getWordCount = (param: ParameterConfig) => {
  if (param.wordCount) {
    return param.wordCount;
  }

  if (['INT32', 'UINT32', 'FLOAT32', 'FLOAT'].includes(param.dataType)) {
    return 2;
  } else if (['INT64', 'UINT64', 'DOUBLE', 'FLOAT64'].includes(param.dataType)) {
    return 4;
  }

  return 1;
};

const DataReaderTab: React.FC = () => {
  const { state, actions } = useDeviceForm();
  const [expandedParamIndex, setExpandedParamIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const handleAddParameter = () => {
    setIsAddingNew(true);
  };

  const handleEditParameter = (index: number) => {
    setExpandedParamIndex(index);
  };

  const handleDeleteParameter = (index: number) => {
    if (
      window.confirm(
        `Are you sure you want to delete the parameter "${state.parameters[index].name}"?`
      )
    ) {
      actions.deleteParameter(index);
    }
  };

  // Check if a parameter would conflict with existing parameters
  const validateParameter = (parameter: ParameterConfig, excludeIndex?: number): string | null => {
    // Get existing parameters, excluding the one being edited if applicable
    const existingParams = state.parameters.filter(
      (_, index) => excludeIndex === undefined || index !== excludeIndex
    );

    // Check for duplicate name
    const duplicateName = existingParams.find(
      p => p.name.trim().toLowerCase() === parameter.name.trim().toLowerCase()
    );
    if (duplicateName) {
      return `Parameter name "${parameter.name}" is already in use`;
    }

    // Check for register conflicts
    const wordCount = parameter.wordCount || getWordCount(parameter);
    const paramStart = parameter.registerIndex;
    const paramEnd = paramStart + wordCount - 1;

    // For bit-level parameters, check bit position conflicts
    if (['BOOLEAN', 'BIT'].includes(parameter.dataType)) {
      const conflictingBitParam = existingParams.find(
        p =>
          ['BOOLEAN', 'BIT'].includes(p.dataType) &&
          p.registerRange === parameter.registerRange &&
          p.registerIndex === parameter.registerIndex &&
          p.bitPosition === parameter.bitPosition
      );

      if (conflictingBitParam) {
        return `Bit position ${parameter.bitPosition} at register index ${parameter.registerIndex} is already used by parameter "${conflictingBitParam.name}"`;
      }

      // Bit parameters can share registers with other types, so no further checks needed
      return null;
    }

    // For non-bit parameters, check register overlaps
    for (const existing of existingParams) {
      // Skip bit-level parameters as they can share registers
      if (['BOOLEAN', 'BIT'].includes(existing.dataType)) {
        continue;
      }

      // Only check conflicts within the same register range
      if (existing.registerRange !== parameter.registerRange) {
        continue;
      }

      const existingWordCount = existing.wordCount || getWordCount(existing);
      const existingStart = existing.registerIndex;
      const existingEnd = existingStart + existingWordCount - 1;

      // Check for register overlap
      if (
        (paramStart <= existingEnd && paramEnd >= existingStart) ||
        (existingStart <= paramEnd && existingEnd >= paramStart)
      ) {
        return `Register conflict: Parameter "${parameter.name}" (registers ${paramStart}-${paramEnd}) overlaps with existing parameter "${existing.name}" (registers ${existingStart}-${existingEnd})`;
      }
    }

    return null;
  };

  // State for validation error message
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSaveParameter = (parameter: ParameterConfig) => {
    // Clear any previous validation error
    setValidationError(null);

    // Validate parameter
    const error = validateParameter(
      parameter,
      expandedParamIndex !== null ? expandedParamIndex : undefined
    );

    if (error) {
      // Show error message to user
      setValidationError(error);
      return;
    }

    // Proceed with save if no validation errors
    if (expandedParamIndex !== null) {
      actions.updateParameter(expandedParamIndex, parameter);
      setExpandedParamIndex(null);
    } else {
      actions.addParameter(parameter);
      setIsAddingNew(false);
    }
  };

  const handleCancelEdit = () => {
    setExpandedParamIndex(null);
    setIsAddingNew(false);
  };

  // Check if any register ranges are configured
  const hasRegisterRanges = state.registerRanges.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-900">Data Parameters</h3>
          <Tooltip content="Define how to read and interpret values from Modbus registers">
            <HelpCircle className="ml-2 h-5 w-5 text-gray-400" />
          </Tooltip>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            size="sm"
            variant="outline"
            icon={<Info size={16} />}
          >
            {showInfoPanel ? 'Hide Info' : 'Show Info'}
          </Button>
          <Button
            onClick={handleAddParameter}
            size="sm"
            icon={<Plus size={16} />}
            disabled={isAddingNew || !hasRegisterRanges}
          >
            Add Parameter
          </Button>
        </div>
      </div>

      {/* Information Panel */}
      {showInfoPanel && <InfoPanel />}

      {/* Warning for no register ranges */}
      {!hasRegisterRanges && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex">
            <AlertTriangle className="mr-3 h-5 w-5 text-amber-500" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Register ranges required</h4>
              <p className="mt-1 text-sm text-amber-700">
                You need to define at least one register range in the "Register Configuration" tab
                before adding data parameters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 bg-white"
                onClick={() => actions.setUIState({ currentTab: 'registers' })}
              >
                Go to Register Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Parameter Section - Expandable */}
      {isAddingNew && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-md mb-3 font-medium">Add New Parameter</h4>

          {/* Display validation error if present */}
          {validationError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex items-start">
                <AlertTriangle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <div>
                  <h5 className="text-sm font-medium text-red-700">Parameter Validation Error</h5>
                  <p className="mt-1 text-sm text-red-600">{validationError}</p>
                </div>
              </div>
            </div>
          )}

          <ParameterEditor
            onSave={handleSaveParameter}
            onCancel={handleCancelEdit}
            availableRanges={state.registerRanges}
          />
        </div>
      )}

      {/* Existing Parameters List */}
      <div className="space-y-3">
        {state.parameters.length === 0 && !isAddingNew ? (
          <div className="rounded-md bg-gray-50 py-8 text-center">
            <p className="text-gray-500">No parameters defined yet.</p>
            {hasRegisterRanges && (
              <Button variant="outline" className="mt-2" size="sm" onClick={handleAddParameter}>
                Add your first parameter
              </Button>
            )}
          </div>
        ) : (
          state.parameters.map((param, index) => {
            // Find the register range object for this parameter
            const registerRange = state.registerRanges.find(
              range => range.rangeName === param.registerRange
            );

            // Calculate absolute register address
            const absoluteAddress = registerRange
              ? registerRange.startRegister + param.registerIndex
              : null;

            // Word count (number of registers used)
            const wordCount = getWordCount(param);

            // Visual indicator based on data type
            const dataTypeIcon = getDataTypeVisual(param.dataType);

            return (
              <div key={index} className="overflow-hidden rounded-md border border-gray-200">
                <div
                  className="flex cursor-pointer items-center justify-between bg-white p-4 hover:bg-gray-50"
                  onClick={() =>
                    expandedParamIndex === index
                      ? setExpandedParamIndex(null)
                      : setExpandedParamIndex(index)
                  }
                >
                  <div>
                    <div className="flex items-center">
                      {dataTypeIcon && <span className="mr-2">{dataTypeIcon}</span>}
                      <h4 className="font-medium text-gray-900">{param.name}</h4>
                      {param.unit && (
                        <span className="ml-2 text-xs text-gray-500">[{param.unit}]</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="default" size="sm">
                        {param.dataType}
                      </Badge>
                      <Badge variant="secondary" size="sm">
                        {param.registerRange}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        Index: {param.registerIndex}
                        {absoluteAddress !== null && ` (Addr: ${absoluteAddress})`}
                      </Badge>
                      {wordCount > 1 && (
                        <Badge variant="info" size="sm">
                          {wordCount} registers
                        </Badge>
                      )}
                    </div>
                    {param.description && (
                      <p className="mt-1 text-xs text-gray-500">{param.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit size={16} />}
                      onClick={e => {
                        e.stopPropagation();
                        handleEditParameter(index);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash size={16} />}
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteParameter(index);
                      }}
                    >
                      Delete
                    </Button>
                    {expandedParamIndex === index ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </div>

                {/* Expanded Edit Section */}
                {expandedParamIndex === index && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    {/* Display validation error if present */}
                    {validationError && (
                      <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
                        <div className="flex items-start">
                          <AlertTriangle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                          <div>
                            <h5 className="text-sm font-medium text-red-700">
                              Parameter Validation Error
                            </h5>
                            <p className="mt-1 text-sm text-red-600">{validationError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <ParameterEditor
                      initialData={param}
                      onSave={handleSaveParameter}
                      onCancel={handleCancelEdit}
                      availableRanges={state.registerRanges}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DataReaderTab;
