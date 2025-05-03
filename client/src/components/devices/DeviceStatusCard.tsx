// client/src/components/devices/DeviceStatusCard.tsx
import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../core/Badge';
import { cn } from '../../utils/cn';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface DeviceStatusCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  detail?: string;
  status?: 'online' | 'offline' | 'warning' | 'error' | 'unknown';
  className?: string;
}

const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({
  title,
  value,
  icon,
  detail,
  status,
  className,
}) => {
  // Determine the badge variant based on status
  const getBadgeVariant = () => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Get status text to display
  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <CheckCircle size={14} />;
      case 'offline':
      case 'error':
        return <AlertCircle size={14} />;
      case 'warning':
        return <AlertCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  return (
    <Card className={cn('bg-white transition-all hover:shadow-md', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
            {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
            {status && (
              <div className="mt-2">
                <Badge variant={getBadgeVariant()} icon={getStatusIcon()}>
                  {getStatusText()}
                </Badge>
              </div>
            )}
          </div>
          <div className="text-2xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceStatusCard;
