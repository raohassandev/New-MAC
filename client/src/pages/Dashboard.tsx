import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  Clock,
  Sliders,
  AlertOctagon,
  Info,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '../redux/store';
import {
  selectSystemMonitorRefreshInterval,
  selectRealTimeUpdatesEnabled,
} from '../redux/features/siteConfiguration';

// Define useAppSelector to avoid circular dependencies
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

import { dashboardApi } from '../api/endpoints';
import { format } from 'date-fns';

interface DashboardSummary {
  systemStatus: 'online' | 'offline' | 'warning';
  cpuUsage: number;
  memoryUsage: number;
  uptime: string;
  activeAlerts: number;
  todayLogs: number;
  devices?: {
    total: number;
    online: number;
    enabled: number;
    disabled: number;
  };
  systemInfo?: {
    totalMemory: number;
    usedMemory: number;
    freeMemory: number;
    cpuCount: number;
    loadAverage: number[];
  };
}

interface PerformanceData {
  date: string;
  cpu: number;
  memory: number;
  network: number;
}

interface RecentActivity {
  id: string;
  type: 'alert' | 'warning' | 'info' | 'error';
  message: string;
  timestamp: string;
}

function Dashboard() {
  const systemRefreshInterval = useAppSelector(selectSystemMonitorRefreshInterval);
  const realTimeUpdatesEnabled = useAppSelector(selectRealTimeUpdatesEnabled);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const refreshTimerRef = useRef<number | null>(null);

  // Function to fetch dashboard data - memoized with useCallback
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Set up auto-refresh based on configuration
  useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Only set up auto-refresh if real-time updates are enabled
    if (realTimeUpdatesEnabled) {
      refreshTimerRef.current = window.setInterval(() => {
        console.log(`Auto-refreshing dashboard every ${systemRefreshInterval / 1000} seconds`);
        fetchDashboardData();
      }, systemRefreshInterval);
    }

    // Clean up on unmount
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [systemRefreshInterval, realTimeUpdatesEnabled, fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg text-gray-700">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
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
        return <AlertOctagon size={16} className="text-red-600" />;
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          <ArrowUp size={16} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* System Status */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">System Status</p>
              <p className="text-lg font-semibold capitalize">{summary?.systemStatus || 'Unknown'}</p>
            </div>
            <div
              className={`h-3 w-3 rounded-full ${getStatusColor(summary?.systemStatus || 'offline')}`}
            />
          </div>
        </div>

        {/* CPU Usage */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">CPU Usage</p>
              <p className="text-lg font-semibold">{summary?.cpuUsage || 0}%</p>
              {summary?.systemInfo && (
                <p className="text-xs text-gray-600">
                  Load: {summary.systemInfo.loadAverage[0].toFixed(2)} ({summary.systemInfo.cpuCount} cores)
                </p>
              )}
            </div>
            <Activity className={(summary?.cpuUsage || 0) > 70 ? 'text-red-500' : 'text-green-500'} />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Memory Usage</p>
              <p className="text-lg font-semibold">{summary?.memoryUsage || 0}%</p>
              {summary?.systemInfo && (
                <p className="text-xs text-gray-600">
                  {((summary.systemInfo.usedMemory) / (1024 * 1024 * 1024)).toFixed(1)} / 
                  {((summary.systemInfo.totalMemory) / (1024 * 1024 * 1024)).toFixed(1)} GB
                </p>
              )}
            </div>
            <Sliders className={(summary?.memoryUsage || 0) > 70 ? 'text-red-500' : 'text-green-500'} />
          </div>
        </div>

        {/* Uptime */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">System Uptime</p>
              <p className="text-lg font-semibold">{summary?.uptime || 'N/A'}</p>
            </div>
            <Clock className="text-blue-500" />
          </div>
        </div>
      </div>

      {/* Second Row Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Devices */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Devices</p>
              <p className="text-lg font-semibold">{summary?.devices?.total || 0}</p>
            </div>
          </div>
        </div>

        {/* Online Devices */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Online Devices</p>
              <p className="text-lg font-semibold">{summary?.devices?.online || 0}</p>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Alerts (24h)</p>
              <p className="text-lg font-semibold">{summary?.activeAlerts || 0}</p>
            </div>
            <AlertCircle className={(summary?.activeAlerts || 0) > 0 ? 'text-red-500' : 'text-gray-400'} />
          </div>
        </div>

        {/* Today's Logs */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Logs</p>
              <p className="text-lg font-semibold">{summary?.todayLogs || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
          <div className="flex space-x-2">
            <button
              className={`rounded px-3 py-1 text-sm ${
                timeframe === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setTimeframe('day')}
            >
              Day
            </button>
            <button
              className={`rounded px-3 py-1 text-sm ${
                timeframe === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setTimeframe('week')}
            >
              Week
            </button>
            <button
              className={`rounded px-3 py-1 text-sm ${
                timeframe === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setTimeframe('month')}
            >
              Month
            </button>
          </div>
        </div>

        {performanceData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="CPU %"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Memory %"
                />
                <Line
                  type="monotone"
                  dataKey="network"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Network %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-gray-500">
            <div className="text-center">
              <Activity className="mx-auto mb-2 h-12 w-12 text-gray-400" />
              <p>No performance data available</p>
              <p className="text-sm">Start monitoring devices to see metrics</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-gray-500">
            <div className="text-center">
              <Info className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>No recent activities</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;