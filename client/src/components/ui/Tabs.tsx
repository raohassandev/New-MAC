import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../utils/cn';

type TabItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
};

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (value: string) => void;
  variant?: 'default' | 'boxed' | 'pills';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  tabClassName?: string;
  activeTabClassName?: string;
  disabledTabClassName?: string;
  contentClassName?: string;
  orientation?: 'horizontal' | 'vertical';
  children?: React.ReactNode;
}

const Tabs = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  tabClassName,
  activeTabClassName,
  disabledTabClassName,
  contentClassName,
  orientation = 'horizontal',
  children,
}: TabsProps) => {
  // Base styles for all variants
  const baseTabStyles = 'focus:outline-none transition-all duration-200';

  // Variant-specific styles
  const variantStyles = {
    default: {
      list: 'border-b border-gray-200',
      tab: cn(
        'px-1 py-2.5 border-b-2 border-transparent',
        'hover:border-gray-300 hover:text-gray-700',
        'data-[state=active]:border-blue-500 data-[state=active]:text-blue-600'
      ),
    },
    boxed: {
      list: 'bg-white border border-gray-200 rounded-md overflow-hidden',
      tab: cn(
        'px-4 py-2.5',
        'hover:bg-gray-50',
        'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600'
      ),
    },
    pills: {
      list: 'space-x-1',
      tab: cn(
        'px-4 py-2 rounded-md',
        'hover:bg-gray-100',
        'data-[state=active]:bg-blue-500 data-[state=active]:text-white'
      ),
    },
  };

  // Size-specific styles
  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Orientation styles
  const orientationStyles = {
    horizontal: 'flex space-x-2',
    vertical: 'flex flex-col space-y-2',
  };

  return (
    <TabsPrimitive.Root value={activeTab} onValueChange={onChange}>
      <TabsPrimitive.List
        className={cn(
          orientationStyles[orientation],
          variantStyles[variant].list,
          fullWidth && 'w-full',
          'mb-4'
        )}
      >
        {tabs.map(tab => (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className={cn(
              baseTabStyles,
              variantStyles[variant].tab,
              sizeStyles[size],
              'flex items-center',
              fullWidth && 'flex-1 justify-center text-center',
              tabClassName,
              activeTab === tab.id && activeTabClassName,
              tab.disabled && cn('cursor-not-allowed opacity-50', disabledTabClassName)
            )}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {children || (
        <>
          {tabs.map(tab => (
            <TabsPrimitive.Content
              key={tab.id}
              value={tab.id}
              className={cn('focus:outline-none', contentClassName)}
            >
              {tab.content}
            </TabsPrimitive.Content>
          ))}
        </>
      )}
    </TabsPrimitive.Root>
  );
};

export { Tabs };
