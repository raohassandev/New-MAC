import React, { useEffect, useState } from 'react';
import { Card } from '../ui';
import * as Progress from '@radix-ui/react-progress';
import { AlertCircle, CheckCircle, Clock, Cpu, Database, Server } from 'lucide-react';

const SystemStatus: React.FC = () => {
  const [systemStats, setSystemStats] = useState({
    serverStatus: 'healthy', // healthy, warning, error
    databaseStatus: 'healthy',
    apiStatus: 'healthy',
    cpuUsage: 65,
    memoryUsage: 42,
    diskUsage: 38,
    activeDevices: 12,
    totalDevices: 15,
    connectedUsers: 5,
    uptime: '15 days, 3 hours',
    lastCheckTime: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    // Simulate fetching real system metrics
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        ...prev,
        cpuUsage: Math.max(30, Math.min(90, prev.cpuUsage + Math.floor(Math.random() * 10 - 5))),
        memoryUsage: Math.max(20, Math.min(80, prev.memoryUsage + Math.floor(Math.random() * 8 - 4))),
        activeDevices: Math.max(
          5,
          Math.min(prev.totalDevices, prev.activeDevices + Math.floor(Math.random() * 3 - 1))
        ),
        lastCheckTime: new Date().toLocaleTimeString(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'warning':
        return <Clock size={12} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle size={12} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'bg-green-500';
    if (usage < 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const StatsCard = ({
    icon,
    title,
    status,
    stats,
  }: {
    icon: React.ReactNode;
    title: string;
    status: string;
    stats?: { label: string; value: string | number; unit?: string }[];
  }) => {
    return (
      <div className="rounded-lg bg-gray-50 p-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center">
            {icon}
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
          <div className="flex items-center">
            {getStatusIcon(status)}
            <span className={`ml-1 text-xs ${getStatusColor(status)}`}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
        {stats && (
          <div className="mt-2 space-y-1">
            {stats.map((stat, index) => (
              <div key={index} className="flex justify-between text-xs text-gray-500">
                <span>{stat.label}</span>
                <span>
                  {stat.value}
                  {stat.unit && ` ${stat.unit}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="flex items-center text-lg font-semibold">
          <Server className="mr-2 text-blue-500" size={20} />
          System Status
        </h2>
        <div className="text-sm text-gray-500">Last checked: {systemStats.lastCheckTime}</div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Server Status */}
          <StatsCard
            icon={<Server size={16} className="mr-2 text-gray-600" />}
            title="Server"
            status={systemStats.serverStatus}
            stats={[
              { label: 'CPU Usage', value: systemStats.cpuUsage, unit: '%' },
              { label: 'Memory Usage', value: systemStats.memoryUsage, unit: '%' },
              { label: 'Uptime', value: systemStats.uptime },
            ]}
          />

          {/* Database Status */}
          <StatsCard
            icon={<Database size={16} className="mr-2 text-gray-600" />}
            title="Database"
            status={systemStats.databaseStatus}
            stats={[
              { label: 'Disk Usage', value: systemStats.diskUsage, unit: '%' },
              { label: 'Active Connections', value: 12 },
              { label: 'Response Time', value: '32ms' },
            ]}
          />

          {/* API Status */}
          <StatsCard
            icon={<Cpu size={16} className="mr-2 text-gray-600" />}
            title="API"
            status={systemStats.apiStatus}
            stats={[
              { label: 'Response Time', value: '45ms' },
              { label: 'Requests/min', value: 234 },
              { label: 'Error Rate', value: '0.02%' },
            ]}
          />

          {/* Device Status */}
          <StatsCard
            icon={<CheckCircle size={16} className="mr-2 text-gray-600" />}
            title="Devices"
            status="healthy"
            stats={[
              { label: 'Active', value: systemStats.activeDevices },
              { label: 'Total', value: systemStats.totalDevices },
              { label: 'Connected Users', value: systemStats.connectedUsers },
            ]}
          />
        </div>

        {/* Progress Bars for Usage Metrics */}
        <div className="mt-6 space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>CPU Usage</span>
              <span>{systemStats.cpuUsage}%</span>
            </div>
            <Progress.Root
              className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
              value={systemStats.cpuUsage}
            >
              <Progress.Indicator
                className={`h-2 rounded-full transition-all ${getUsageColor(systemStats.cpuUsage)}`}
                style={{ width: `${systemStats.cpuUsage}%` }}
              />
            </Progress.Root>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Memory Usage</span>
              <span>{systemStats.memoryUsage}%</span>
            </div>
            <Progress.Root
              className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
              value={systemStats.memoryUsage}
            >
              <Progress.Indicator
                className={`h-2 rounded-full transition-all ${getUsageColor(systemStats.memoryUsage)}`}
                style={{ width: `${systemStats.memoryUsage}%` }}
              />
            </Progress.Root>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Disk Usage</span>
              <span>{systemStats.diskUsage}%</span>
            </div>
            <Progress.Root
              className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
              value={systemStats.diskUsage}
            >
              <Progress.Indicator
                className={`h-2 rounded-full transition-all ${getUsageColor(systemStats.diskUsage)}`}
                style={{ width: `${systemStats.diskUsage}%` }}
              />
            </Progress.Root>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SystemStatus;