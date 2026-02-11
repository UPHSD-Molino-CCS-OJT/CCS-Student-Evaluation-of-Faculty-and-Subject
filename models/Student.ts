import mongoose, { Schema, Model } from 'mongoose';
import { IStudent } from '../types';

const studentSchema = new Schema<IStudent>({
  student_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true
  },
  program_id: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  year_level: {
    type: String,
    enum: ['1st', '2nd', '3rd', '4th'],
    required: true
  },
  section: {
    type: String
  },
  status: {
    type: String,
    enum: ['Regular', 'Irregular', 'Transferee'],
    default: 'Regular'
  }
}, {
  timestamps: true,
  collection: 'students'
});

const Student: Model<IStudent> = mongoose.model<IStudent>('Student', studentSchema);

export default Student;
