import mongoose, { Schema, Model } from 'mongoose';
import { IEvaluation } from '../types';

const evaluationSchema = new Schema<IEvaluation>({
  school_year: {
    type: String,
    required: true
  },
  anonymous_token: {
    type: String,
    required: true,
    unique: true,
    index: true
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
  status: {
    type: String,
    enum: ['Regular', 'Irregular', 'Transferee'],
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
    default: null
  },
  
  // Teacher ratings (6 criteria)
  teacher_diction: { type: Number, required: true, min: 1, max: 5 },
  teacher_grammar: { type: Number, required: true, min: 1, max: 5 },
  teacher_personality: { type: Number, required: true, min: 1, max: 5 },
  teacher_disposition: { type: Number, required: true, min: 1, max: 5 },
  teacher_dynamic: { type: Number, required: true, min: 1, max: 5 },
  teacher_fairness: { type: Number, required: true, min: 1, max: 5 },
  
  // Learning process ratings (13 criteria)
  learning_motivation: { type: Number, required: true, min: 1, max: 5 },
  learning_critical_thinking: { type: Number, required: true, min: 1, max: 5 },
  learning_organization: { type: Number, required: true, min: 1, max: 5 },
  learning_interest: { type: Number, required: true, min: 1, max: 5 },
  learning_explanation: { type: Number, required: true, min: 1, max: 5 },
  learning_clarity: { type: Number, required: true, min: 1, max: 5 },
  learning_integration: { type: Number, required: true, min: 1, max: 5 },
  learning_mastery: { type: Number, required: true, min: 1, max: 5 },
  learning_methodology: { type: Number, required: true, min: 1, max: 5 },
  learning_values: { type: Number, required: true, min: 1, max: 5 },
  learning_grading: { type: Number, required: true, min: 1, max: 5 },
  learning_synthesis: { type: Number, required: true, min: 1, max: 5 },
  learning_reasonableness: { type: Number, required: true, min: 1, max: 5 },
  
  // Classroom management ratings (6 criteria)
  classroom_attendance: { type: Number, required: true, min: 1, max: 5 },
  classroom_policies: { type: Number, required: true, min: 1, max: 5 },
  classroom_discipline: { type: Number, required: true, min: 1, max: 5 },
  classroom_authority: { type: Number, required: true, min: 1, max: 5 },
  classroom_prayers: { type: Number, required: true, min: 1, max: 5 },
  classroom_punctuality: { type: Number, required: true, min: 1, max: 5 },
  
  comments: { type: String, default: '' },
  ip_address: { type: String },
  submitted_at: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'evaluations'
});

const Evaluation: Model<IEvaluation> = mongoose.model<IEvaluation>('Evaluation', evaluationSchema);

export default Evaluation;
