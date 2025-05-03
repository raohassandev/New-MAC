// client/src/components/devices/NewDeviceForm/NewDeviceFormContainer.tsx
import React, { useState, useEffect } from 'react';
import { convertFormToDeviceData } from '../../../utils/TypeAdapter';
import ConnectionSettings from './ConnectionSettings';
import RegisterConfiguration from './RegisterConfiguration';
import DataReaderTab from './DataReaderTab';
import FormTabs from './FormTabs';
import FormFooter from './FormFooter';
import { DeviceFormProvider, useDeviceForm } from './DeviceFormContext';
import { validateDeviceForm, convertValidationErrorsToState } from './validation';
import ValidationMessages from './ValidationMessages';
import FormGuide from './FormGuide';
import { FormFieldRefsProvider } from './FormFieldRefsContext';
import { useAuth } from '../../../context/AuthContext';

interface NewDeviceFormContainerProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isEditing?: boolean;
}

// Inner form component that can access context
const DeviceFormContent: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
  isEditing: boolean;
}> = ({ onClose, onSubmit, isEditing }) => {
  const { state, actions } = useDeviceForm();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('connection');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const tabs = [
    { id: 'connection', label: 'Connection Settings' },
    { id: 'registers', label: 'Register Configuration' },
    { id: 'parameters', label: 'Data Reader' },
  ];

  // Validate the form - but only show errors when explicitly requested
  const validateForm = (showErrors = false) => {
    const validationErrors = validateDeviceForm(state);
    const newValidationState = convertValidationErrorsToState(validationErrors);

    // Only update UI with error state if showErrors is true
    if (showErrors) {
      if (activeTab === 'connection') {
        // Only show connection errors when on connection tab
        const connectionValidation = {
          ...newValidationState,
          basicInfo: [],
          registers: [],
          parameters: [],
        };
        actions.setValidationState(connectionValidation);
      } else if (activeTab === 'registers') {
        // Only show register errors when on registers tab
        const registersValidation = {
          ...newValidationState,
          basicInfo: [],
          connection: [],
          parameters: [],
        };
        actions.setValidationState(registersValidation);
      } else if (activeTab === 'parameters') {
        // Show all errors when on parameters tab (last tab)
        actions.setValidationState(newValidationState);
      }
    }

    return validationErrors.isValid;
  };

  // Initialize validation state but don't show errors on first render
  useEffect(() => {
    // Don't show validation errors on initial load or tab change
    validateForm(false);
  }, [activeTab]);

  // Track if user has attempted to proceed, to show validation errors
  const [hasAttemptedNextStep, setHasAttemptedNextStep] = useState(false);

  const handleSubmitForm = () => {
    // Run full validation before submitting and show errors
    const isValid = validateForm(true);
    setHasAttemptedNextStep(true);

    if (!isValid) {
      // Display error message or highlight the tab with errors
      console.error('Please fix validation errors before submitting');
      return;
    }

    const deviceData = convertFormToDeviceData(
      state.deviceBasics,
      state.connectionSettings,
      state.registerRanges,
      state.parameters,
      user
    );

    onSubmit(deviceData);
  };

  return (
    <div className="w-full">
      {/* Header removed as it's now in the parent modal */}

      <FormTabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {/* Form content */}
          {activeTab === 'connection' && <ConnectionSettings />}
          {activeTab === 'registers' && <RegisterConfiguration />}
          {activeTab === 'parameters' && <DataReaderTab />}

          {/* Show validation messages only after user has attempted to proceed */}
          {hasAttemptedNextStep && (
            <div className="mt-6">
              <ValidationMessages />
            </div>
          )}
        </div>

        {/* Right sidebar with guide */}
        <div className="md:col-span-1">
          <FormGuide activeTab={activeTab} />
        </div>
      </div>

      <FormFooter
        onCancel={onClose}
        onNext={() => {
          // Validate current tab when trying to proceed and show errors
          setHasAttemptedNextStep(true);
          const isValid = validateForm(true);

          // Only proceed to next tab if validation passed
          if (isValid) {
            const nextTabIndex = tabs.findIndex(tab => tab.id === activeTab) + 1;
            if (nextTabIndex < tabs.length) {
              setActiveTab(tabs[nextTabIndex].id);
              // Reset the validation flag when successfully moving to next tab
              setHasAttemptedNextStep(false);
            }
          }
        }}
        onPrevious={() => {
          const prevTabIndex = tabs.findIndex(tab => tab.id === activeTab) - 1;
          if (prevTabIndex >= 0) {
            setActiveTab(tabs[prevTabIndex].id);
            // Hide validation errors when going back
            validateForm(false);
            setHasAttemptedNextStep(false);
          }
        }}
        onSubmit={handleSubmitForm}
        isLastStep={activeTab === 'parameters'}
        isFirstStep={activeTab === 'connection'}
      />
    </div>
  );
};

// Main container component that provides context
const NewDeviceFormContainer: React.FC<NewDeviceFormContainerProps> = ({
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}) => {
  // Parse initialData into form state format if provided
  const formattedInitialData = initialData
    ? {
        deviceBasics: {
          name: initialData.name || '',
          make: initialData.make || '',
          model: initialData.model || '',
          description: initialData.description || '',
          enabled: initialData.enabled !== undefined ? initialData.enabled : true,
          tags: initialData.tags || [],
        },
        connectionSettings: {
          type: initialData.connectionType || 'tcp',
          ip: initialData.ip || '',
          port: initialData.port?.toString() || '502',
          slaveId: initialData.slaveId?.toString() || '1',
          serialPort: initialData.serialPort || '',
          baudRate: initialData.baudRate?.toString() || '9600',
          dataBits: initialData.dataBits?.toString() || '8',
          stopBits: initialData.stopBits?.toString() || '1',
          parity: initialData.parity || 'none',
        },
        // registerRanges: initialData.registerRanges || [],
        // parameters: initialData.parameterConfigs || [],
      }
    : undefined;

  return (
    <DeviceFormProvider initialData={formattedInitialData}>
      <FormFieldRefsProvider>
        <DeviceFormContent onClose={onClose} onSubmit={onSubmit} isEditing={isEditing} />
      </FormFieldRefsProvider>
    </DeviceFormProvider>
  );
};

export default NewDeviceFormContainer;
