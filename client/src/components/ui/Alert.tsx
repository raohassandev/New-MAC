// src/components/ui/Alert.tsx
import React from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export type AlertVariant = 'default' | 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  closeLabel?: string;
  bordered?: boolean;
  actions?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'default',
      title,
      icon,
      dismissible = false,
      onDismiss,
      closeLabel = 'Dismiss',
      bordered = false,
      actions,
      children,
      ...props
    },
    ref
  ) => {
    // Default icons based on variant
    const getDefaultIcon = () => {
      switch (variant) {
        case 'info':
          return <Info className="h-5 w-5" />;
        case 'success':
          return <CheckCircle className="h-5 w-5" />;
        case 'warning':
          return <AlertTriangle className="h-5 w-5" />;
        case 'error':
          return <AlertCircle className="h-5 w-5" />;
        default:
          return <Info className="h-5 w-5" />;
      }
    };

    // Variant-based styling
    const baseClass = 'relative p-4 rounded-md';

    const variantClasses = {
      default: 'bg-white text-gray-900 border border-gray-200',
      info: 'bg-blue-50 text-blue-900 border border-blue-200',
      success: 'bg-green-50 text-green-900 border border-green-200',
      warning: 'bg-yellow-50 text-yellow-900 border border-yellow-200',
      error: 'bg-red-50 text-red-900 border border-red-200',
    };

    const iconColors = {
      default: 'text-gray-500',
      info: 'text-blue-500',
      success: 'text-green-500',
      warning: 'text-yellow-500',
      error: 'text-red-500',
    };

    // If bordered, add a left border
    const borderedClasses = bordered
      ? {
          default: 'border-l-4 border-l-gray-500',
          info: 'border-l-4 border-l-blue-500',
          success: 'border-l-4 border-l-green-500',
          warning: 'border-l-4 border-l-yellow-500',
          error: 'border-l-4 border-l-red-500',
        }
      : {};

    return (
      <div
        ref={ref}
        className={cn(
          baseClass,
          variantClasses[variant],
          bordered && borderedClasses[variant],
          className
        )}
        role="alert"
        {...props}
      >
        <div className="flex">
          {/* Icon */}
          {icon !== undefined ? (
            <div className={cn('mr-3 flex-shrink-0', iconColors[variant])}>{icon}</div>
          ) : (
            <div className={cn('mr-3 flex-shrink-0', iconColors[variant])}>{getDefaultIcon()}</div>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            {title && <h3 className="mb-1 text-sm font-medium">{title}</h3>}
            <div className="text-sm">{children}</div>

            {/* Actions */}
            {actions && <div className="mt-3">{actions}</div>}
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <button
              type="button"
              className={cn(
                '-mx-1.5 -my-1.5 ml-auto inline-flex h-8 w-8 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                `focus:ring-${variant === 'default' ? 'blue' : variant}-500`
              )}
              onClick={onDismiss}
              aria-label={closeLabel}
            >
              <span className="sr-only">{closeLabel}</span>
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';
