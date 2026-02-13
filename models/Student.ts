import mongoose, { Schema, Model } from 'mongoose';
import { IStudent } from '../types';

const studentSchema = new Schema<IStudent>({
  student_number: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true,
    unique: true
  },
  program_id: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  year_level: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true
  },
  section: {
    type: Schema.Types.Mixed // Encrypted field
  },
  status: {
    type: Schema.Types.Mixed, // Encrypted field
    default: 'Regular'
  }
}, {
  timestamps: true,
  collection: 'students'
});

const Student: Model<IStudent> = mongoose.model<IStudent>('Student', studentSchema);

export default Student;
