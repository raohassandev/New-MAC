// client/src/components/core/Loading.tsx
import React from 'react';
import { Loader } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', color = 'primary', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    const colorClasses = {
      primary: 'text-blue-600',
      secondary: 'text-gray-600',
      white: 'text-white',
    };

    return (
      <div
        ref={ref}
        className={cn('animate-spin', sizeClasses[size], colorClasses[color], className)}
        {...props}
      >
        <Loader />
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

export { Spinner };

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  spinnerClassName?: string;
  text?: string;
  textClassName?: string;
  centered?: boolean;
  fullScreen?: boolean;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  (
    {
      className,
      size = 'md',
      color = 'primary',
      spinnerClassName,
      text,
      textClassName,
      centered = false,
      fullScreen = false,
      ...props
    },
    ref
  ) => {
    const content = (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center',
          centered && 'h-full w-full',
          fullScreen && 'fixed inset-0 z-50 bg-black bg-opacity-25',
          className
        )}
        {...props}
      >
        <Spinner size={size} color={color} className={spinnerClassName} />
        {text && (
          <p
            className={cn(
              'mt-2 text-sm text-gray-500',
              color === 'white' && 'text-white',
              textClassName
            )}
          >
            {text}
          </p>
        )}
      </div>
    );

    if (fullScreen) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          {content}
        </div>
      );
    }

    return content;
  }
);

Loading.displayName = 'Loading';

export { Loading };

export interface LoadingOverlayProps extends LoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ isLoading, children, className, ...props }, ref) => {
    return (
      <div className="relative">
        {children}
        {isLoading && (
          <div
            ref={ref}
            className={cn(
              'absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75',
              className
            )}
            {...props}
          >
            <Loading
              size={props.size}
              color={props.color}
              text={props.text}
              spinnerClassName={props.spinnerClassName}
              textClassName={props.textClassName}
            />
          </div>
        )}
      </div>
    );
  }
);

LoadingOverlay.displayName = 'LoadingOverlay';

export { LoadingOverlay };
