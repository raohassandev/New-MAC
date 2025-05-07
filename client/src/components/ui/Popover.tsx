import React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../utils/cn';

interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  width?: 'auto' | 'sm' | 'md' | 'lg';
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
  preventClose?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Popover = ({
  trigger,
  children,
  align = 'center',
  side = 'bottom',
  sideOffset = 4,
  width = 'auto',
  className,
  contentClassName,
  triggerClassName,
  preventClose = false,
  onOpenChange,
}: PopoverProps) => {
  const widthClass = {
    auto: 'min-w-[220px]',
    sm: 'w-[220px]',
    md: 'w-[280px]',
    lg: 'w-[380px]',
  }[width];

  return (
    <PopoverPrimitive.Root onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild className={triggerClassName}>
        {trigger}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={cn(
            'z-50 rounded-md border border-gray-200 bg-white shadow-lg',
            widthClass,
            'max-h-[var(--radix-popover-content-available-height)]',
            'animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2',
            contentClassName
          )}
          onInteractOutside={e => {
            if (preventClose) {
              e.preventDefault();
            }
          }}
        >
          <div className={cn('max-h-[300px] overflow-auto p-2', className)}>{children}</div>
          <PopoverPrimitive.Arrow className="fill-white" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};

export { Popover };
