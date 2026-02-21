import mongoose, { Schema, Model } from 'mongoose';
import { IEnrollment } from '../types';

const enrollmentSchema = new Schema<IEnrollment>({
  student_id: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course_id: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacher_id: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  section_code: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true
  },
  school_year: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true
  },
  semester: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true
  },
  has_evaluated: {
    type: Boolean,
    default: false
  },
  submission_token: {
    type: String,
    default: null,
    sparse: true,
    index: true
  },
  submission_token_used: {
    type: Boolean,
    default: false
  },
  receipt_hash: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'enrollments'
});

const Enrollment: Model<IEnrollment> = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

export default Enrollment;
