// DeviceType interface
export interface IDeviceType {
  _id?: string;
  name: string;
  description?: string;
  category?: string;
  specifications?: any;
  createdBy?: {
    userId?: string;
    username?: string;
    email?: string;
    organization?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export default IDeviceType;
