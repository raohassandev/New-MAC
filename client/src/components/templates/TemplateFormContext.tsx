// client/src/components/templates/TemplateFormContext.tsx
import React, { createContext, useContext, useReducer, Dispatch } from 'react';
import { RegisterRange, ParameterConfig } from '../../types/form.types';

// Define the state structure
export interface TemplateFormState {
  deviceBasics: {
    name: string;
    deviceType: string; // Device type for this template
    make: string;
    model: string;
    description: string;
    enabled: boolean;
    tags: string[];
  };
  registerRanges: RegisterRange[];
  parameters: ParameterConfig[];
  uiState: {
    currentTab: string;
    isEditingRange: boolean;
    editingRangeIndex: number | null;
    isEditingParameter: boolean;
    editingParameterIndex: number | null;
    hasUnsavedChanges: boolean;
  };
  validationState: {
    isValid: boolean;
    basicInfo: Array<{ field: string; message: string }>;
    connection: Array<{ field: string; message: string }>;
    registers: Array<{ field: string; message: string }>;
    parameters: Array<{ field: string; message: string }>;
    general: Array<{ field: string; message: string }>;
  };
}

// Action types
type TemplateFormAction =
  | { type: 'SET_DEVICE_BASICS'; payload: Partial<TemplateFormState['deviceBasics']> }
  | { type: 'ADD_REGISTER_RANGE'; payload: RegisterRange }
  | { type: 'UPDATE_REGISTER_RANGE'; payload: { index: number; range: RegisterRange } }
  | { type: 'DELETE_REGISTER_RANGE'; payload: number }
  | { type: 'ADD_PARAMETER'; payload: ParameterConfig }
  | { type: 'UPDATE_PARAMETER'; payload: { index: number; parameter: ParameterConfig } }
  | { type: 'DELETE_PARAMETER'; payload: number }
  | { type: 'SET_UI_STATE'; payload: Partial<TemplateFormState['uiState']> }
  | { type: 'SET_HAS_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'SET_VALIDATION_STATE'; payload: Partial<TemplateFormState['validationState']> }
  | { type: 'RESET_FORM' }
  | { type: 'LOAD_FORM_DATA'; payload: Partial<TemplateFormState> };

// Initial state
const initialTemplateFormState: TemplateFormState = {
  deviceBasics: {
    name: '',
    deviceType: '',
    make: '',
    model: '',
    description: '',
    enabled: true,
    tags: [],
  },
  registerRanges: [],
  parameters: [],
  uiState: {
    currentTab: 'connection',
    isEditingRange: false,
    editingRangeIndex: null,
    isEditingParameter: false,
    editingParameterIndex: null,
    hasUnsavedChanges: false,
  },
  validationState: {
    isValid: true,
    basicInfo: [],
    connection: [],
    registers: [],
    parameters: [],
    general: [],
  },
};

// Reducer function
const templateFormReducer = (
  state: TemplateFormState,
  action: TemplateFormAction
): TemplateFormState => {
  switch (action.type) {
    case 'SET_DEVICE_BASICS':
      return {
        ...state,
        deviceBasics: {
          ...state.deviceBasics,
          ...action.payload,
        },
        uiState: {
          ...state.uiState,
          hasUnsavedChanges: true,
        },
      };
    case 'ADD_REGISTER_RANGE':
      return {
        ...state,
        registerRanges: [...state.registerRanges, action.payload],
        uiState: {
          ...state.uiState,
          hasUnsavedChanges: true,
        },
      };
    case 'UPDATE_REGISTER_RANGE':
      return {
        ...state,
        registerRanges: state.registerRanges.map((range, index) =>
          index === action.payload.index ? action.payload.range : range
        ),
      };
    case 'DELETE_REGISTER_RANGE':
      return {
        ...state,
        registerRanges: state.registerRanges.filter((_, index) => index !== action.payload),
      };
    case 'ADD_PARAMETER':
      return {
        ...state,
        parameters: [...state.parameters, action.payload],
        uiState: {
          ...state.uiState,
          hasUnsavedChanges: true,
        },
      };
    case 'UPDATE_PARAMETER':
      return {
        ...state,
        parameters: state.parameters.map((param, index) =>
          index === action.payload.index ? action.payload.parameter : param
        ),
      };
    case 'DELETE_PARAMETER':
      return {
        ...state,
        parameters: state.parameters.filter((_, index) => index !== action.payload),
      };
    case 'SET_UI_STATE':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          ...action.payload,
        },
      };
    case 'SET_VALIDATION_STATE':
      return {
        ...state,
        validationState: {
          ...state.validationState,
          ...action.payload,
        },
      };
    case 'RESET_FORM':
      return initialTemplateFormState;
    case 'LOAD_FORM_DATA':
      return {
        ...state,
        ...action.payload,
      };
    case 'SET_HAS_UNSAVED_CHANGES':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          hasUnsavedChanges: action.payload,
        },
      };
    default:
      return state;
  }
};

// Create the context
interface TemplateFormContextType {
  state: TemplateFormState;
  dispatch: Dispatch<TemplateFormAction>;
  actions: {
    setDeviceBasics: (basics: Partial<TemplateFormState['deviceBasics']>) => void;
    addRegisterRange: (range: RegisterRange) => void;
    updateRegisterRange: (index: number, range: RegisterRange) => void;
    deleteRegisterRange: (index: number) => void;
    addParameter: (parameter: ParameterConfig) => void;
    updateParameter: (index: number, parameter: ParameterConfig) => void;
    deleteParameter: (index: number) => void;
    setUIState: (uiState: Partial<TemplateFormState['uiState']>) => void;
    setValidationState: (validationState: Partial<TemplateFormState['validationState']>) => void;
    resetForm: () => void;
    loadFormData: (data: Partial<TemplateFormState>) => void;
    setHasUnsavedChanges: (hasChanges: boolean) => void;
  };
}

const TemplateFormContext = createContext<TemplateFormContextType | undefined>(undefined);

interface TemplateFormProviderProps {
  children: React.ReactNode;
  initialData?: Partial<TemplateFormState>;
}

// Provider component
export const TemplateFormProvider: React.FC<TemplateFormProviderProps> = ({
  children,
  initialData,
}) => {
  const [state, dispatch] = useReducer(
    templateFormReducer,
    initialData
      ? {
          ...initialTemplateFormState,
          ...initialData,
        }
      : initialTemplateFormState
  );

  // Create actions object for easier access
  const actions = {
    setDeviceBasics: (basics: Partial<TemplateFormState['deviceBasics']>) =>
      dispatch({ type: 'SET_DEVICE_BASICS', payload: basics }),
    addRegisterRange: (range: RegisterRange) =>
      dispatch({ type: 'ADD_REGISTER_RANGE', payload: range }),
    updateRegisterRange: (index: number, range: RegisterRange) =>
      dispatch({ type: 'UPDATE_REGISTER_RANGE', payload: { index, range } }),
    deleteRegisterRange: (index: number) =>
      dispatch({ type: 'DELETE_REGISTER_RANGE', payload: index }),
    addParameter: (parameter: ParameterConfig) =>
      dispatch({ type: 'ADD_PARAMETER', payload: parameter }),
    updateParameter: (index: number, parameter: ParameterConfig) =>
      dispatch({ type: 'UPDATE_PARAMETER', payload: { index, parameter } }),
    deleteParameter: (index: number) => dispatch({ type: 'DELETE_PARAMETER', payload: index }),
    setUIState: (uiState: Partial<TemplateFormState['uiState']>) =>
      dispatch({ type: 'SET_UI_STATE', payload: uiState }),
    setValidationState: (validationState: Partial<TemplateFormState['validationState']>) =>
      dispatch({ type: 'SET_VALIDATION_STATE', payload: validationState }),
    resetForm: () => dispatch({ type: 'RESET_FORM' }),
    loadFormData: (data: Partial<TemplateFormState>) =>
      dispatch({ type: 'LOAD_FORM_DATA', payload: data }),
    setHasUnsavedChanges: (hasChanges: boolean) =>
      dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: hasChanges }),
  };

  return (
    <TemplateFormContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </TemplateFormContext.Provider>
  );
};

// Hook for accessing the context
export const useTemplateForm = (): TemplateFormContextType => {
  const context = useContext(TemplateFormContext);
  if (!context) {
    throw new Error('useTemplateForm must be used within a TemplateFormProvider');
  }
  return context;
};

// For backward compatibility, keep useDeviceForm as an alias to useTemplateForm
export const useDeviceForm = useTemplateForm;
