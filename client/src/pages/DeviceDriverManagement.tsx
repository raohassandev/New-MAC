import { CreditCard, Plus, Search, Trash, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NewDeviceDriverForm from '../components/templates/index';
import { useDeviceDrivers } from '../hooks/useDeviceDrivers';
import { Button } from '../components/ui/Button';

interface DeviceDriver {
  id?: string;
  _id: string;
  name: string;
  description: string;
  deviceType: string;
  registerCount: number;
  createdAt: string;
  updatedAt: string;
}

const DeviceDriverManagement: React.FC = () => {
  const navigate = useNavigate();
  const [deviceDrivers, setDeviceDrivers] = useState<DeviceDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewDeviceDriverFormOpen, setIsNewDeviceDriverFormOpen] = useState(false);

  // Get deviceDrivers functions from useDeviceDrivers hook
  const {
    deviceDrivers: apiDeviceDrivers,
    loading: apiLoading,
    // error: apiError,
    addDeviceDriver,
    refreshDeviceDrivers,
    deleteDeviceDriver,
  } = useDeviceDrivers();

  // This will convert the API deviceDriver format to our UI format
  // const convertApiDeviceDrivers
  useEffect(() => {
    if (apiDeviceDrivers) {
      // Map the API deviceDrivers to our UI deviceDriver format
      const mappedDeviceDrivers = apiDeviceDrivers.map(deviceDriver => ({
        _id: deviceDriver._id, // Keep the original MongoDB _id
        id: deviceDriver._id || '', // Also store as id for backward compatibility
        name: deviceDriver.name || '',
        description: deviceDriver.description || '',
        deviceType: deviceDriver.deviceType || '',
        registerCount: deviceDriver.dataPoints?.length || 0,
        createdAt: deviceDriver.createdAt
          ? new Date(deviceDriver.createdAt).toISOString()
          : new Date().toISOString(),
        updatedAt: deviceDriver.updatedAt
          ? new Date(deviceDriver.updatedAt).toISOString()
          : new Date().toISOString(),
      }));

      console.log(
        'Mapped device drivers with IDs:',
        mappedDeviceDrivers.map(d => ({ name: d.name, _id: d._id, id: d.id }))
      );
      setDeviceDrivers(mappedDeviceDrivers);
      setLoading(apiLoading);
    }
  }, [apiDeviceDrivers, apiLoading]);

  // Call the API to refresh deviceDrivers
  const fetchDeviceDrivers = async () => {
    try {
      await refreshDeviceDrivers();
    } catch (error) {
      console.error('Error fetching device drivers:', error);
    }
  };

  // Load deviceDrivers on component mount
  useEffect(() => {
    fetchDeviceDrivers();
  }, []);

  const handleAddDeviceDriver = () => {
    setIsNewDeviceDriverFormOpen(true);
  };

  // Add handler functions for deviceDriver form
  const onNewDeviceDriverFormSubmit = async (deviceDriverData: any) => {
    console.log('Submitting device driver data:', deviceDriverData);
    try {
      // Add isDeviceDriver flag to ensure it's saved as a deviceDriver
      const deviceDriverWithFlags = {
        ...deviceDriverData,
        isDeviceDriver: true,
      };

      await addDeviceDriver(deviceDriverWithFlags);
      setIsNewDeviceDriverFormOpen(false);
      // Refresh the deviceDrivers list
      fetchDeviceDrivers();
    } catch (error) {
      console.error('Error adding device driver:', error);
    }
  };

  const onNewDeviceDriverFormClose = () => {
    console.log('Closing device driver form');
    setIsNewDeviceDriverFormOpen(false);
  };

  const handleEditDeviceDriver = (deviceDriver: DeviceDriver) => {
    // Navigate to the device driver detail page
    // Use _id from the API data instead of id from the mapped data
    const driverId = deviceDriver._id || deviceDriver.id;
    console.log('Navigating to device driver with ID:', driverId);
    navigate(`/device-drivers/${driverId}`);
  };

  const handleDeleteDeviceDriver = async (id: string) => {
    if (confirm('Are you sure you want to delete this device driver?')) {
      try {
        // Call the API to delete the deviceDriver
        await deleteDeviceDriver(id);
        // No need to update state here as it will be handled by the useDeviceDrivers hook
        fetchDeviceDrivers(); // Refresh the list after deletion
      } catch (error) {
        console.error('Error deleting device driver:', error);
      }
    }
  };

  // Duplicate function removed as requested

  const filteredDeviceDrivers = deviceDrivers.filter(
    deviceDriver =>
      deviceDriver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deviceDriver.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deviceDriver.deviceType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Device Driver Library</h1>
        <Button
          variant="default"
          onClick={handleAddDeviceDriver}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add New Device Driver
        </Button>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search device drivers..."
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse p-8 text-center text-gray-500">
          <CreditCard className="mx-auto mb-4" size={32} />
          <p>Loading device drivers...</p>
        </div>
      ) : filteredDeviceDrivers.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <CreditCard className="mx-auto mb-4 text-gray-400" size={32} />
          <h3 className="mb-2 text-lg font-medium text-gray-900">No device drivers found</h3>
          <p className="mb-4 text-gray-500">
            {searchQuery
              ? 'No device drivers match your search criteria. Try adjusting your search.'
              : "You haven't created any device drivers yet."}
          </p>
          {!searchQuery && (
            <Button
              variant="default"
              onClick={handleAddDeviceDriver}
              className="inline-flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Create your first device driver
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <caption className="sr-only">Click on a row to view device driver details</caption>
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Device Driver Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Device Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Registers
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Last Updated
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredDeviceDrivers.map(deviceDriver => (
                  <tr
                    key={deviceDriver.id}
                    className="cursor-pointer transition-colors duration-150 hover:bg-gray-100"
                    onClick={() => handleEditDeviceDriver(deviceDriver)}
                    title="Click to view details"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 flex-shrink-0 text-gray-400" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {deviceDriver.name}
                          </div>
                          <div className="max-w-xs truncate text-sm text-gray-500">
                            {deviceDriver.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                        {deviceDriver.deviceType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {deviceDriver.registerCount} registers
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(deviceDriver.updatedAt)}
                    </td>
                    <td
                      className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteDeviceDriver(deviceDriver._id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Device Driver Form Modal */}
      {isNewDeviceDriverFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50"
          onClick={e => {
            // Close modal when clicking the overlay (background)
            if (e.target === e.currentTarget) {
              console.log('Modal background clicked, closing modal');
              onNewDeviceDriverFormClose();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-xl font-semibold">Create New Device Driver</h2>
              <button
                onClick={() => {
                  console.log('Close button clicked');
                  onNewDeviceDriverFormClose();
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <NewDeviceDriverForm
                onClose={onNewDeviceDriverFormClose}
                onSubmit={onNewDeviceDriverFormSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit device driver modal would go here */}
    </div>
  );
};

export default DeviceDriverManagement;
