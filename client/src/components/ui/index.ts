// src/components/ui/index.ts
// Export all UI components from a single file with explicit exports to avoid naming conflicts

export * from './Alert';
export * from './Avatar';
export * from './Badge';
export * from './Breadcrumb';
export * from './Button';
export * from './Card';
export * from './Checkbox';
export * from './Dialog';
export * from './Dropdown';
export * from './Empty';
export * from './Form';
export * from './Input';
export * from './Loading';
export * from './Modal';
export * from './Pagination';
export * from './ProgressBar';
export * from './Select';
export * from './Skeleton';
export * from './Stepper';
export * from './Switch';
export * from './Table';

// Handle Table and Tabs with explicit re-exports to resolve naming conflicts

export * from './Toast';
export * from './Tooltip';
// Export all UI components with explicit naming to avoid conflicts
export { Badge } from './Badge';
export { Button } from './Button';
export { Card } from './Card';
export { Checkbox } from './Checkbox';
export { Dialog } from './Dialog';
export { Dropdown } from './Dropdown';
export { Empty } from './Empty';
export { Form } from './Form';
export { Input } from './Input';
export { Popover } from './Popover';
export { Switch } from './Switch';
export { Tabs } from './Tabs';
export { Toggle } from './Toggle';
export { Tooltip, TooltipProvider } from './Tooltip';

// Add other UI components as they are created
export { default as XmlViewer } from './XmlViewer';
export { default as ConnectionErrorDisplay } from './ConnectionErrorDisplay';
export { default as DeviceValidator } from './DeviceValidator';
