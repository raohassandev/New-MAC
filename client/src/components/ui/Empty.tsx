import React from 'react';
import { FileSearch, AlertCircle, File, Database } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface EmptyProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  image?: string;
  action?: React.ReactNode;
  type?: 'default' | 'search' | 'data' | 'file' | 'error';
  compact?: boolean;
  className?: string;
}

const Empty = ({
  title,
  description,
  icon,
  image,
  action,
  type = 'default',
  compact = false,
  className,
}: EmptyProps) => {
  const defaultIcons = {
    default: <AlertCircle size={compact ? 32 : 48} className="text-gray-400" />,
    search: <FileSearch size={compact ? 32 : 48} className="text-gray-400" />,
    data: <Database size={compact ? 32 : 48} className="text-gray-400" />,
    file: <File size={compact ? 32 : 48} className="text-gray-400" />,
    error: <AlertCircle size={compact ? 32 : 48} className="text-red-400" />,
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'p-4' : 'p-8',
        type === 'error' ? 'bg-red-50' : 'bg-gray-50',
        'rounded-lg border border-gray-200',
        className
      )}
    >
      {image ? (
        <img src={image} alt={title} className={cn('mx-auto', compact ? 'h-16' : 'h-24')} />
      ) : (
        <div className="mb-4">{icon || defaultIcons[type]}</div>
      )}

      <h3
        className={cn(
          'font-medium',
          compact ? 'text-base' : 'text-lg',
          type === 'error' ? 'text-red-800' : 'text-gray-900'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'mt-1',
            compact ? 'text-xs' : 'text-sm',
            type === 'error' ? 'text-red-600' : 'text-gray-500'
          )}
        >
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export { Empty };
