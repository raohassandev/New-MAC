import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, clearable, onClear, rightElement, ...props }, ref) => {
    const hasValue = props.value && props.value.toString().length > 0;
    const showClearButton = clearable && hasValue;

    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400">
            {icon}
          </div>
        )}

        <input
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            icon && 'pl-10',
            (showClearButton || rightElement) && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />

        {showClearButton && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600 focus:outline-none"
            tabIndex={-1}
          >
            <X size={16} />
          </button>
        )}

        {rightElement && !showClearButton && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 transform">{rightElement}</div>
        )}

        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
