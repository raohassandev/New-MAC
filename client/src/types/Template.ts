// Template interface
export interface ITemplate {
  _id?: string;
  name: string;
  make?: string;
  model?: string;
  description?: string;
  enabled?: boolean;
  tags?: string[];
  connectionSetting?: any;
  dataPoints?: any[];
  deviceType: string;
  isTemplate?: boolean;
  isVerified?: boolean;
  visibility?: 'public' | 'private' | 'organization';
  createdBy?: {
    userId: string;
    username: string;
    email: string;
    organization?: string;
  };
  usageCount?: number;
  rating?: {
    average: number;
    count: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export default ITemplate;