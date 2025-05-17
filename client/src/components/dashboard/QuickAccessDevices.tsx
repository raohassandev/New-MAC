import { AlertCircle, CheckCircle, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui';

interface Device {
  _id: string;
  name: string;
  ip?: string;
  port?: number;
  enabled: boolean;
  lastSeen?: Date;
}

interface QuickAccessDevicesProps {
  devices: Device[];
}

const QuickAccessDevices = ({ devices }: QuickAccessDevicesProps) => {
  if (!devices || devices.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <div className="flex flex-col items-center">
          <HardDrive className="mx-auto mb-2" size={24} />
          <p>No devices found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {devices.map(device => (
        <Card
          key={device._id}
          className="rounded-md border border-gray-100 p-3 transition-colors hover:bg-gray-50"
        >
          <Link to={`/devices/${device._id}`} className="block">
            <div className="flex items-center">
              <div className="mr-3">
                {device.enabled ? (
                  <CheckCircle size={18} className="text-green-500" />
                ) : (
                  <AlertCircle size={18} className="text-red-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{device.name}</p>
                <p className="truncate text-xs text-gray-500">
                  {device.ip ? `${device.ip}:${device.port}` : 'No connection info'}
                </p>
              </div>
              <div className="text-xs text-gray-400">
                {device.lastSeen
                  ? `Last seen: ${new Date(device.lastSeen).toLocaleTimeString()}`
                  : 'Never connected'}
              </div>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
};

export default QuickAccessDevices;
