// src/components/ui/Toast.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  type?: ToastType;
  title?: string;
  duration?: number;
  position?: ToastPosition;
  onClose?: () => void;
  showIcon?: boolean;
  showCloseButton?: boolean;
  icon?: React.ReactNode;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      className,
      message,
      type = 'info',
      title,
      duration = 3000,
      position = 'top-right',
      onClose,
      showIcon = true,
      showCloseButton = true,
      icon,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(true);
    const [exit, setExit] = useState(false);

    useEffect(() => {
      if (duration !== Infinity) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }, [duration]);

    const handleClose = () => {
      setExit(true);
      setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, 300); // Match the exit animation duration
    };

    const typeIcon = {
      info: <Info size={20} />,
      success: <CheckCircle size={20} />,
      warning: <AlertTriangle size={20} />,
      error: <AlertCircle size={20} />,
    };

    const typeClasses = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800',
    };

    const iconColors = {
      info: 'text-blue-500',
      success: 'text-green-500',
      warning: 'text-yellow-500',
      error: 'text-red-500',
    };

    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    if (!isVisible) return null;

    return createPortal(
      <div
        ref={ref}
        className={cn(
          'fixed z-50 min-w-[300px] max-w-md overflow-hidden rounded-md border shadow-lg transition-all duration-300',
          typeClasses[type],
          positionClasses[position],
          exit ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
          className
        )}
        role="alert"
        {...props}
      >
        <div className="flex p-4">
          {showIcon && (
            <div className={cn('mr-3 flex-shrink-0', iconColors[type])}>
              {icon || typeIcon[type]}
            </div>
          )}

          <div className="mr-2 flex-1">
            {title && <h3 className="mb-1 font-semibold">{title}</h3>}
            <div className="text-sm">{message}</div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={handleClose}
              className="ml-1 flex-shrink-0 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>,
      document.body
    );
  }
);

Toast.displayName = 'Toast';

// Toast Context to manage multiple toasts
interface ToastContextValue {
  showToast: (props: Omit<ToastProps, 'onClose'>) => string;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
}

// Define a type for the toast item in our collection
interface ToastItem extends ToastProps {
  id: string;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export interface ToastProviderProps {
  children: React.ReactNode;
  limit?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, limit = 5 }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Generate a unique ID for each toast
  const generateId = (): string => {
    return `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };

  // Show a new toast
  const showToast = (props: Omit<ToastProps, 'onClose'>): string => {
    const id = generateId();

    setToasts(prev => {
      // If we've reached the limit, remove the oldest toast
      const updatedToasts = [...prev];
      if (updatedToasts.length >= limit) {
        updatedToasts.shift();
      }

      return [...updatedToasts, { id, ...props }];
    });

    return id;
  };

  // Hide a specific toast by ID
  const hideToast = (id: string): void => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Hide all toasts
  const hideAllToasts = (): void => {
    setToasts([]);
  };

  const contextValue: ToastContextValue = {
    showToast,
    hideToast,
    hideAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Render active toasts */}
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => hideToast(toast.id)} />
      ))}
    </ToastContext.Provider>
  );
};
