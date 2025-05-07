import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Circle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  width?: 'auto' | 'sm' | 'md' | 'lg';
  onOpenChange?: (open: boolean) => void;
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  selected?: boolean;
  danger?: boolean;
  className?: string;
}

interface DropdownLabelProps {
  children: React.ReactNode;
  className?: string;
}

const DropdownItem = ({
  children,
  onClick,
  disabled,
  icon,
  selected,
  danger,
  className,
}: DropdownItemProps) => (
  <DropdownMenu.Item
    className={cn(
      'relative flex cursor-default select-none items-center rounded-md px-3 py-2 text-sm outline-none transition-colors',
      'focus:bg-gray-100 focus:text-gray-900',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      danger && 'text-red-600 focus:bg-red-50',
      className
    )}
    disabled={disabled}
    onClick={onClick}
  >
    {icon && <span className="mr-2">{icon}</span>}
    <span className="flex-grow">{children}</span>
    {selected && <Check size={16} className="ml-2 text-blue-500" />}
  </DropdownMenu.Item>
);

const DropdownLabel = ({ children, className }: DropdownLabelProps) => (
  <DropdownMenu.Label className={cn('px-3 py-2 text-xs font-medium text-gray-500', className)}>
    {children}
  </DropdownMenu.Label>
);

const DropdownSeparator = ({ className }: { className?: string }) => (
  <DropdownMenu.Separator className={cn('my-1 h-px bg-gray-200', className)} />
);

const Dropdown = ({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  width = 'auto',
  onOpenChange,
}: DropdownProps) => {
  const widthClass = {
    auto: 'min-w-[180px]',
    sm: 'w-[180px]',
    md: 'w-[220px]',
    lg: 'w-[280px]',
  }[width];

  return (
    <DropdownMenu.Root onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={cn(
            'z-50 rounded-md border border-gray-200 bg-white p-1 shadow-lg',
            'animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2',
            widthClass
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

// Create compound component
Dropdown.Item = DropdownItem;
Dropdown.Label = DropdownLabel;
Dropdown.Separator = DropdownSeparator;

export { Dropdown };
