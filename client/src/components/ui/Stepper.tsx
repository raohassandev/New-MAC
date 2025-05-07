// src/components/ui/Stepper.tsx
import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface StepProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  status?: 'complete' | 'current' | 'upcoming' | 'error';
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: StepProps[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'circles' | 'numbers';
  size?: 'sm' | 'md' | 'lg';
}

export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      className,
      steps,
      activeStep,
      orientation = 'horizontal',
      variant = 'default',
      size = 'md',
      ...props
    },
    ref
  ) => {
    const isHorizontal = orientation === 'horizontal';

    const sizeClasses = {
      sm: {
        container: 'text-xs',
        icon: 'h-5 w-5',
        font: 'text-xs',
      },
      md: {
        container: 'text-sm',
        icon: 'h-7 w-7',
        font: 'text-sm',
      },
      lg: {
        container: 'text-base',
        icon: 'h-9 w-9',
        font: 'text-base',
      },
    };

    // Helper to get status based on active step index
    const getStepStatus = (index: number, status?: StepProps['status']): StepProps['status'] => {
      if (status) return status;
      if (index < activeStep) return 'complete';
      if (index === activeStep) return 'current';
      return 'upcoming';
    };

    // Helper to render a step icon
    const renderStepIcon = (step: StepProps, index: number) => {
      const status = getStepStatus(index, step.status);

      if (step.icon) {
        return step.icon;
      }

      // Fixed comparison to check for variant correctly
      if (variant === 'circles' || variant === 'default') {
        if (status === 'complete') {
          return <Check className="h-full w-full" />;
        } else if (status === 'error') {
          return <X className="h-full w-full" />;
        }
      }

      if (variant === 'numbers') {
        return <span>{index + 1}</span>;
      }

      return null;
    };

    // Generate connector style
    const getConnectorClasses = (index: number) => {
      const isLastStep = index === steps.length - 1;
      const isStepComplete = index < activeStep;
      const isStepError = steps[index].status === 'error';

      return cn(
        isHorizontal ? 'border-t-2' : 'border-l-2',
        isHorizontal ? 'w-full h-0' : 'w-0 h-full',
        !isLastStep ? 'flex-1' : 'hidden',
        isStepComplete ? 'border-blue-500' : 'border-gray-300',
        isStepError && 'border-red-500'
      );
    };

    // Generate the step icon container classes
    const getStepIconContainerClasses = (status: StepProps['status']) => {
      return cn(
        'flex items-center justify-center flex-shrink-0',
        variant !== 'default' ? 'rounded-full' : '',
        {
          'bg-blue-500 text-white': status === 'complete',
          'bg-blue-100 text-blue-600 border-2 border-blue-500': status === 'current',
          'bg-gray-100 text-gray-500 border-2 border-gray-300': status === 'upcoming',
          'bg-red-100 text-red-500 border-2 border-red-500': status === 'error',
        },
        sizeClasses[size].icon
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          isHorizontal ? 'flex-row' : 'flex-col',
          sizeClasses[size].container,
          className
        )}
        {...props}
      >
        {steps.map((step, index) => {
          const status = getStepStatus(index, step.status);
          const isLastStep = index === steps.length - 1;

          return (
            <div
              key={index}
              className={cn(
                'flex',
                isHorizontal ? 'flex-col items-center' : 'flex-row items-start',
                isHorizontal && !isLastStep ? 'flex-1' : '',
                isHorizontal && 'text-center'
              )}
            >
              <div
                className={cn(
                  'flex',
                  isHorizontal ? 'flex-col items-center' : 'flex-row items-center',
                  isHorizontal ? 'w-full' : ''
                )}
              >
                {/* Step indicator */}
                <div className={getStepIconContainerClasses(status)}>
                  {renderStepIcon(step, index)}
                </div>

                {/* Connector */}
                {!isLastStep && <div className={getConnectorClasses(index)} />}
              </div>

              {/* Step content */}
              <div className={cn(isHorizontal ? 'mt-2' : 'ml-3')}>
                <div
                  className={cn(
                    'font-medium',
                    {
                      'text-blue-600': status === 'current',
                      'text-gray-900': status === 'complete',
                      'text-gray-500': status === 'upcoming',
                      'text-red-600': status === 'error',
                    },
                    sizeClasses[size].font
                  )}
                >
                  {step.label}
                </div>

                {step.description && (
                  <div className="mt-1 text-xs text-gray-500">{step.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

Stepper.displayName = 'Stepper';
