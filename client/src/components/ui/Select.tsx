// client/src/components/core/Select.tsx
import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, label, error, onChange, placeholder, disabled, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div className="w-full">
        {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={cn(
              'block w-full appearance-none rounded-md border-gray-300 pr-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              error
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                : '',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <ChevronDown size={16} />
          </div>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };

export interface SelectGroupProps {
  label: string;
  children: React.ReactNode;
}

const SelectGroup: React.FC<SelectGroupProps> = ({ label, children }) => {
  return (
    <div role="group">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      {children}
    </div>
  );
};

export { SelectGroup };

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  selected?: boolean;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, selected, disabled, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
          selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {selected && <Check size={16} />}
      </div>
    );
  }
);

SelectItem.displayName = 'SelectItem';

export { SelectItem };
