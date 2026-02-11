import mongoose, { Schema, Model } from 'mongoose';
import { ITeacher } from '../types';

const teacherSchema = new Schema<ITeacher>({
  full_name: {
    type: String,
    required: true
  },
  employee_id: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    trim: true
  },
  department: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true,
  collection: 'teachers'
});

const Teacher: Model<ITeacher> = mongoose.model<ITeacher>('Teacher', teacherSchema);

export default Teacher;
