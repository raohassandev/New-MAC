//FIXME: CHANGE THE NAME OF DIRCTORY

// client/src/components/deviceDrivers/index.ts
import NewDeviceDriverFormContainer from './NewTemplateFormContainer';

// Export the main component as the default export
export default NewDeviceDriverFormContainer;

// Also export other related components that might be needed elsewhere
export { useTemplateForm as useDeviceDriverForm, useDeviceForm } from './TemplateFormContext';
export type { TemplateFormState as DeviceDriverFormState } from './TemplateFormContext';
