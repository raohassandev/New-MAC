import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Select from '@radix-ui/react-select';
import {
  ChevronDown,
  ChevronUp,
  Check,
  BarChart,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  CalendarRange,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/Card';

// Type definitions
type ChartType = 'line' | 'bar' | 'pie';
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
type MetricType =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'voltage'
  | 'current'
  | 'power'
  | 'energy';

interface DataPoint {
  timestamp: string;
  value: number;
}

interface DeviceDataChartProps {
  deviceId: string;
  title?: string;
  initialChartType?: ChartType;
  initialTimeRange?: TimeRange;
  initialMetric?: MetricType;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// Colors for the chart
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28'];

const DeviceDataChart: React.FC<DeviceDataChartProps> = ({
  deviceId,
  title = 'Device Data',
  initialChartType = 'line',
  initialTimeRange = '24h',
  initialMetric = 'temperature',
  isLoading = false,
  onRefresh,
}) => {
  // State management
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [metric, setMetric] = useState<MetricType>(initialMetric);
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(isLoading);

  // Mock data for demonstration - in a real app, this would come from an API
  React.useEffect(() => {
    setLoading(true);

    // Simulate API call
    const fetchData = async () => {
      // In a real app, you would fetch data from an API
      // const response = await fetch(`/api/devices/${deviceId}/data?metric=${metric}&timeRange=${timeRange}`);
      // const data = await response.json();

      // Mock data generation
      const mockData: DataPoint[] = [];
      const now = new Date();

      const getPointCount = () => {
        switch (timeRange) {
          case '1h':
            return 60;
          case '6h':
            return 72;
          case '24h':
            return 96;
          case '7d':
            return 168;
          case '30d':
            return 180;
          default:
            return 60;
        }
      };

      const getTimeIncrement = () => {
        switch (timeRange) {
          case '1h':
            return 60 * 1000; // 1 minute
          case '6h':
            return 5 * 60 * 1000; // 5 minutes
          case '24h':
            return 15 * 60 * 1000; // 15 minutes
          case '7d':
            return 60 * 60 * 1000; // 1 hour
          case '30d':
            return 4 * 60 * 60 * 1000; // 4 hours
          default:
            return 60 * 1000;
        }
      };

      const getBaseValue = () => {
        switch (metric) {
          case 'temperature':
            return 22;
          case 'humidity':
            return 50;
          case 'pressure':
            return 1013;
          case 'voltage':
            return 220;
          case 'current':
            return 5;
          case 'power':
            return 1000;
          case 'energy':
            return 500;
          default:
            return 50;
        }
      };

      const getRandomVariation = () => {
        switch (metric) {
          case 'temperature':
            return (Math.random() - 0.5) * 4;
          case 'humidity':
            return (Math.random() - 0.5) * 10;
          case 'pressure':
            return (Math.random() - 0.5) * 5;
          case 'voltage':
            return (Math.random() - 0.5) * 10;
          case 'current':
            return (Math.random() - 0.5) * 1;
          case 'power':
            return (Math.random() - 0.5) * 100;
          case 'energy':
            return (Math.random() - 0.5) * 50;
          default:
            return (Math.random() - 0.5) * 10;
        }
      };

      const pointCount = getPointCount();
      const increment = getTimeIncrement();
      const baseValue = getBaseValue();

      for (let i = 0; i < pointCount; i++) {
        const pointTime = new Date(now.getTime() - (pointCount - i) * increment);
        mockData.push({
          timestamp: pointTime.toISOString(),
          value: Math.max(0, baseValue + getRandomVariation()),
        });
      }

      setData(mockData);
      setLoading(false);
    };

    fetchData();
  }, [deviceId, metric, timeRange]);

  // Format data for different chart types
  const getFormattedData = () => {
    if (chartType === 'pie') {
      // For pie chart, we need to aggregate the data
      const sum = data.reduce((acc, point) => acc + point.value, 0);
      const avg = sum / data.length;

      // Create segments based on ranges
      return [
        { name: 'Low', value: avg * 0.8 },
        { name: 'Medium', value: avg * 0.6 },
        { name: 'High', value: avg * 0.4 },
      ];
    }

    // Format data for line and bar charts
    return data.map(point => ({
      timestamp: new Date(point.timestamp).toLocaleTimeString(),
      value: point.value,
    }));
  };

  // Get the appropriate unit for the selected metric
  const getMetricUnit = () => {
    switch (metric) {
      case 'temperature':
        return '°C';
      case 'humidity':
        return '%';
      case 'pressure':
        return 'hPa';
      case 'voltage':
        return 'V';
      case 'current':
        return 'A';
      case 'power':
        return 'W';
      case 'energy':
        return 'kWh';
      default:
        return '';
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      setLoading(true);
      // Re-fetch data
      setTimeout(() => {
        // Simulate data update
        const updatedData = [...data];
        updatedData.shift();
        const lastPoint = updatedData[updatedData.length - 1];
        const newTimestamp = new Date(
          new Date(lastPoint.timestamp).getTime() + 60000
        ).toISOString();
        updatedData.push({
          timestamp: newTimestamp,
          value: Math.max(0, lastPoint.value + (Math.random() - 0.5) * 5),
        });
        setData(updatedData);
        setLoading(false);
      }, 500);
    }
  };

  // Render the chart based on the type
  const renderChart = () => {
    const formattedData = getFormattedData();

    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">Loading data...</span>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex h-64 flex-col items-center justify-center text-gray-500">
          <Activity className="mb-2 h-10 w-10" />
          <p>No data available for the selected parameters</p>
          <button
            onClick={handleRefresh}
            className="mt-4 flex items-center rounded-md bg-blue-50 px-4 py-2 text-blue-500 hover:bg-blue-100"
          >
            <RefreshCw size={14} className="mr-2" />
            Refresh Data
          </button>
        </div>
      );
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis unit={getMetricUnit()} />
              <RechartsTooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name={metric.charAt(0).toUpperCase() + metric.slice(1)}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart
              data={formattedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis unit={getMetricUnit()} />
              <RechartsTooltip />
              <Legend />
              <Bar
                dataKey="value"
                fill="#8884d8"
                name={metric.charAt(0).toUpperCase() + metric.slice(1)}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={formattedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {formattedData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <RechartsTooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card.Root>
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="text-lg font-medium">{title}</h3>
          {loading && <RefreshCw size={16} className="ml-2 animate-spin text-blue-500" />}
        </div>

        <div className="flex space-x-2">
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={handleRefresh}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Refresh data"
                >
                  <RefreshCw size={16} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="rounded-md bg-white px-3 py-1.5 text-sm shadow-md"
                  sideOffset={5}
                >
                  Refresh data
                  <Tooltip.Arrow className="fill-white" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </Card.Header>

      <Card.Content>
        <div className="mb-4 flex flex-wrap justify-between gap-2">
          {/* Chart Type Selector - now using Radix Tabs properly */}
          <Tabs.Root value={chartType} onValueChange={value => setChartType(value as ChartType)}>
            <Tabs.List className="flex overflow-hidden rounded-md border">
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Tabs.Trigger
                      value="line"
                      className={`p-2 ${
                        chartType === 'line'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <LineChartIcon size={16} />
                    </Tabs.Trigger>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="rounded-md bg-white px-3 py-1.5 text-sm shadow-md"
                      sideOffset={5}
                    >
                      Line Chart
                      <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>

                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Tabs.Trigger
                      value="bar"
                      className={`p-2 ${
                        chartType === 'bar'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <BarChart size={16} />
                    </Tabs.Trigger>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="rounded-md bg-white px-3 py-1.5 text-sm shadow-md"
                      sideOffset={5}
                    >
                      Bar Chart
                      <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>

                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Tabs.Trigger
                      value="pie"
                      className={`p-2 ${
                        chartType === 'pie'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <PieChartIcon size={16} />
                    </Tabs.Trigger>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="rounded-md bg-white px-3 py-1.5 text-sm shadow-md"
                      sideOffset={5}
                    >
                      Pie Chart
                      <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </Tabs.List>
          </Tabs.Root>

          <div className="flex flex-wrap gap-2">
            {/* Metric Selector - now using Radix Select properly */}
            <Select.Root value={metric} onValueChange={value => setMetric(value as MetricType)}>
              <Select.Trigger
                className="inline-flex items-center justify-between rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                aria-label="Select metric"
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown size={14} />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content className="z-50 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                  <Select.ScrollUpButton className="flex h-6 cursor-default items-center justify-center bg-white text-gray-700">
                    <ChevronUp size={14} />
                  </Select.ScrollUpButton>

                  <Select.Viewport className="p-1">
                    <Select.Group>
                      <SelectItem value="temperature">Temperature</SelectItem>
                      <SelectItem value="humidity">Humidity</SelectItem>
                      <SelectItem value="pressure">Pressure</SelectItem>
                      <SelectItem value="voltage">Voltage</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="power">Power</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                    </Select.Group>
                  </Select.Viewport>

                  <Select.ScrollDownButton className="flex h-6 cursor-default items-center justify-center bg-white text-gray-700">
                    <ChevronDown size={14} />
                  </Select.ScrollDownButton>
                </Select.Content>
              </Select.Portal>
            </Select.Root>

            {/* Time Range Selector - now using Radix Select properly */}
            <Select.Root
              value={timeRange}
              onValueChange={value => setTimeRange(value as TimeRange)}
            >
              <Select.Trigger
                className="inline-flex items-center justify-between rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                aria-label="Select time range"
              >
                <CalendarRange size={14} className="mr-1" />
                <Select.Value />
                <Select.Icon>
                  <ChevronDown size={14} />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content className="z-50 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                  <Select.Viewport className="p-1">
                    <Select.Group>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="6h">Last 6 Hours</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>

        {/* Chart content */}
        <div className="mt-4">{renderChart()}</div>
      </Card.Content>
    </Card.Root>
  );
};

// Helper component for Select Item
const SelectItem = React.forwardRef<
  HTMLDivElement,
  { value: string; children: React.ReactNode; className?: string }
>(({ value, children, className, ...props }, forwardedRef) => {
  return (
    <Select.Item
      value={value}
      className={`flex cursor-pointer select-none items-center rounded-md px-6 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 ${
        className || ''
      }`}
      {...props}
      ref={forwardedRef}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center">
        <Check size={14} />
      </Select.ItemIndicator>
    </Select.Item>
  );
});

export default DeviceDataChart;
