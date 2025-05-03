export interface ScheduleTime {
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  startTime: string;
  endTime: string;
}

export interface Schedule {
  active: boolean;
  times: ScheduleTime[];
}

export interface Profile {
  _id: string;
  name: string;
  description?: string;
  targetTemperature: number;
  temperatureRange: [number, number];
  fanSpeed: number;
  mode: 'cooling' | 'heating' | 'auto' | 'dehumidify';
  schedule?: Schedule;
  assignedDevices?: string[];
  isTemplate?: boolean;
  tags?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
