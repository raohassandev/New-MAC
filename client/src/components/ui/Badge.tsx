import React from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      icon,
      removable,
      onRemove,
      dot,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-blue-100 text-blue-800',
      secondary: 'bg-purple-100 text-purple-800',
      success: 'bg-green-100 text-green-800',
      danger: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-sky-100 text-sky-800',
      outline: 'bg-white border border-gray-300 text-gray-700',
    };

    const sizeClasses = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-0.5',
      lg: 'text-base px-3 py-1',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', {
              'bg-gray-500': variant === 'default' || variant === 'outline',
              'bg-blue-500': variant === 'primary',
              'bg-purple-500': variant === 'secondary',
              'bg-green-500': variant === 'success',
              'bg-red-500': variant === 'danger',
              'bg-yellow-500': variant === 'warning',
              'bg-sky-500': variant === 'info',
            })}
          />
        )}

        {icon && <span className="mr-1.5">{icon}</span>}

        <span>{children}</span>

        {removable && (
          <button
            type="button"
            className={cn(
              '-mr-1 ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full',
              'hover:bg-gray-900 hover:bg-opacity-25 focus:outline-none'
            )}
            onClick={e => {
              e.stopPropagation();
              onRemove?.();
            }}
          >
            <X size={12} />
            <span className="sr-only">Remove</span>
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
