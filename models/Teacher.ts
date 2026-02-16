import mongoose, { Schema, Model } from 'mongoose';
import { ITeacher } from '../types';

const teacherSchema = new Schema<ITeacher>({
  full_name: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true
  },
  employee_id: {
    type: Schema.Types.Mixed, // Encrypted field
    unique: true,
    sparse: true
  },
  username: {
    type: Schema.Types.Mixed, // Encrypted field
    unique: true,
    sparse: true
  },
  password: {
    type: String, // Hashed password, not encrypted
    required: true
  },
  email: {
    type: Schema.Types.Mixed // Encrypted field
  },
  department: {
    type: Schema.Types.Mixed // Encrypted field
  },
  status: {
    type: Schema.Types.Mixed, // Encrypted field
    default: 'active'
  },
  last_login: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'teachers'
});

const Teacher: Model<ITeacher> = mongoose.model<ITeacher>('Teacher', teacherSchema);

export default Teacher;
