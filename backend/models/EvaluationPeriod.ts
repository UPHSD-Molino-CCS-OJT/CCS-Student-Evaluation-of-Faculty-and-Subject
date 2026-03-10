import mongoose, { Schema, Model } from 'mongoose';
import { IEvaluationPeriod } from '../types';

const evaluationPeriodSchema = new Schema<IEvaluationPeriod>({
  academic_year: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: String,
    required: true,
    enum: ['1st Semester', '2nd Semester', 'Summer'],
    trim: true
  },
  is_active: {
    type: Boolean,
    default: false,
    index: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'evaluation_periods'
});

// Index for faster queries on active periods
evaluationPeriodSchema.index({ academic_year: 1, semester: 1 });
evaluationPeriodSchema.index({ is_active: 1 });

// Ensure only one active period at a time
evaluationPeriodSchema.pre('save', async function(next) {
  if (this.is_active && this.isModified('is_active')) {
    // Deactivate all other periods
    await mongoose.model('EvaluationPeriod').updateMany(
      { _id: { $ne: this._id } },
      { $set: { is_active: false } }
    );
  }
  next();
});

const EvaluationPeriod: Model<IEvaluationPeriod> = mongoose.model<IEvaluationPeriod>('EvaluationPeriod', evaluationPeriodSchema);

export default EvaluationPeriod;
