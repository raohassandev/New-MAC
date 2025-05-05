import mongoose, { Document, Schema } from 'mongoose';

import * as bcrypt from 'bcryptjs';

export type UserRole = 'user' | 'engineer' | 'admin' | 'template_manager';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  permissions: string[];
  organization?: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'engineer', 'admin', 'template_manager'], default: 'user', required: false },
  permissions: [{ type: String }],
  organization: { type: String, required: false },
  department: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre('save', async function (this: IUser, next) {
  this.updatedAt = new Date();

  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next(null); // Fixed: pass null instead of nothing

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next(null); // Fixed: pass null instead of nothing
  } catch (err) {
    next(err as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
