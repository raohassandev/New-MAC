import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * A diagnostic component that validates a device ID
 * Can be shown on devices pages when there are issues
 */
const DeviceValidator: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [showDevices, setShowDevices] = useState<boolean>(false);

  // Function to validate the device ID
  const validateDevice = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Try the validator endpoint
      try {
        const response = await fetch(`/client/api/device-utils/validate/${id}`);
        if (response.ok) {
          const data = await response.json();
          setValidationResult(data);
          
          // If validation fails, try to load some devices as suggestions
          if (!data.isValid) {
            loadDevices();
          }
          return;
        }
      } catch (err) {
        console.warn('Validation endpoint error:', err);
      }
      
      // If the validation endpoint failed, try diagnostics
      try {
        const diagnosticsResponse = await fetch('/client/api/device-utils/diagnostics' + (id ? `?deviceId=${id}` : ''));
        if (diagnosticsResponse.ok) {
          const diagnosticsData = await diagnosticsResponse.json();
          setValidationResult(diagnosticsData.results);
          
          // Try to extract valid devices from diagnostics
          if (diagnosticsData.results?.deviceCheck?.sample) {
            setDevices(diagnosticsData.results.deviceCheck.sample);
            setShowDevices(true);
          }
          return;
        }
      } catch (err) {
        console.warn('Diagnostics endpoint error:', err);
      }
      
      // If all else fails, try to list devices directly
      loadDevices();
      
      setError('Could not validate device ID. See console for details.');
    } catch (err: any) {
      setError(err.message || 'Failed to validate device');
      console.error('Device validation error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to load a list of devices
  const loadDevices = async () => {
    try {
      const response = await fetch('/client/api/devices');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setDevices(data.slice(0, 5)); // Get first 5 devices
        } else if (data.devices && Array.isArray(data.devices)) {
          setDevices(data.devices.slice(0, 5)); // Get first 5 devices
        }
        setShowDevices(true);
      }
    } catch (err) {
      console.warn('Error listing devices:', err);
    }
  };

  // Validate device ID when component mounts
  useEffect(() => {
    if (deviceId) {
      validateDevice(deviceId);
    }
  }, [deviceId]);

  if (loading) {
    return (
      <div className="rounded-md border border-gray-300 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-blue-600">Validating Device ID...</h3>
        <div className="flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-red-600">Device Validation Error</h3>
        <p className="text-sm text-red-700">{error}</p>
        
        {showDevices && devices.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-1 text-sm font-medium text-gray-700">Available devices:</h4>
            <ul className="rounded-md border border-gray-200 bg-white p-2 text-sm">
              {devices.map((device: any) => (
                <li key={device._id} className="mb-1">
                  <a 
                    href={`/devices/${device._id}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {device.name} (ID: {device._id})
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (!validationResult) {
    return null;
  }

  // Determine if the device is valid
  const isValid = validationResult.isValid === true || 
    (validationResult.deviceCheck?.idCheck?.found === true);

  return (
    <div className={`rounded-md border p-4 shadow-sm ${
      isValid 
        ? 'border-green-300 bg-green-50' 
        : 'border-yellow-300 bg-yellow-50'
    }`}>
      <h3 className={`mb-2 text-lg font-semibold ${
        isValid ? 'text-green-600' : 'text-yellow-600'
      }`}>
        Device ID Validation
      </h3>
      
      {isValid ? (
        <p className="text-sm text-green-700">✓ Device ID is valid</p>
      ) : (
        <>
          <p className="text-sm text-yellow-700">⚠ Device ID validation failed</p>
          
          {validationResult.reason && (
            <p className="mt-1 text-sm text-yellow-700">Reason: {validationResult.reason}</p>
          )}
          
          {validationResult.deviceCheck?.idCheck?.error && (
            <p className="mt-1 text-sm text-yellow-700">
              Error: {validationResult.deviceCheck.idCheck.error}
            </p>
          )}
          
          {validationResult.deviceCheck?.sample && (
            <div className="mt-4">
              <h4 className="mb-1 text-sm font-medium text-gray-700">Available devices:</h4>
              <ul className="rounded-md border border-gray-200 bg-white p-2 text-sm">
                {validationResult.deviceCheck.sample.map((device: any) => (
                  <li key={device._id} className="mb-1">
                    <a 
                      href={`/devices/${device._id}`} 
                      className="text-blue-600 hover:underline"
                    >
                      {device.name} (ID: {device._id})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      
      <div className="mt-2">
        <button
          onClick={() => validateDevice(deviceId || '')}
          className="rounded-md bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600"
        >
          Re-validate
        </button>
      </div>
    </div>
  );
};

export default DeviceValidator;