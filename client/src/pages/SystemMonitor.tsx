import { Activity, Cpu, Database, HardDrive, Network, RefreshCw, Thermometer } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState } from 'react';

import { format } from 'date-fns';
import { systemApi } from '../api/endpoints';

interface SystemStatus {
  status: 'online' | 'offline' | 'warning';
  uptime: string;
  temperature: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: {
    download: number;
    upload: number;
  };
  lastUpdated: string;
}

interface MetricsData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  temperature: number;
}

const SystemMonitor = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week'>('day');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cpu' | 'memory' | 'disk' | 'network'>(
    'overview'
  );

  useEffect(() => {
    fetchSystemData();

    // Set up auto-refresh interval (every 30 seconds)
    const interval = setInterval(() => {
      fetchSystemData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchSystemData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setRefreshing(true);
      }

      // Fetch system status
      const statusResponse = await systemApi.getSystemStatus();
      setStatus(statusResponse.data);

      // Fetch system metrics based on selected timeframe
      const metricsResponse = await systemApi.getSystemMetrics(timeframe);
      setMetricsData(metricsResponse.data);
    } catch (error) {
      console.error('Error fetching system data', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Sample data (in case the API is not available yet)
  const sampleStatus: SystemStatus = {
    status: 'online',
    uptime: '7d 12h 35m',
    temperature: 45.2,
    cpuUsage: 58,
    memoryUsage: 63,
    diskUsage: 72,
    networkUsage: {
      download: 15.2,
      upload: 5.8,
    },
    lastUpdated: '2025-04-30T14:35:00Z',
  };

  // Generate sample metrics data
  const generateSampleMetrics = (): MetricsData[] => {
    const data: MetricsData[] = [];
    const now = new Date();
    const hoursToGenerate = timeframe === 'hour' ? 12 : timeframe === 'day' ? 24 : 168; // 1 week = 168 hours

    for (let i = hoursToGenerate - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3600000); // subtract hours

      data.push({
        timestamp: timestamp.toISOString(),
        cpu: Math.floor(Math.random() * 30) + 40, // 40-70%
        memory: Math.floor(Math.random() * 25) + 50, // 50-75%
        disk: Math.floor(Math.random() * 10) + 65, // 65-75%
        network: Math.floor(Math.random() * 50) + 20, // 20-70%
        temperature: Math.floor(Math.random() * 10) + 40, // 40-50°C
      });
    }

    return data;
  };

  const displayStatus = status || sampleStatus;
  const displayMetrics = metricsData.length > 0 ? metricsData : generateSampleMetrics();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, timeframe === 'hour' ? 'HH:mm' : 'MMM dd, HH:mm');
    } catch (e) {
      return timestamp;
    }
  };

  const handleRefresh = () => {
    fetchSystemData(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">System Monitor</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value as 'hour' | 'day' | 'week')}
            className="rounded-md border border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="hour">Last 12 Hours</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <RefreshCw size={16} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">System Status</h2>
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(displayStatus.status)}`}></div>
            <span className="ml-2 text-sm capitalize text-gray-600">{displayStatus.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center rounded-md bg-gray-50 p-4">
            <Cpu size={24} className="text-blue-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">CPU Usage</p>
              <p className="text-xl font-semibold">{displayStatus.cpuUsage}%</p>
            </div>
          </div>

          <div className="flex items-center rounded-md bg-gray-50 p-4">
            <HardDrive size={24} className="text-purple-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Memory Usage</p>
              <p className="text-xl font-semibold">{displayStatus.memoryUsage}%</p>
            </div>
          </div>

          <div className="flex items-center rounded-md bg-gray-50 p-4">
            <Database size={24} className="text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Disk Usage</p>
              <p className="text-xl font-semibold">{displayStatus.diskUsage}%</p>
            </div>
          </div>

          <div className="flex items-center rounded-md bg-gray-50 p-4">
            <Thermometer size={24} className="text-red-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Temperature</p>
              <p className="text-xl font-semibold">{displayStatus.temperature}°C</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center rounded-md bg-gray-50 p-4">
            <Activity size={24} className="text-green-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Uptime</p>
              <p className="text-xl font-semibold">{displayStatus.uptime}</p>
            </div>
          </div>

          <div className="flex items-center rounded-md bg-gray-50 p-4">
            <Network size={24} className="text-blue-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Network Traffic</p>
              <p className="text-xl font-semibold">
                <span className="text-green-500">↑ {displayStatus.networkUsage.upload} MB/s</span> /
                <span className="ml-1 text-blue-500">
                  ↓ {displayStatus.networkUsage.download} MB/s
                </span>
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Last updated: {formatTimestamp(displayStatus.lastUpdated)}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="rounded-lg bg-white shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('cpu')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'cpu'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'memory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Memory
            </button>
            <button
              onClick={() => setActiveTab('disk')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'disk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Disk
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'network'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Network
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-700">
                System Performance Overview
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip
                      formatter={value => [`${value}%`, '']}
                      labelFormatter={formatTimestamp}
                    />
                    <Line
                      type="monotone"
                      dataKey="cpu"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="CPU"
                    />
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Memory"
                    />
                    <Line
                      type="monotone"
                      dataKey="disk"
                      stroke="#eab308"
                      strokeWidth={2}
                      name="Disk"
                    />
                    <Line
                      type="monotone"
                      dataKey="network"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Network"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'cpu' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-700">CPU Usage</h3>
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Current Usage: {displayStatus.cpuUsage}%
                  </span>
                  <span
                    className={`text-sm ${
                      displayStatus.cpuUsage > 80
                        ? 'text-red-500'
                        : displayStatus.cpuUsage > 60
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}
                  >
                    {displayStatus.cpuUsage > 80
                      ? 'High'
                      : displayStatus.cpuUsage > 60
                        ? 'Moderate'
                        : 'Normal'}
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full ${getUsageColor(displayStatus.cpuUsage)}`}
                    style={{ width: `${displayStatus.cpuUsage}%` }}
                  ></div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip
                      formatter={value => [`${value}%`, 'CPU Usage']}
                      labelFormatter={formatTimestamp}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#93c5fd" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-700">Memory Usage</h3>
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Current Usage: {displayStatus.memoryUsage}%
                  </span>
                  <span
                    className={`text-sm ${
                      displayStatus.memoryUsage > 80
                        ? 'text-red-500'
                        : displayStatus.memoryUsage > 60
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}
                  >
                    {displayStatus.memoryUsage > 80
                      ? 'High'
                      : displayStatus.memoryUsage > 60
                        ? 'Moderate'
                        : 'Normal'}
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full ${getUsageColor(displayStatus.memoryUsage)}`}
                    style={{ width: `${displayStatus.memoryUsage}%` }}
                  ></div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip
                      formatter={value => [`${value}%`, 'Memory Usage']}
                      labelFormatter={formatTimestamp}
                    />
                    <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fill="#c4b5fd" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'disk' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-700">Disk Usage</h3>
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Current Usage: {displayStatus.diskUsage}%
                  </span>
                  <span
                    className={`text-sm ${
                      displayStatus.diskUsage > 80
                        ? 'text-red-500'
                        : displayStatus.diskUsage > 60
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}
                  >
                    {displayStatus.diskUsage > 80
                      ? 'High'
                      : displayStatus.diskUsage > 60
                        ? 'Moderate'
                        : 'Normal'}
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full ${getUsageColor(displayStatus.diskUsage)}`}
                    style={{ width: `${displayStatus.diskUsage}%` }}
                  ></div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip
                      formatter={value => [`${value}%`, 'Disk Usage']}
                      labelFormatter={formatTimestamp}
                    />
                    <Area type="monotone" dataKey="disk" stroke="#eab308" fill="#fde68a" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-700">Network Traffic</h3>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">Download Speed</p>
                  <p className="text-2xl font-semibold text-blue-500">
                    {displayStatus.networkUsage.download} MB/s
                  </p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">Upload Speed</p>
                  <p className="text-2xl font-semibold text-green-500">
                    {displayStatus.networkUsage.upload} MB/s
                  </p>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip
                      formatter={value => [`${value}%`, 'Network Utilization']}
                      labelFormatter={formatTimestamp}
                    />
                    <Area type="monotone" dataKey="network" stroke="#10b981" fill="#a7f3d0" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
