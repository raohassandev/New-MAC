import { Card } from '@/components/ui/Card';
import { AlertCircle, AlertTriangle, Info, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  isRead: boolean;
}

interface RecentAlertsProps {
  alerts: Alert[];
}

const RecentAlerts = ({ alerts }: RecentAlertsProps) => {
  if (!alerts || alerts.length === 0) {
    return (
      <Card.Root className="py-8 text-center text-gray-500">
        <Card.Content className="flex flex-col items-center">
          <Info className="mx-auto mb-2" size={24} />
          <p>No alerts found</p>
        </Card.Content>
      </Card.Root>
    );
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500" />;
      case 'info':
      default:
        return <Info size={18} className="text-blue-500" />;
    }
  };

  const getAlertClass = (severity: string, isRead: boolean) => {
    let baseClass = 'mb-2 ';

    if (isRead) baseClass += 'bg-gray-50 ';
    else baseClass += 'bg-white ';

    switch (severity) {
      case 'error':
        return baseClass + 'border-red-500';
      case 'warning':
        return baseClass + 'border-amber-500';
      case 'info':
      default:
        return baseClass + 'border-blue-500';
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <Card.Root key={alert.id} className={getAlertClass(alert.severity, alert.isRead)}>
          <Card.Content className="rounded-r-md border-l-4 p-3">
            <div className="flex items-start">
              <div className="mr-3 mt-0.5">{getAlertIcon(alert.severity)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between">
                  <p className="font-medium text-gray-800">{alert.deviceName}</p>
                  <span className="text-xs text-gray-500">{formatTimeAgo(alert.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600">{alert.message}</p>
                <div className="mt-1">
                  <Link
                    to={`/devices/${alert.deviceId}`}
                    className="flex items-center text-xs text-blue-500 hover:text-blue-700"
                  >
                    <LinkIcon size={12} className="mr-1" />
                    View device
                  </Link>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      ))}
    </div>
  );
};

export default RecentAlerts;
