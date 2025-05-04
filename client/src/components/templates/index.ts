// client/src/components/devices/NewTemplateForm/index.ts
import NewTemplateFormContainer from './NewTemplateFormContainer';

// Export the main component as the default export
export default NewTemplateFormContainer;

// Also export other related components that might be needed elsewhere
export { useTemplateForm, useDeviceForm } from './TemplateFormContext';
export type { TemplateFormState } from './TemplateFormContext';
