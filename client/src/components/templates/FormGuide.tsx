// client/src/components/devices/NewTemplateForm/FormGuide.tsx
import React from 'react';
import { CheckCircle, HelpCircle, AlertCircle } from 'lucide-react';
import { useTemplateForm } from './TemplateFormContext';

const TemplateFormGuide: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { state } = useTemplateForm();
  const { deviceBasics, connectionSettings, registerRanges, parameters } = state;

  // Define completion status for each step
  const connectionComplete = connectionIsComplete();
  const registersComplete = registerRanges.length > 0;
  const parametersComplete = parameters.length > 0;

  // Helper function to check if connection settings are complete
  function connectionIsComplete(): boolean {
    if (connectionSettings.type === 'tcp') {
      return Boolean(
        deviceBasics.name &&
          deviceBasics.deviceType &&
          deviceBasics.make &&
          connectionSettings.ip &&
          connectionSettings.port &&
          connectionSettings.slaveId
      );
    } else {
      return Boolean(
        deviceBasics.name &&
          deviceBasics.deviceType &&
          deviceBasics.make &&
          connectionSettings.serialPort &&
          connectionSettings.baudRate &&
          connectionSettings.slaveId
      );
    }
  }

  // Guide content for each step
  const guides = {
    connection: (
      <>
        <h4 className="mb-2 text-sm font-medium">Template Information Guide</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${deviceBasics.name ? 'text-green-500' : 'text-orange-500'}`}
            >
              {deviceBasics.name ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span>
              Provide a <strong>descriptive template name</strong> for this device type
            </span>
          </li>
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${deviceBasics.deviceType ? 'text-green-500' : 'text-orange-500'}`}
            >
              {deviceBasics.deviceType ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span>
              Select a <strong>device type</strong> or create a new one
            </span>
          </li>
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${deviceBasics.make ? 'text-green-500' : 'text-orange-500'}`}
            >
              {deviceBasics.make ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span>
              Specify the <strong>manufacturer/make</strong> of the device type
            </span>
          </li>
          {connectionSettings.type === 'tcp' ? (
            <>
              <li className="flex items-start">
                <span
                  className={`mr-2 flex-shrink-0 ${connectionSettings.ip ? 'text-green-500' : 'text-orange-500'}`}
                >
                  {connectionSettings.ip ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                </span>
                <span>
                  Enter a <strong>default IP address</strong> for this template
                </span>
              </li>
              <li className="flex items-start">
                <span
                  className={`mr-2 flex-shrink-0 ${connectionSettings.port ? 'text-green-500' : 'text-orange-500'}`}
                >
                  {connectionSettings.port ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                </span>
                <span>
                  Specify the <strong>default port number</strong> for this device type
                </span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start">
                <span
                  className={`mr-2 flex-shrink-0 ${connectionSettings.serialPort ? 'text-green-500' : 'text-orange-500'}`}
                >
                  {connectionSettings.serialPort ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                </span>
                <span>
                  Enter the <strong>default serial port</strong> for this template
                </span>
              </li>
              <li className="flex items-start">
                <span
                  className={`mr-2 flex-shrink-0 ${connectionSettings.baudRate ? 'text-green-500' : 'text-orange-500'}`}
                >
                  {connectionSettings.baudRate ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                </span>
                <span>
                  Select the <strong>default baud rate</strong> for this device type
                </span>
              </li>
            </>
          )}
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${connectionSettings.slaveId ? 'text-green-500' : 'text-orange-500'}`}
            >
              {connectionSettings.slaveId ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span>
              Set the <strong>default slave ID</strong> for this device type
            </span>
          </li>
        </ul>
      </>
    ),
    registers: (
      <>
        <h4 className="mb-2 text-sm font-medium">Register Configuration Guide</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${registerRanges.length > 0 ? 'text-green-500' : 'text-orange-500'}`}
            >
              {registerRanges.length > 0 ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span>
              Add all <strong>register ranges</strong> needed for this device type
            </span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>
              Register types: <strong>Coil</strong> (01), <strong>Discrete Input</strong> (02),{' '}
              <strong>Holding Register</strong> (03), <strong>Input Register</strong> (04)
            </span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>
              Give meaningful names to each register range in the template (e.g., "Energy Measurements")
            </span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>
              Refer to the device documentation for the correct register mappings
            </span>
          </li>
        </ul>
      </>
    ),
    parameters: (
      <>
        <h4 className="mb-2 text-sm font-medium">Template Parameters Guide</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${parameters.length > 0 ? 'text-green-500' : 'text-orange-500'}`}
            >
              {parameters.length > 0 ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span>
              Define <strong>all standard parameters</strong> for this device type
            </span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>Parameters provide the template for interpreting register data</span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>
              Include all common parameters: voltage, current, power, etc.
            </span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>
              Set appropriate scaling factors and units based on device documentation
            </span>
          </li>
        </ul>
      </>
    ),
  };

  // Progress overview
  const progressSteps = [
    { id: 'connection', label: 'Template Info', complete: connectionComplete },
    { id: 'registers', label: 'Registers', complete: registersComplete },
    { id: 'parameters', label: 'Parameters', complete: parametersComplete },
  ];

  return (
    <div className="rounded-md border bg-gray-50 p-4">
      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex w-full items-center justify-between">
          {progressSteps.map((step, index) => (
            <div key={step.id} className="relative flex flex-col items-center">
              {/* Connecting lines */}
              {index > 0 && (
                <div
                  className="absolute left-0 right-0 top-3 -z-10 h-0.5 -translate-y-1/2 border-t-2 border-gray-200"
                  style={{ width: 'calc(200% - 2rem)', right: '50%', marginLeft: '-50%' }}
                ></div>
              )}

              {/* Circle with number */}
              <div
                className={`z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  step.id === activeTab
                    ? 'bg-blue-500 text-white'
                    : step.complete
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>

              {/* Step label */}
              <span
                className={`mt-1 text-center text-xs ${step.id === activeTab ? 'font-medium text-blue-600' : 'text-gray-600'}`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current step guide */}
      <div className="border-t pt-3">{guides[activeTab as keyof typeof guides]}</div>
    </div>
  );
};

export default TemplateFormGuide;