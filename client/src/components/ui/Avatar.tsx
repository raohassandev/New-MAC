// src/components/ui/Avatar.tsx
import React from 'react';
import { User } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  shape?: 'circle' | 'square';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, initials, size = 'md', status, shape = 'circle', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    const sizeClasses = {
      xs: 'h-6 w-6 text-xs',
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-12 w-12 text-lg',
      xl: 'h-16 w-16 text-xl',
    };

    const statusClasses = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
    };

    const statusSizeClasses = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-4 w-4',
    };

    const renderContent = () => {
      if (src && !imageError) {
        return (
          <img
            src={src}
            alt={alt || 'Avatar'}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        );
      } else if (initials) {
        return (
          <span className="flex h-full w-full items-center justify-center bg-blue-100 font-medium text-blue-800">
            {initials}
          </span>
        );
      } else {
        return (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500">
            <User className="h-1/2 w-1/2" />
          </div>
        );
      }
    };

    return (
      <div ref={ref} className={cn('relative inline-block', className)} {...props}>
        <div
          className={cn(
            'overflow-hidden',
            sizeClasses[size],
            shape === 'circle' ? 'rounded-full' : 'rounded-md'
          )}
        >
          {renderContent()}
        </div>

        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
              statusClasses[status],
              statusSizeClasses[size]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  max?: number;
  spacing?: 'tight' | 'normal' | 'loose';
}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, className, max, spacing = 'normal', ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const totalAvatars = childrenArray.length;
    const displayedAvatars = max ? childrenArray.slice(0, max) : childrenArray;
    const overflowCount = max && totalAvatars > max ? totalAvatars - max : 0;

    const spacingClasses = {
      tight: '-space-x-1',
      normal: '-space-x-2',
      loose: '-space-x-1.5',
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center', spacingClasses[spacing], className)}
        {...props}
      >
        {displayedAvatars}

        {overflowCount > 0 && (
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-800 ring-2 ring-white">
            +{overflowCount}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';
