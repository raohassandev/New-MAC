import mongoose, { Document, Schema } from 'mongoose';

// Define interfaces for the schedule documents

export interface IScheduleRule {
  startTime: string;  // Format: "HH:MM" (24-hour format)
  endTime: string;    // Format: "HH:MM" (24-hour format)
  setpoint: number;
  days: string[];  // ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] or ["Weekday", "Weekend"] or specific dates
  enabled: boolean;
  parameter?: string;  // which parameter to control (e.g., "Temperature", "Humidity")
  registerAddress?: number;  // Modbus register address for the setpoint
  returnToDefault?: boolean;  // Whether to return to default value after end time
  defaultSetpoint?: number;   // Default value to return to after end time
}

export interface IScheduleTemplate extends Document {
  name: string;
  description?: string;
  type: 'daily' | 'weekly' | 'custom' | 'event';
  rules: IScheduleRule[];
  createdBy?: {
    userId: mongoose.Types.ObjectId | string;
    username: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;  // Whether other users can see/use this template
}

export interface IDeviceSchedule extends Document {
  deviceId: mongoose.Types.ObjectId | string;
  templateId: mongoose.Types.ObjectId | string;
  customRules?: IScheduleRule[];  // Override or additional rules specific to this device
  active: boolean;
  startDate?: Date;
  endDate?: Date;
  createdBy?: {
    userId: mongoose.Types.ObjectId | string;
    username: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastApplied?: Date;
  currentActiveRule?: {
    startTime: string;
    endTime: string;
    setpoint: number;
    parameter?: string;
    registerAddress?: number;
  };
  nextScheduledChange?: {
    startTime: string;
    endTime: string;
    setpoint: number;
    parameter?: string;
    registerAddress?: number;
  };
}

// Schema for schedule rules (embedded in templates and device schedules)
const ScheduleRuleSchema = new Schema({
  startTime: {
    type: String,
    required: [true, 'Start time is required in format HH:MM'],
    validate: {
      validator: function(v: string) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid time format! Use HH:MM (24-hour format)`
    }
  },
  endTime: {
    type: String,
    required: [true, 'End time is required in format HH:MM'],
    validate: {
      validator: function(v: string) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid time format! Use HH:MM (24-hour format)`
    }
  },
  setpoint: {
    type: Number,
    required: [true, 'Setpoint value is required']
  },
  days: {
    type: [String],
    required: false,  // Make days optional for new rules
    validate: {
      validator: function(v: string[]) {
        // Allow rules without days (for initial creation)
        if (!v || v.length === 0) return true;
        
        const validDays = [
          'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 
          'Weekday', 'Weekend', 'All'
        ];
        
        // Allow specific dates in format YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        return v.every(day => validDays.includes(day) || dateRegex.test(day));
      },
      message: (props: any) => `${props.value} contains invalid day values!`
    }
  },
  enabled: {
    type: Boolean,
    default: true
  },
  parameter: {
    type: String,
    default: 'Temperature'
  },
  registerAddress: {
    type: Number
  },
  returnToDefault: {
    type: Boolean,
    default: false
  },
  defaultSetpoint: {
    type: Number
  }
});

// Schema for schedule templates
const ScheduleTemplateSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Schedule type is required'],
    enum: {
      values: ['daily', 'weekly', 'custom', 'event'],
      message: '{VALUE} is not supported as a schedule type'
    }
  },
  rules: {
    type: [ScheduleRuleSchema],
    required: [true, 'At least one schedule rule is required'],
    validate: {
      validator: function(v: any[]) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'At least one schedule rule is required'
    }
  },
  createdBy: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    email: String
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Schema for device schedules (applying templates to specific devices)
const DeviceScheduleSchema = new Schema({
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'Device ID is required']
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'ScheduleTemplate',
    required: [true, 'Template ID is required']
  },
  customRules: {
    type: [ScheduleRuleSchema],
    default: []
  },
  active: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(this: IDeviceSchedule, v: Date) {
        return !this.startDate || !v || v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  createdBy: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    email: String
  },
  lastApplied: {
    type: Date
  },
  currentActiveRule: {
    startTime: String,
    endTime: String,
    setpoint: Number,
    parameter: String,
    registerAddress: Number
  },
  nextScheduledChange: {
    startTime: String,
    endTime: String,
    setpoint: Number,
    parameter: String,
    registerAddress: Number
  }
}, { timestamps: true });

// Create indexes for better query performance
ScheduleTemplateSchema.index({ name: 1, 'createdBy.userId': 1 }, { unique: true });
DeviceScheduleSchema.index({ deviceId: 1, templateId: 1 });

// Timestamps index for efficient scheduled task processing
DeviceScheduleSchema.index({ active: 1, 'nextScheduledChange.time': 1 });

// Function to create models with specific connection
export function createScheduleModels(connection: mongoose.Connection) {
  let ScheduleTemplateModel;
  let DeviceScheduleModel;
  
  try {
    // Check if models already exist
    ScheduleTemplateModel = connection.model<IScheduleTemplate>('ScheduleTemplate');
  } catch {
    // Create model if it doesn't exist
    ScheduleTemplateModel = connection.model<IScheduleTemplate>('ScheduleTemplate', ScheduleTemplateSchema);
  }
  
  try {
    // Check if models already exist
    DeviceScheduleModel = connection.model<IDeviceSchedule>('DeviceSchedule');
  } catch {
    // Create model if it doesn't exist
    DeviceScheduleModel = connection.model<IDeviceSchedule>('DeviceSchedule', DeviceScheduleSchema);
  }
  
  return {
    ScheduleTemplate: ScheduleTemplateModel,
    DeviceSchedule: DeviceScheduleModel
  };
}

// Default models (will be replaced by client-specific models in runtime)
export const ScheduleTemplate = mongoose.model<IScheduleTemplate>('ScheduleTemplate', ScheduleTemplateSchema);
export const DeviceSchedule = mongoose.model<IDeviceSchedule>('DeviceSchedule', DeviceScheduleSchema);

export default {
  ScheduleTemplate,
  DeviceSchedule
};