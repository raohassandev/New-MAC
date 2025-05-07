// client/src/components/templates/FormFooter.tsx
import React from 'react';
import { Button } from '../ui/Button';

interface FormFooterProps {
  onCancel: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSubmit: () => void;
  isLastStep: boolean;
  isFirstStep: boolean;
}

const FormFooter: React.FC<FormFooterProps> = ({
  onCancel,
  onNext,
  onPrevious,
  onSubmit,
  isLastStep,
  isFirstStep,
}) => {
  return (
    <div className="flex justify-between border-t border-gray-200 p-6">
      <div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="flex space-x-3">
        {!isFirstStep && onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            Previous
          </Button>
        )}
        {!isLastStep && onNext ? (
          <Button onClick={onNext}>Next</Button>
        ) : (
          <Button onClick={onSubmit}>{isLastStep ? 'Save Template' : 'Next'}</Button>
        )}
      </div>
    </div>
  );
};

export default FormFooter;
