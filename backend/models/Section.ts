import mongoose, { Schema, Model } from 'mongoose';
import { ISection } from '../types';

const sectionSchema = new Schema<ISection>({
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
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'sections'
});

const Section: Model<ISection> = mongoose.model<ISection>('Section', sectionSchema);

export default Section;
