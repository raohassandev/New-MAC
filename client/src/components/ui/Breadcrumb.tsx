// src/components/ui/Breadcrumb.tsx
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export interface BreadcrumbItemProps {
  href?: string;
  children: React.ReactNode;
  isActive?: boolean;
  icon?: React.ReactNode;
}

export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  href,
  children,
  isActive = false,
  icon,
}) => {
  const content = (
    <div className="flex items-center">
      {icon && <span className="mr-1.5">{icon}</span>}
      <span
        className={cn(
          'text-sm font-medium',
          isActive ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        {children}
      </span>
    </div>
  );

  if (href && !isActive) {
    return <Link to={href}>{content}</Link>;
  }

  return <div>{content}</div>;
};

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  separator?: React.ReactNode;
  className?: string;
}

export const Breadcrumb = React.forwardRef<HTMLDivElement, BreadcrumbProps>(
  (
    {
      children,
      separator = <ChevronRight size={16} className="mx-2 text-gray-400" />,
      className,
      ...props
    },
    ref
  ) => {
    const items = React.Children.toArray(children);

    return (
      <nav ref={ref} aria-label="Breadcrumb" className={cn('flex', className)} {...props}>
        <ol className="flex items-center space-x-2">
          {items.map((item, index) => {
            return (
              <li key={index} className="flex items-center">
                {index > 0 && separator}
                {item}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';

// Convenience component for home link
export const BreadcrumbHome: React.FC<Omit<BreadcrumbItemProps, 'icon'>> = props => {
  return (
    <BreadcrumbItem {...props} icon={<Home size={16} />}>
      {props.children || 'Home'}
    </BreadcrumbItem>
  );
};
