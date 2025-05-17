// src/components/dashboard/TemperatureChart.tsx
import React from 'react';
import { Card } from '../ui';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  time: string;
  temperature: number;
}

interface TemperatureChartProps {
  data: DataPoint[];
  title?: string;
}

const TemperatureChart: React.FC<TemperatureChartProps> = ({
  data = [],
  title = 'Temperature Over Time',
}) => {
  if (!data || data.length === 0) {
    return (
      <Card className="rounded-lg bg-gray-50 p-6 text-center">
        <div>
          <div>No temperature data available</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="chart-container">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      <div className="p-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis unit="°C" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temperature" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

export default TemperatureChart;
