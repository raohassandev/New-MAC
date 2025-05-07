import React from 'react';
import { Card } from '@/components/ui/Card';

interface StatusCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor?: string;
  textColor?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  icon,
  bgColor = 'bg-white',
  textColor = 'text-gray-800',
}) => {
  return (
    <Card.Root className={`${bgColor} rounded-lg shadow-sm transition-all hover:shadow-md`}>
      <Card.Content className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className={`mt-1 text-2xl font-semibold ${textColor}`}>{value}</p>
          </div>
          <div className="text-2xl">{icon}</div>
        </div>
      </Card.Content>
    </Card.Root>
  );
};

export default StatusCard;
