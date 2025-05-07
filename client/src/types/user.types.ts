export interface User {
  _id: string;
  id?: string;
  name: string;
  username?: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
