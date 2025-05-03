import Alert from './Alert';
import Device from './Device';
import DeviceType from './DeviceType';
import Profile from './Profile';
import Template from './Template';
import User from './User';

// Export models
export { User, Device, Profile, Alert, Template, DeviceType };

// Export interfaces
export type { IUser } from './User';
export type { IDevice, IRegister } from './Device';
export type { ITemplate } from './Template';
export type { IDeviceType } from './DeviceType';
export type { IProfile, ISchedule, IScheduleTime } from './Profile';
export type { IAlert } from './Alert';
