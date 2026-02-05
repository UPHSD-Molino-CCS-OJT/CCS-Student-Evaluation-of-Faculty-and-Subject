const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
    school_year: {
        type: String,
        required: true,
        trim: true
    },
    student_number: {
        type: String,
        required: true,
        trim: true
    },
    program_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        default: null
    },
    year_level: {
        type: String,
        required: true,
        enum: ['1st', '2nd', '3rd', '4th']
    },
    status: {
        type: String,
        required: true,
        enum: ['Regular', 'Irregular']
    },
    course_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    
    // The Teacher ratings
    teacher_diction: { type: Number, required: true, min: 1, max: 5 },
    teacher_grammar: { type: Number, required: true, min: 1, max: 5 },
    teacher_personality: { type: Number, required: true, min: 1, max: 5 },
    teacher_disposition: { type: Number, required: true, min: 1, max: 5 },
    teacher_dynamic: { type: Number, required: true, min: 1, max: 5 },
    teacher_fairness: { type: Number, required: true, min: 1, max: 5 },
    
    // Learning Process ratings
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
    
    // Classroom Management ratings
    classroom_attendance: { type: Number, required: true, min: 1, max: 5 },
    classroom_policies: { type: Number, required: true, min: 1, max: 5 },
    classroom_discipline: { type: Number, required: true, min: 1, max: 5 },
    classroom_authority: { type: Number, required: true, min: 1, max: 5 },
    classroom_prayers: { type: Number, required: true, min: 1, max: 5 },
    classroom_punctuality: { type: Number, required: true, min: 1, max: 5 },
    
    // Comments
    comments: {
        type: String,
        default: ''
    },
    
    // Metadata
    submitted_at: {
        type: Date,
        default: Date.now
    },
    ip_address: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'evaluations'
});

// Indexes for better query performance
evaluationSchema.index({ student_number: 1 });
evaluationSchema.index({ teacher_id: 1 });
evaluationSchema.index({ school_year: 1 });
evaluationSchema.index({ submitted_at: -1 });

module.exports = mongoose.model('Evaluation', evaluationSchema);
