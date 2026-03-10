import mongoose, { Schema, Model } from 'mongoose';
import { IEvaluation } from '../types';

const evaluationSchema = new Schema<IEvaluation>({
  school_year: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true
  },
  anonymous_token: {
    type: String, // Not encrypted - used for anonymity logic
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
    type: Schema.Types.Mixed, // Encrypted field
    required: true
  },
  status: {
    type: Schema.Types.Mixed, // Encrypted field
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
  
  // Comments: AES-256-GCM encrypted only (no plaintext support)
  comments: { type: Schema.Types.Mixed, default: '' },
  ip_address: { type: String },
  submitted_at: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'evaluations',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual property for teacher average
evaluationSchema.virtual('teacher_average').get(function() {
  return (
    this.teacher_diction +
    this.teacher_grammar +
    this.teacher_personality +
    this.teacher_disposition +
    this.teacher_dynamic +
    this.teacher_fairness
  ) / 6;
});

// Virtual property for learning process average
evaluationSchema.virtual('learning_average').get(function() {
  return (
    this.learning_motivation +
    this.learning_critical_thinking +
    this.learning_organization +
    this.learning_interest +
    this.learning_explanation +
    this.learning_clarity +
    this.learning_integration +
    this.learning_mastery +
    this.learning_methodology +
    this.learning_values +
    this.learning_grading +
    this.learning_synthesis +
    this.learning_reasonableness
  ) / 13;
});

// Virtual property for classroom management average
evaluationSchema.virtual('classroom_average').get(function() {
  return (
    this.classroom_attendance +
    this.classroom_policies +
    this.classroom_discipline +
    this.classroom_authority +
    this.classroom_prayers +
    this.classroom_punctuality
  ) / 6;
});

// Virtual property for overall average
evaluationSchema.virtual('overall_average').get(function() {   const teacherAvg = (
    this.teacher_diction +
    this.teacher_grammar +
    this.teacher_personality +
    this.teacher_disposition +
    this.teacher_dynamic +
    this.teacher_fairness
  ) / 6;
  
  const learningAvg = (
    this.learning_motivation +
    this.learning_critical_thinking +
    this.learning_organization +
    this.learning_interest +
    this.learning_explanation +
    this.learning_clarity +
    this.learning_integration +
    this.learning_mastery +
    this.learning_methodology +
    this.learning_values +
    this.learning_grading +
    this.learning_synthesis +
    this.learning_reasonableness
  ) / 13;
  
  const classroomAvg = (
    this.classroom_attendance +
    this.classroom_policies +
    this.classroom_discipline +
    this.classroom_authority +
    this.classroom_prayers +
    this.classroom_punctuality
  ) / 6;
  
  return (teacherAvg + learningAvg + classroomAvg) / 3;
});

const Evaluation: Model<IEvaluation> = mongoose.model<IEvaluation>('Evaluation', evaluationSchema);

export default Evaluation;
