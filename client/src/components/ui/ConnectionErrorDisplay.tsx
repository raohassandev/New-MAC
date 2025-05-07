import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, XCircle } from 'lucide-react';

interface ConnectionErrorDisplayProps {
  title?: string;
  message: string;
  error?: string;
  troubleshooting?: string;
  errorType?: string;
  deviceInfo?: {
    name?: string;
    connectionType?: string;
    address?: string;
  };
  onDismiss?: () => void;
}

const ConnectionErrorDisplay: React.FC<ConnectionErrorDisplayProps> = ({
  title = 'Connection Error',
  message,
  error,
  troubleshooting,
  errorType,
  deviceInfo,
  onDismiss,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const toggleTechnicalDetails = () => {
    setShowTechnicalDetails(!showTechnicalDetails);
  };

  const toggleTroubleshooting = () => {
    setShowTroubleshooting(!showTroubleshooting);
  };

  return (
    <div className="rounded border border-red-300 bg-red-50 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-grow">
          <div className="flex">
            <AlertCircle className="mr-3 mt-0.5 flex-shrink-0 text-red-500" />
            <div>
              <h3 className="font-medium text-red-800">{title}</h3>
              <p className="mt-1 text-sm text-red-700">{message}</p>

              {/* Device Info */}
              {deviceInfo && (
                <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-800">
                  <p>
                    <span className="font-semibold">Device:</span> {deviceInfo.name}
                  </p>
                  {deviceInfo.connectionType && (
                    <p>
                      <span className="font-semibold">Connection:</span>{' '}
                      {deviceInfo.connectionType.toUpperCase()} {deviceInfo.address}
                    </p>
                  )}
                </div>
              )}

              {/* Technical Details Collapsible Section */}
              {error && (
                <div className="mt-2">
                  <button
                    onClick={toggleTechnicalDetails}
                    className="flex w-full items-center justify-between rounded bg-red-100 p-2 text-xs font-medium text-red-800 hover:bg-red-200"
                  >
                    <span>Technical Details {errorType && `(${errorType})`}</span>
                    {showTechnicalDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showTechnicalDetails && (
                    <div className="mt-1 whitespace-pre-wrap rounded bg-red-100 p-2 text-xs text-red-800">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Troubleshooting Guide Collapsible Section */}
              {troubleshooting && (
                <div className="mt-2">
                  <button
                    onClick={toggleTroubleshooting}
                    className="flex w-full items-center justify-between rounded bg-yellow-100 p-2 text-xs font-medium text-yellow-800 hover:bg-yellow-200"
                  >
                    <span>Troubleshooting Guide</span>
                    {showTroubleshooting ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showTroubleshooting && (
                    <div className="mt-1 whitespace-pre-wrap rounded bg-yellow-100 p-2 text-xs text-yellow-800">
                      {troubleshooting}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 inline-flex flex-shrink-0 rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
            aria-label="Dismiss error"
          >
            <XCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionErrorDisplay;
