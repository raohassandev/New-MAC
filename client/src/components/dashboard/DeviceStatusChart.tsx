import * as Tooltip from '@radix-ui/react-tooltip';
import { Card } from '@/components/ui/Card';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface DeviceStatusChartProps {
  online: number;
  offline: number;
}

const DeviceStatusChart = ({ online, offline }: DeviceStatusChartProps) => {
  const data = [
    { name: 'Online', value: online, color: '#10b981' }, // green
    { name: 'Offline', value: offline, color: '#ef4444' }, // red
  ];

  // Only show the chart if we have devices to display
  if (online + offline === 0) {
    return (
      <Card.Root className="h-48 rounded bg-gray-50">
        <Card.Content className="flex h-full items-center justify-center">
          <p className="text-gray-500">No device data available</p>
        </Card.Content>
      </Card.Root>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip.Provider>
            {data.map((entry, index) => (
              <Tooltip.Root key={`tooltip-${index}`}>
                <Tooltip.Trigger asChild>
                  <g></g> {/* Empty group to attach tooltip to pie segments */}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="rounded-md bg-white px-3 py-2 text-sm shadow-md"
                    sideOffset={5}
                  >
                    <div>
                      <span className="font-medium">{entry.name}</span>: {entry.value} devices
                    </div>
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ))}
          </Tooltip.Provider>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DeviceStatusChart;
