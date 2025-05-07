// src/components/ui/Skeleton.tsx
import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
  width?: number | string;
  height?: number | string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', animation = 'pulse', width, height, ...props }, ref) => {
    const variantClasses = {
      text: 'rounded-md',
      circular: 'rounded-full',
      rectangular: 'rounded-md',
    };

    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'animate-skeleton-wave',
      none: '',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-gray-200',
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        style={{
          width: width,
          height: height,
          ...(variant === 'text' && !height && { height: '1em' }),
          ...(variant === 'text' && !width && { width: '100%' }),
          ...(variant === 'circular' && !width && !height && { width: '40px', height: '40px' }),
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export interface SkeletonTextProps extends Omit<SkeletonProps, 'variant'> {
  lines?: number;
  lastLineWidth?: string | number;
  spacing?: 'tight' | 'normal' | 'loose';
}

export const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      className,
      lines = 3,
      lastLineWidth = '80%',
      height = '1em',
      animation = 'pulse',
      spacing = 'normal',
      ...props
    },
    ref
  ) => {
    const spacingClasses = {
      tight: 'space-y-1',
      normal: 'space-y-2',
      loose: 'space-y-3',
    };

    return (
      <div ref={ref} className={cn(spacingClasses[spacing], className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            animation={animation}
            height={height}
            width={index === lines - 1 && lastLineWidth !== '100%' ? lastLineWidth : '100%'}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

export interface SkeletonAvatarProps extends Omit<SkeletonProps, 'variant'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ className, size = 'md', animation = 'pulse', ...props }, ref) => {
    const sizeClasses = {
      xs: 'h-6 w-6',
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    };

    return (
      <Skeleton
        ref={ref}
        variant="circular"
        animation={animation}
        className={cn(sizeClasses[size], className)}
        {...props}
      />
    );
  }
);

SkeletonAvatar.displayName = 'SkeletonAvatar';

// Create common skeleton layouts
export const SkeletonCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        <Skeleton variant="rectangular" height={160} />
        <SkeletonText lines={2} />
        <div className="flex justify-between">
          <Skeleton width={100} height={24} />
          <Skeleton width={60} height={24} />
        </div>
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

export const SkeletonTableRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('flex items-center space-x-4', className)} {...props}>
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="60%" />
        <Skeleton height={12} width="40%" />
      </div>
      <Skeleton height={24} width={80} />
    </div>
  );
});

SkeletonTableRow.displayName = 'SkeletonTableRow';
