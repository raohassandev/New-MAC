import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../utils/cn';

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPlacement?: 'start' | 'end';
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  (
    {
      className,
      checked,
      label,
      description,
      error,
      size = 'md',
      labelPlacement = 'end',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: {
        switch: 'h-4 w-8',
        thumb: 'h-3 w-3 data-[state=checked]:translate-x-4',
      },
      md: {
        switch: 'h-5 w-10',
        thumb: 'h-4 w-4 data-[state=checked]:translate-x-5',
      },
      lg: {
        switch: 'h-6 w-12',
        thumb: 'h-5 w-5 data-[state=checked]:translate-x-6',
      },
    };

    const switchElement = (
      <SwitchPrimitive.Root
        className={cn(
          'peer relative inline-flex shrink-0 rounded-full border-2 border-transparent',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200',
          sizeClasses[size].switch,
          className
        )}
        checked={checked}
        ref={ref}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform',
            sizeClasses[size].thumb
          )}
        />
      </SwitchPrimitive.Root>
    );

    if (!label && !description) {
      return switchElement;
    }

    return (
      <div className="flex items-start">
        {labelPlacement === 'start' && (
          <div className="mr-3 flex-grow">
            {label && (
              <label htmlFor={props.id} className="text-sm font-medium text-gray-900">
                {label}
              </label>
            )}
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        )}

        {switchElement}

        {labelPlacement === 'end' && (
          <div className="ml-3 flex-grow">
            {label && (
              <label htmlFor={props.id} className="text-sm font-medium text-gray-900">
                {label}
              </label>
            )}
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        )}

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
