import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MoreVertical,
  Edit,
  Trash,
  Star,
  Pin,
  ChevronRight,
} from 'lucide-react';

// Import UI components instead of direct usage of Radix
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { Dropdown } from '@/components/ui/Dropdown';
import { Badge } from '@/components/ui/Badge';

interface Device {
  _id: string;
  name: string;
  ip?: string;
  port?: number;
  enabled: boolean;
  lastSeen?: Date;
  make?: string;
  model?: string;
  tags?: string[];
}

interface DeviceCardProps {
  device: Device;
  onEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
  onToggleFavorite?: (device: Device) => void;
  onTogglePin?: (device: Device) => void;
  isFavorite?: boolean;
  isPinned?: boolean;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTogglePin,
  isFavorite = false,
  isPinned = false,
}) => {
  const formatTimeAgo = (date?: Date) => {
    if (!date) return 'Never';

    // Convert string date to Date object if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <Card.Content className="p-0">
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-start justify-between">
            <Link to={`/devices/${device._id}`} className="block flex-grow">
              <div className="flex items-center">
                <div
                  className={`mr-2 h-3 w-3 rounded-full ${
                    device.enabled ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <h3 className="font-medium text-gray-800">{device.name}</h3>
              </div>
            </Link>

            <Tooltip content="Actions">
              <Dropdown
                trigger={
                  <button className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <MoreVertical size={16} />
                  </button>
                }
                align="end"
                width="md"
              >
                <Dropdown.Item icon={<Edit size={14} />} onClick={() => onEdit && onEdit(device)}>
                  Edit Device
                </Dropdown.Item>

                <Dropdown.Item
                  icon={
                    <Star
                      size={14}
                      className={isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}
                    />
                  }
                  onClick={() => onToggleFavorite && onToggleFavorite(device)}
                >
                  {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </Dropdown.Item>

                <Dropdown.Item
                  icon={<Pin size={14} className={isPinned ? 'fill-blue-400 text-blue-400' : ''} />}
                  onClick={() => onTogglePin && onTogglePin(device)}
                >
                  {isPinned ? 'Unpin Device' : 'Pin Device'}
                </Dropdown.Item>

                <Dropdown.Separator />

                <Dropdown.Item
                  icon={<Trash size={14} />}
                  danger
                  onClick={() => onDelete && onDelete(device)}
                >
                  Delete Device
                </Dropdown.Item>
              </Dropdown>
            </Tooltip>
          </div>

          {(device.make || device.model) && (
            <div className="mt-1 text-xs text-gray-500">
              {device.make} {device.model}
            </div>
          )}

          {device.tags && device.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {device.tags.map((tag, index) => (
                <Badge key={index} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-gray-600">
              {device.ip && (
                <div className="flex items-center">
                  {device.ip}:{device.port || '-'}
                </div>
              )}
            </div>

            <div className="flex items-center text-gray-500">
              <Clock size={14} className="mr-1" />
              <span className="text-xs">
                {device.lastSeen ? formatTimeAgo(device.lastSeen) : 'Never seen'}
              </span>
            </div>
          </div>

          <div className="mt-2 flex justify-between">
            <div className="flex items-center">
              {device.enabled ? (
                <Badge variant="success" size="sm" icon={<CheckCircle size={12} />}>
                  Online
                </Badge>
              ) : (
                <Badge variant="danger" size="sm" icon={<AlertCircle size={12} />}>
                  Offline
                </Badge>
              )}
            </div>

            <Link
              to={`/devices/${device._id}`}
              className="flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              Details
              <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default DeviceCard;
