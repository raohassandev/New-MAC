// client/src/components/devices/NewDeviceForm/FormGuide.tsx
import React from 'react';
import { CheckCircle, HelpCircle, AlertCircle } from 'lucide-react';
import { useDeviceForm } from './DeviceFormContext';

const FormGuide: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { state } = useDeviceForm();
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
          deviceBasics.make &&
          connectionSettings.ip &&
          connectionSettings.port &&
          connectionSettings.slaveId
      );
    } else {
      return Boolean(
        deviceBasics.name &&
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
        <h4 className="mb-2 text-sm font-medium">Connection Settings Guide</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${deviceBasics.name ? 'text-green-500' : 'text-orange-500'}`}
            >
              {deviceBasics.name ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span>
              Provide a <strong>unique device name</strong> to identify this device
            </span>
          </li>
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${deviceBasics.make ? 'text-green-500' : 'text-orange-500'}`}
            >
              {deviceBasics.make ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span>
              Specify the <strong>manufacturer/make</strong> of the device
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
                  Enter the <strong>IP address</strong> (e.g., 192.168.1.100)
                </span>
              </li>
              <li className="flex items-start">
                <span
                  className={`mr-2 flex-shrink-0 ${connectionSettings.port ? 'text-green-500' : 'text-orange-500'}`}
                >
                  {connectionSettings.port ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                </span>
                <span>
                  Specify the <strong>port number</strong> (default Modbus TCP is 502)
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
                  Enter the <strong>serial port</strong> (e.g., COM1 or /dev/ttyS0)
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
                  Select the correct <strong>baud rate</strong> from device documentation
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
              Set the <strong>slave ID</strong> (1-255) of the device
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
              Add at least one <strong>register range</strong> to read from the device
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
              Provide a meaningful name for each register range (e.g., "Temperature Sensors")
            </span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>
              The device documentation should specify the start register and length of each range
            </span>
          </li>
        </ul>
      </>
    ),
    parameters: (
      <>
        <h4 className="mb-2 text-sm font-medium">Data Reader Guide</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span
              className={`mr-2 flex-shrink-0 ${parameters.length > 0 ? 'text-green-500' : 'text-gray-500'}`}
            >
              {parameters.length > 0 ? <CheckCircle size={16} /> : <HelpCircle size={16} />}
            </span>
            <span>
              Add parameters to <strong>interpret register data</strong> (optional but recommended)
            </span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>Parameters define how raw register values are converted to meaningful data</span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>
              Common data types: <strong>Int16</strong>, <strong>UInt16</strong>,{' '}
              <strong>Int32</strong>, <strong>Float32</strong>, <strong>Bool</strong>
            </span>
          </li>
          <li className="flex items-start">
            <HelpCircle size={16} className="mr-2 flex-shrink-0 text-blue-500" />
            <span>
              Use scaling factors and units if your device requires conversion from raw values
            </span>
          </li>
        </ul>
      </>
    ),
  };

  // Progress overview
  const progressSteps = [
    { id: 'connection', label: 'Connection', complete: connectionComplete },
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

export default FormGuide;
