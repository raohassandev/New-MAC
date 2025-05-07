// src/components/ui/Pagination.tsx
import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'buttons' | 'simple';
  disabled?: boolean;
}

export const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      className,
      currentPage,
      totalPages,
      onPageChange,
      siblingCount = 1,
      showFirstLast = true,
      size = 'md',
      variant = 'buttons',
      disabled = false,
      ...props
    },
    ref
  ) => {
    // Make sure current page is valid
    const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));

    // Size classes for pagination items
    const sizeClasses = {
      sm: 'h-7 w-7 text-xs',
      md: 'h-9 w-9 text-sm',
      lg: 'h-11 w-11 text-base',
    };

    // Helper to generate page numbers array with ellipsis
    const getPageNumbers = (): (number | 'ellipsis')[] => {
      const pageNumbers: (number | 'ellipsis')[] = [];

      // Always include first page
      pageNumbers.push(1);

      let startPage = Math.max(2, validCurrentPage - siblingCount);
      let endPage = Math.min(totalPages - 1, validCurrentPage + siblingCount);

      // Add ellipsis if needed before the start page
      if (startPage > 2) {
        pageNumbers.push('ellipsis');
      }

      // Add pages in the middle
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis if needed after the end page
      if (endPage < totalPages - 1) {
        pageNumbers.push('ellipsis');
      }

      // Always include last page if there are multiple pages
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }

      return pageNumbers;
    };

    // Render simple variant (just prev/next buttons with text)
    if (variant === 'simple') {
      return (
        <div ref={ref} className={cn('flex items-center justify-between', className)} {...props}>
          <button
            onClick={() => !disabled && onPageChange(validCurrentPage - 1)}
            disabled={disabled || validCurrentPage <= 1}
            className={cn(
              'flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              disabled || validCurrentPage <= 1
                ? 'cursor-not-allowed text-gray-400 opacity-50'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <div className="text-sm text-gray-700">
            Page {validCurrentPage} of {totalPages}
          </div>

          <button
            onClick={() => !disabled && onPageChange(validCurrentPage + 1)}
            disabled={disabled || validCurrentPage >= totalPages}
            className={cn(
              'flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              disabled || validCurrentPage >= totalPages
                ? 'cursor-not-allowed text-gray-400 opacity-50'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      );
    }

    // Render buttons variant (pagination with page numbers)
    const pageNumbers = getPageNumbers();

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center space-x-1', className)}
        {...props}
      >
        {/* Previous button */}
        <button
          onClick={() => !disabled && onPageChange(validCurrentPage - 1)}
          disabled={disabled || validCurrentPage <= 1}
          className={cn(
            'flex items-center justify-center rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            disabled || validCurrentPage <= 1
              ? 'cursor-not-allowed text-gray-400 opacity-50'
              : 'text-gray-700 hover:bg-gray-100',
            sizeClasses[size]
          )}
          aria-label="Previous page"
        >
          <ChevronLeft size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        </button>

        {/* First page */}
        {showFirstLast && !pageNumbers.includes(1) && (
          <>
            <button
              onClick={() => !disabled && onPageChange(1)}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                disabled
                  ? 'cursor-not-allowed text-gray-400 opacity-50'
                  : 'text-gray-700 hover:bg-gray-100',
                sizeClasses[size]
              )}
            >
              1
            </button>
            <span className="text-gray-500">
              <MoreHorizontal size={16} />
            </span>
          </>
        )}

        {/* Page numbers */}
        {pageNumbers.map((pageNumber, index) => {
          if (pageNumber === 'ellipsis') {
            return (
              <span key={`ellipsis-${index}`} className="text-gray-500">
                <MoreHorizontal size={16} />
              </span>
            );
          }

          const isActive = pageNumber === validCurrentPage;

          return (
            <button
              key={pageNumber}
              onClick={() => !disabled && onPageChange(pageNumber)}
              disabled={disabled || isActive}
              className={cn(
                'flex items-center justify-center rounded-md font-medium',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                isActive
                  ? 'bg-blue-500 text-white'
                  : disabled
                    ? 'cursor-not-allowed text-gray-400 opacity-50'
                    : 'text-gray-700 hover:bg-gray-100',
                sizeClasses[size]
              )}
            >
              {pageNumber}
            </button>
          );
        })}

        {/* Last page */}
        {showFirstLast && !pageNumbers.includes(totalPages) && (
          <>
            <span className="text-gray-500">
              <MoreHorizontal size={16} />
            </span>
            <button
              onClick={() => !disabled && onPageChange(totalPages)}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                disabled
                  ? 'cursor-not-allowed text-gray-400 opacity-50'
                  : 'text-gray-700 hover:bg-gray-100',
                sizeClasses[size]
              )}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next button */}
        <button
          onClick={() => !disabled && onPageChange(validCurrentPage + 1)}
          disabled={disabled || validCurrentPage >= totalPages}
          className={cn(
            'flex items-center justify-center rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            disabled || validCurrentPage >= totalPages
              ? 'cursor-not-allowed text-gray-400 opacity-50'
              : 'text-gray-700 hover:bg-gray-100',
            sizeClasses[size]
          )}
          aria-label="Next page"
        >
          <ChevronRight size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        </button>
      </div>
    );
  }
);

Pagination.displayName = 'Pagination';

export interface PaginationInfoProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  showTotal?: boolean;
  itemName?: string;
}

export const PaginationInfo = React.forwardRef<HTMLDivElement, PaginationInfoProps>(
  (
    { className, currentPage, pageSize, totalItems, showTotal = true, itemName = 'item', ...props },
    ref
  ) => {
    // Calculate start and end item numbers
    const startItem = Math.min(totalItems, (currentPage - 1) * pageSize + 1);
    const endItem = Math.min(totalItems, currentPage * pageSize);

    return (
      <div ref={ref} className={cn('text-sm text-gray-700', className)} {...props}>
        <span>
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> {itemName}
          {totalItems !== 1 ? 's' : ''}
        </span>

        {showTotal && totalItems > 0 && (
          <span className="ml-2 text-xs text-gray-500">
            (Page {currentPage} of {Math.ceil(totalItems / pageSize)})
          </span>
        )}
      </div>
    );
  }
);

PaginationInfo.displayName = 'PaginationInfo';
