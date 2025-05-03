// client/src/components/devices/NewDeviceForm/FormFieldRefsContext.tsx
import React, { createContext, useRef } from 'react';

// Define the type for our refs object
export type FormFieldRefs = {
  [fieldName: string]: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
};

// Define the type for context value
interface FormFieldRefsContextType {
  refs: FormFieldRefs;
  focusField: (fieldName: string) => void;
}

// Create the context with a default value
export const FormFieldRefsContext = createContext<FormFieldRefsContextType>({
  refs: {},
  focusField: () => {},
});

// Create a provider component
interface FormFieldRefsProviderProps {
  children: React.ReactNode;
}

export const FormFieldRefsProvider: React.FC<FormFieldRefsProviderProps> = ({ children }) => {
  // Create refs for all form fields
  const fieldRefs: FormFieldRefs = {
    // Device basic info
    name: useRef<HTMLInputElement>(null),
    deviceType: useRef<HTMLSelectElement>(null),
    make: useRef<HTMLInputElement>(null),
    model: useRef<HTMLInputElement>(null),
    description: useRef<HTMLInputElement>(null),

    // Connection settings
    connectionType: useRef<HTMLSelectElement>(null),
    ip: useRef<HTMLInputElement>(null),
    port: useRef<HTMLInputElement>(null),
    serialPort: useRef<HTMLInputElement>(null),
    baudRate: useRef<HTMLSelectElement>(null),
    dataBits: useRef<HTMLSelectElement>(null),
    stopBits: useRef<HTMLSelectElement>(null),
    parity: useRef<HTMLSelectElement>(null),
    slaveId: useRef<HTMLInputElement>(null),

    // We can add more refs as needed for register ranges and parameters
  };

  // Function to focus a field by name
  const focusField = (fieldName: string) => {
    // Get field mapping for complex field names
    const fieldMappings: Record<string, string> = {
      // Map validation error field names to actual ref names
      // For example, if a validation error has field "devicename", map it to "name"
      devicename: 'name',
      templatename: 'name',
      devicetype: 'deviceType',
      devicemake: 'make',
      devicemodel: 'model',
    };

    // Get the actual field name to focus from mappings or use the original
    const mappedFieldName = fieldMappings[fieldName.toLowerCase()] || fieldName;

    // Try to get the ref
    const ref = fieldRefs[mappedFieldName];

    if (ref && ref.current) {
      // Scroll element into view with smooth animation
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Focus the element after a small delay to allow scrolling to complete
      setTimeout(() => {
        ref.current?.focus();
      }, 300);
    }
  };

  return (
    <FormFieldRefsContext.Provider value={{ refs: fieldRefs, focusField }}>
      {children}
    </FormFieldRefsContext.Provider>
  );
};
