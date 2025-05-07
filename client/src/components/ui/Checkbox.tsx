import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, label, description, error, ...props }, ref) => {
    return (
      <div className="flex items-start">
        <CheckboxPrimitive.Root
          ref={ref}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          <CheckboxPrimitive.Indicator className="text-white">
            <Check className="h-3 w-3" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>

        {(label || description) && (
          <div className="ml-2">
            {label && (
              <label
                htmlFor={props.id}
                className={cn(
                  'text-sm font-medium text-gray-900',
                  props.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
