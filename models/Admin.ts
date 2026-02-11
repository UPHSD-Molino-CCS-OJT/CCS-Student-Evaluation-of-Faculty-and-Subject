import mongoose, { Schema, Model } from 'mongoose';
import { IAdmin } from '../types';

const adminSchema = new Schema<IAdmin>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true
  },
  last_login: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'admins'
});

const Admin: Model<IAdmin> = mongoose.model<IAdmin>('Admin', adminSchema);

export default Admin;
