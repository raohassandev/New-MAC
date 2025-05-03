import { Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState } from 'react';

import { dashboardApi } from '../api/endpoints';
import { format } from 'date-fns';

interface DashboardSummary {
  systemStatus: 'online' | 'offline' | 'warning';
  cpuUsage: number;
  memoryUsage: number;
  uptime: string;
  activeAlerts: number;
  todayLogs: number;
}

interface PerformanceData {
  date: string;
  cpu: number;
  memory: number;
  network: number;
}

interface RecentActivity {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch dashboard summary
        const summaryResponse = await dashboardApi.getSummary();
        setSummary(summaryResponse.data);

        // Fetch performance metrics
        const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
        const performanceResponse = await dashboardApi.getPerformanceMetrics(days);
        setPerformanceData(performanceResponse.data);

        // Fetch recent activity
        const activityResponse = await dashboardApi.getRecentActivity(5);
        setRecentActivities(activityResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeframe]);

  // Sample data (in case the API is not available yet)
  const samplePerformanceData = [
    { date: '2025-04-24', cpu: 45, memory: 32, network: 18 },
    { date: '2025-04-25', cpu: 52, memory: 38, network: 22 },
    { date: '2025-04-26', cpu: 48, memory: 35, network: 20 },
    { date: '2025-04-27', cpu: 70, memory: 42, network: 28 },
    { date: '2025-04-28', cpu: 55, memory: 40, network: 25 },
    { date: '2025-04-29', cpu: 60, memory: 45, network: 30 },
    { date: '2025-04-30', cpu: 58, memory: 43, network: 27 },
  ];

  const sampleSummary = {
    systemStatus: 'online' as const,
    cpuUsage: 58,
    memoryUsage: 43,
    uptime: '7d 12h 35m',
    activeAlerts: 2,
    todayLogs: 142,
  };

  const sampleActivities = [
    {
      id: '1',
      type: 'alert' as const,
      message: 'System alert: High CPU usage detected (85%)',
      timestamp: '2025-04-30T14:25:00Z',
    },
    {
      id: '2',
      type: 'warning' as const,
      message: 'Memory usage over 70% for more than 30 minutes',
      timestamp: '2025-04-30T13:45:00Z',
    },
    {
      id: '3',
      type: 'info' as const,
      message: 'System maintenance scheduled for May 5, 2025',
      timestamp: '2025-04-30T11:30:00Z',
    },
    {
      id: '4',
      type: 'info' as const,
      message: 'Software update version 1.2.5 installed successfully',
      timestamp: '2025-04-29T16:15:00Z',
    },
    {
      id: '5',
      type: 'error' as const,
      message: 'Database connection failed - automatic retry successful',
      timestamp: '2025-04-29T10:05:00Z',
    },
  ];

  // Use sample data when real data is not available
  const displayData = performanceData.length > 0 ? performanceData : samplePerformanceData;
  const displaySummary = summary || sampleSummary;
  const displayActivities = recentActivities.length > 0 ? recentActivities : sampleActivities;

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'info':
      default:
        return <Clock size={16} className="text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  // Fix for the charAt and slice error in the original code
  const formatName = (name: string) => {
    if (typeof name === 'string') {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return String(name);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Timeframe:</span>
          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value as 'day' | 'week' | 'month')}
            className="rounded-md border border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">System Status</h2>
            <div
              className={`h-3 w-3 rounded-full ${getStatusColor(displaySummary.systemStatus)}`}
            ></div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-gray-800">
              {displaySummary.systemStatus.toUpperCase()}
            </div>
            <div className="mt-2 text-sm text-gray-600">Uptime: {displaySummary.uptime}</div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">CPU Usage</h2>
            <Activity size={20} className="text-blue-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-gray-800">{displaySummary.cpuUsage}%</div>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full ${
                  displaySummary.cpuUsage > 80
                    ? 'bg-red-500'
                    : displaySummary.cpuUsage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${displaySummary.cpuUsage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Memory Usage</h2>
            <Activity size={20} className="text-blue-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-gray-800">{displaySummary.memoryUsage}%</div>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full ${
                  displaySummary.memoryUsage > 80
                    ? 'bg-red-500'
                    : displaySummary.memoryUsage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${displaySummary.memoryUsage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">System Performance</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={value => {
                  const date = new Date(value);
                  return format(date, 'MMM dd');
                }}
              />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [`${value}%`, formatName(name as string)]}
                labelFormatter={label => format(new Date(label), 'MMMM dd, yyyy')}
              />
              <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} name="CPU" />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="#10b981"
                strokeWidth={2}
                name="Memory"
              />
              <Line
                type="monotone"
                dataKey="network"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Network"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">Recent Activity</h2>
          <div className="space-y-4">
            {displayActivities.map(activity => (
              <div key={activity.id} className="flex items-start rounded-md p-3 hover:bg-gray-50">
                <div className="mt-1 flex-shrink-0">{getActivityIcon(activity.type)}</div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-gray-700">{activity.message}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <a href="/activity" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all activity
            </a>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">System Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center rounded-md bg-gray-50 p-4">
              <AlertTriangle size={20} className="text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Alerts</p>
                <p className="text-xl font-semibold">{displaySummary.activeAlerts}</p>
              </div>
            </div>
            <div className="flex items-center rounded-md bg-gray-50 p-4">
              <Clock size={20} className="text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Today's Logs</p>
                <p className="text-xl font-semibold">{displaySummary.todayLogs}</p>
              </div>
            </div>
            <div className="flex items-center rounded-md bg-gray-50 p-4">
              <ArrowUp size={20} className="text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Upload Speed</p>
                <p className="text-xl font-semibold">45 Mbps</p>
              </div>
            </div>
            <div className="flex items-center rounded-md bg-gray-50 p-4">
              <ArrowDown size={20} className="text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Download Speed</p>
                <p className="text-xl font-semibold">87 Mbps</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
