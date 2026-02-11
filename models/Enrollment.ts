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
    type: String,
    required: true
  },
  school_year: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    enum: ['1st Semester', '2nd Semester', 'Summer'],
    required: true
  },
  has_evaluated: {
    type: Boolean,
    default: false
  },
  evaluation_id: {
    type: Schema.Types.ObjectId,
    ref: 'Evaluation',
    default: null
  }
}, {
  timestamps: true,
  collection: 'enrollments'
});

const Enrollment: Model<IEnrollment> = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

export default Enrollment;
