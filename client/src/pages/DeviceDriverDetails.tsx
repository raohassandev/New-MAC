import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, ArrowLeft, Trash, CreditCard, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useDeviceDrivers } from '../hooks/useDeviceDrivers';
import { DeviceDriver } from '../types/deviceDriver.types';
import { formatDate } from '../utils/formatters';
import NewDeviceDriverForm from '../components/templates/index';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const DeviceDriverDetails: React.FC = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const [deviceDriver, setDeviceDriver] = useState<DeviceDriver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { getDeviceDriver, updateDeviceDriver, deleteDeviceDriver } = useDeviceDrivers();

  useEffect(() => {
    if (!driverId) {
      setError('Device driver ID is required');
      setLoading(false);
      return;
    }

    const fetchDeviceDriver = async () => {
      try {
        setLoading(true);
        console.log(`Attempting to fetch device driver with ID: ${driverId}`);
        const data = await getDeviceDriver(driverId);
        console.log('Device driver data received:', JSON.stringify(data, null, 2));
        setDeviceDriver(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching device driver:', err);
        setError(
          'Failed to load device driver. Error: ' +
            (err instanceof Error ? err.message : String(err))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceDriver();
  }, [driverId, getDeviceDriver]);

  const handleBack = () => {
    navigate('/device-drivers');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (updatedDeviceDriver: DeviceDriver) => {
    try {
      setLoading(true);
      const result = await updateDeviceDriver(driverId!, updatedDeviceDriver);
      setDeviceDriver(result);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Failed to update device driver');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };
  
  const handleConfirmCancel = () => {
    setIsEditing(false);
    setShowCancelConfirm(false);
  };
  
  const handleCancelDialog = () => {
    setShowCancelConfirm(false);
  };

  const handleUpdateDeviceDriver = async (updatedData: any) => {
    if (!driverId) {
      return;
    }
    
    try {
      const result = await updateDeviceDriver(driverId, updatedData);
      
      // Update the local state with the new data
      setDeviceDriver(result);
      setIsEditing(false);
      
      // Refresh the page to show the updated data
      const freshData = await getDeviceDriver(driverId);
      setDeviceDriver(freshData);
    } catch (error) {
      console.error('Error updating device driver:', error);
      
      // Show error message to user
      alert('Failed to update device driver: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this device driver?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteDeviceDriver(driverId!);
      navigate('/device-drivers');
    } catch (err) {
      setError('Failed to delete device driver');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <RotateCcw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-gray-600">Loading device driver details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Error</p>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
        <Button variant="outline" onClick={handleBack} className="mt-4 flex items-center space-x-2">
          <ArrowLeft size={16} />
          <span>Back to Device Drivers</span>
        </Button>
      </div>
    );
  }

  if (!deviceDriver) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Device Driver Not Found</p>
          <p className="mt-2 text-gray-600">The requested device driver could not be found.</p>
        </div>
        <Button variant="outline" onClick={handleBack} className="flex items-center space-x-2">
          <ArrowLeft size={16} />
          <span>Back to Device Drivers</span>
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <>
        <div className="container mx-auto p-4">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="outline" onClick={handleCancel} className="flex items-center space-x-2">
              <ArrowLeft size={16} />
              <span>Cancel</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Edit Device Driver</h1>
            <div></div> {/* Empty div for flex spacing */}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <NewDeviceDriverForm
              initialData={deviceDriver}
              onSubmit={handleSave}
              onClose={handleCancel}
              isEditing={true}
            />
          </div>
        </div>

        {/* Confirmation Dialog for Edit Form */}
        <ConfirmDialog
          isOpen={showCancelConfirm}
          onConfirm={handleConfirmCancel}
          onCancel={handleCancelDialog}
          title="Discard changes?"
          message="Are you sure you want to close the form? Any unsaved changes will be lost."
        />
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} className="flex items-center space-x-2">
            <ArrowLeft size={16} />
            <span>Back</span>
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleEdit} className="flex items-center space-x-2">
              <Edit size={16} />
              <span>Edit</span>
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center space-x-2"
            >
              <Trash size={16} />
              <span>Delete</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Information */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center">
                <CreditCard className="mr-3 h-8 w-8 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-800">{deviceDriver.name}</h2>
              </div>

              {deviceDriver.description && (
                <p className="mb-6 text-gray-600">{deviceDriver.description}</p>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Device Type</h3>
                  <p className="text-gray-800">{deviceDriver.deviceType || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Make</h3>
                  <p className="text-gray-800">{deviceDriver.make || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Model</h3>
                  <p className="text-gray-800">{deviceDriver.model || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Register Count</h3>
                  <p className="text-gray-800">{deviceDriver.dataPoints?.length || 0}</p>
                </div>
              </div>

              {deviceDriver.dataPoints && deviceDriver.dataPoints.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-medium text-gray-700">Data Points</h3>
                  <div className="space-y-4">
                    {deviceDriver.dataPoints.map((dataPoint: any, index: number) => (
                      <div key={index} className="rounded border p-4">
                        <h4 className="mb-2 font-medium">
                          Range {index + 1}: {dataPoint.range.name || 'Unnamed'}
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Start Address:</span>{' '}
                            {dataPoint.range.startAddress}
                          </div>
                          <div>
                            <span className="text-gray-600">Count:</span> {dataPoint.range.count}
                          </div>
                          <div>
                            <span className="text-gray-600">Function Code:</span> {dataPoint.range.fc}
                          </div>
                        </div>
                        {dataPoint.parser.parameters.length > 0 && (
                          <div className="mt-3">
                            <span className="text-sm font-medium text-gray-600">Parameters:</span>
                            <ul className="mt-1 space-y-1 text-sm">
                              {dataPoint.parser.parameters.map((param: any, pIndex: number) => (
                                <li key={pIndex} className="ml-4">
                                  • {param.name} ({param.dataType})
                                  {param.unit && ` - ${param.unit}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Information */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-medium text-gray-700">Additional Information</h3>
              <div className="space-y-4">
                {deviceDriver.tags && deviceDriver.tags.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-600">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {deviceDriver.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Status</h3>
                  <p className={`text-${deviceDriver.enabled ? 'green' : 'red'}-600 font-medium`}>
                    {deviceDriver.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>

                {deviceDriver.createdBy && (
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-gray-600">Created By</h3>
                    <p className="text-gray-800">{deviceDriver.createdBy.username || 'Unknown'}</p>
                  </div>
                )}

                {deviceDriver.createdAt && (
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-gray-600">Created Date</h3>
                    <p className="text-gray-800">{formatDate(deviceDriver.createdAt.toString())}</p>
                  </div>
                )}

                {deviceDriver.updatedAt && (
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-gray-600">Last Updated</h3>
                    <p className="text-gray-800">{formatDate(deviceDriver.updatedAt.toString())}</p>
                  </div>
                )}

                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">ID</h3>
                  <p className="break-all text-xs text-gray-500">{deviceDriver._id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onConfirm={handleConfirmCancel}
        onCancel={handleCancelDialog}
        title="Discard changes?"
        message="Are you sure you want to close the form? Any unsaved changes will be lost."
      />

      {/* Edit Modal */}
      {isEditing && deviceDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
            <button
              onClick={handleCancel}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
            <NewDeviceDriverForm
              onClose={handleCancel}
              onSubmit={handleUpdateDeviceDriver}
              initialData={deviceDriver}
              isEditing={true}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default DeviceDriverDetails;