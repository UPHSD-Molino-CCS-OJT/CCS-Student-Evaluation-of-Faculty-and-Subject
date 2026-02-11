import mongoose, { Schema, Model } from 'mongoose';
import { ICourse } from '../types';

const courseSchema = new Schema<ICourse>({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  program_id: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  }
}, {
  timestamps: true,
  collection: 'courses'
});

const Course: Model<ICourse> = mongoose.model<ICourse>('Course', courseSchema);

export default Course;
