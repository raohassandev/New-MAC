// client/src/components/templates/NewTemplateFormContainer.tsx
import React, { useState, useEffect } from 'react';
import { convertFormToTemplateData } from '../../utils/TypeAdapter';
import TemplateBasicInfo from './TemplateBasicInfo'; // Use template-specific TemplateBasicInfo
import RegisterConfiguration from './RegisterConfiguration'; // Use template-specific RegisterConfiguration
import DataReaderTab from './DataReaderTab'; // Use template-specific DataReaderTab
import FormTabs from './FormTabs';
import FormFooter from './FormFooter';
import { TemplateFormProvider, useTemplateForm } from './TemplateFormContext';
import { validateTemplateForm, convertValidationErrorsToState } from './validation';
import ValidationMessages from './ValidationMessages';
import FormGuide from './FormGuide';
import { FormFieldRefsProvider } from './FormFieldRefsContext';
import { useAuth } from '../../context/AuthContext';

interface NewTemplateFormContainerProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isEditing?: boolean;
}

// Inner form component that can access context
const TemplateFormContent: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
  isEditing: boolean;
}> = ({ onClose, onSubmit }) => {
  // Removed unused isEditing parameter
  const { state, actions } = useTemplateForm();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('connection');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const tabs = [
    { id: 'connection', label: 'Device Driver Information' },
    { id: 'registers', label: 'Register Configuration' },
    { id: 'parameters', label: 'Data Reader' },
  ];

  // Validate the form - but only show errors when explicitly requested
  const validateForm = (showErrors = false) => {
    // Ensure all parameters have a bufferIndex by setting defaults
    const updatedParameters = state.parameters.map(param => {
      if (param.bufferIndex === undefined || param.bufferIndex === null) {
        return {
          ...param,
          bufferIndex: param.registerIndex * 2,
        };
      }
      return param;
    });

    const stateWithBufferIndices = {
      ...state,
      parameters: updatedParameters,
    };

    const validationErrors = validateTemplateForm(stateWithBufferIndices);
    const newValidationState = convertValidationErrorsToState(validationErrors);

    // Only update UI with error state if showErrors is true
    if (showErrors) {
      if (activeTab === 'connection') {
        // Only show basic info errors when on connection tab
        const basicInfoValidation = {
          ...newValidationState,
          registers: [],
          parameters: [],
        };
        actions.setValidationState(basicInfoValidation);
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

    // Ensure all parameters have a bufferIndex
    const updatedParameters = state.parameters.map(param => {
      if (param.bufferIndex === undefined || param.bufferIndex === null) {
        // Set default bufferIndex based on registerIndex
        return {
          ...param,
          bufferIndex: param.registerIndex * 2,
        };
      }
      return param;
    });

    // Use updated parameters for validation and submission
    const stateWithBufferIndices = {
      ...state,
      parameters: updatedParameters,
    };

    const validationErrors = validateTemplateForm(stateWithBufferIndices);

    const isValid = validationErrors.isValid;
    setHasAttemptedNextStep(true);

    if (!isValid) {
      // Display error message or highlight the tab with errors
      return;
    }

    const templateData = convertFormToTemplateData(
      state.deviceBasics,
      state.registerRanges,
      updatedParameters, // Use the parameters with bufferIndex added
      user
    );

    // The template adapter already sets isTemplate=true
    // No need to set it again
    try {
      // Reset unsaved changes flag before submitting
      actions.setHasUnsavedChanges(false);
      onSubmit(templateData);
    } catch (error) {
      // Error handled in parent component
    }
  };

  return (
    <div className="w-full">
      {/* Header removed as it's now in the parent modal */}

      <FormTabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {/* Form content */}
          {activeTab === 'connection' && <TemplateBasicInfo />}
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
const NewTemplateFormContainer: React.FC<NewTemplateFormContainerProps> = ({
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
          deviceType: initialData.deviceType || '',
          make: initialData.make || '',
          model: initialData.model || '',
          description: initialData.description || '',
          enabled: initialData.enabled !== undefined ? initialData.enabled : true,
          tags: initialData.tags || [],
        },
        // Add register ranges and parameters from dataPoints
        registerRanges: initialData.dataPoints
          ? initialData.dataPoints.map((dp: any, index: number) => ({
              rangeName: dp.range.name || `Range ${index + 1}`, // Use saved name or fallback
              startRegister: dp.range.startAddress,
              length: dp.range.count,
              functionCode: dp.range.fc,
            }))
          : [],
        parameters: initialData.dataPoints
          ? initialData.dataPoints.flatMap((dp: any, rangeIndex: number) =>
              dp.parser.parameters.map((param: any) => ({
                name: param.name,
                dataType: param.dataType,
                scalingFactor: param.scalingFactor,
                decimalPoint: param.decimalPoint,
                byteOrder: param.byteOrder,
                registerRange: dp.range.name || `Range ${rangeIndex + 1}`, // Match the saved range name
                registerIndex: param.registerIndex || 0,
                bufferIndex:
                  param.bufferIndex !== undefined
                    ? param.bufferIndex
                    : (param.registerIndex || 0) * 2,
                wordCount: param.wordCount || 1,
                bitPosition: param.bitPosition, // Add bitPosition
                unit: param.unit, // Add unit
                description: param.description, // Add description
                maxValue: param.maxValue, // Add maxValue
                minValue: param.minValue, // Add minValue
                signed: param.signed, // Add signed
                bitmask: param.bitmask, // Add bitmask
                scalingEquation: param.scalingEquation, // Add scalingEquation
                formatString: param.formatString, // Add formatString
              }))
            )
          : [],
      }
    : undefined;

  return (
    <TemplateFormProvider initialData={formattedInitialData}>
      <FormFieldRefsProvider>
        <TemplateFormContent onClose={onClose} onSubmit={onSubmit} isEditing={isEditing} />
      </FormFieldRefsProvider>
    </TemplateFormProvider>
  );
};

export default NewTemplateFormContainer;
