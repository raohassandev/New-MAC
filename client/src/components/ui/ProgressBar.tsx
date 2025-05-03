// src/components/ui/ProgressBar.tsx
import React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  min?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  showValue?: boolean;
  valueFormat?: (value: number, max: number) => string;
  animated?: boolean;
  striped?: boolean;
  label?: string;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value,
      max = 100,
      min = 0,
      size = 'md',
      variant = 'default',
      showValue = false,
      valueFormat,
      animated = false,
      striped = false,
      label,
      ...props
    },
    ref
  ) => {
    // Calculate percentage
    const normalizedValue = Math.min(Math.max(value, min), max);
    const percentage = ((normalizedValue - min) / (max - min)) * 100;

    // Default value formatter
    const defaultValueFormat = (_value: number, _max: number) => {
      return `${Math.round(percentage)}%`;
    };

    // Size classes
    const sizeClasses = {
      xs: 'h-1',
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4',
    };

    // Variant classes
    const variantClasses = {
      default: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
      info: 'bg-indigo-500',
    };

    // Background classes
    const backgroundClasses = {
      default: 'bg-blue-100',
      success: 'bg-green-100',
      warning: 'bg-yellow-100',
      error: 'bg-red-100',
      info: 'bg-indigo-100',
    };

    // Generate the formatted value
    const formattedValue = valueFormat
      ? valueFormat(normalizedValue, max)
      : defaultValueFormat(normalizedValue, max);

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Optional label and value display */}
        {(label || showValue) && (
          <div className="mb-1 flex items-center justify-between">
            {label && <div className="text-sm font-medium text-gray-700">{label}</div>}
            {showValue && <div className="text-xs font-medium text-gray-500">{formattedValue}</div>}
          </div>
        )}

        {/* Progress bar */}
        <div
          className={cn(
            'w-full overflow-hidden rounded-full',
            backgroundClasses[variant],
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-in-out',
              variantClasses[variant],
              striped && 'bg-stripes',
              animated && 'animate-progress'
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={normalizedValue}
            aria-valuemin={min}
            aria-valuemax={max}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export interface ProgressCircleProps extends Omit<ProgressBarProps, 'size'> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  thickness?: 'thin' | 'normal' | 'thick';
  showBackground?: boolean;
}

export const ProgressCircle = React.forwardRef<HTMLDivElement, ProgressCircleProps>(
  (
    {
      className,
      value,
      max = 100,
      min = 0,
      size = 'md',
      variant = 'default',
      showValue = false,
      valueFormat,
      thickness = 'normal',
      showBackground = true,
      label,
      ...props
    },
    ref
  ) => {
    // Calculate percentage
    const normalizedValue = Math.min(Math.max(value, min), max);
    const percentage = ((normalizedValue - min) / (max - min)) * 100;

    // Calculate the circumference and stroke-dasharray/offset
    const radius = 42; // Chosen to work well with viewBox="0 0 100 100"
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Size classes
    const sizeClasses = {
      sm: 'w-16 h-16',
      md: 'w-24 h-24',
      lg: 'w-32 h-32',
      xl: 'w-40 h-40',
    };

    // Thickness values
    const thicknessValues = {
      thin: 2,
      normal: 4,
      thick: 6,
    };

    // Variant classes (stroke color)
    const variantClasses = {
      default: 'stroke-blue-500',
      success: 'stroke-green-500',
      warning: 'stroke-yellow-500',
      error: 'stroke-red-500',
      info: 'stroke-indigo-500',
    };

    // Background classes
    const backgroundClasses = {
      default: 'stroke-blue-100',
      success: 'stroke-green-100',
      warning: 'stroke-yellow-100',
      error: 'stroke-red-100',
      info: 'stroke-indigo-100',
    };

    // Default value formatter
    const defaultValueFormat = (_value: number, _max: number) => {
      return `${Math.round(percentage)}%`;
    };

    // Generate the formatted value
    const formattedValue = valueFormat
      ? valueFormat(normalizedValue, max)
      : defaultValueFormat(normalizedValue, max);

    return (
      <div ref={ref} className={cn('flex flex-col items-center', className)} {...props}>
        {label && <div className="mb-2 text-sm font-medium text-gray-700">{label}</div>}

        <div className={cn('relative', sizeClasses[size])}>
          <svg className="h-full w-full" viewBox="0 0 100 100">
            {/* Background circle */}
            {showBackground && (
              <circle
                className={cn(backgroundClasses[variant])}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth={thicknessValues[thickness]}
              />
            )}

            {/* Foreground circle (progress) */}
            <circle
              className={cn(variantClasses[variant], 'transition-all duration-500 ease-in-out')}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth={thicknessValues[thickness]}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>

          {/* Value display in center */}
          {showValue && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={cn('font-semibold', {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-base': size === 'lg',
                  'text-lg': size === 'xl',
                })}
              >
                {formattedValue}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ProgressCircle.displayName = 'ProgressCircle';
