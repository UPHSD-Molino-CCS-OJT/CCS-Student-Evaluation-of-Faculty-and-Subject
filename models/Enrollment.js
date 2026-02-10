const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    course_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    section_code: {
        type: String,
        required: true,
        trim: true
    },
    school_year: {
        type: String,
        required: true,
        trim: true
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evaluation',
        default: null
    },
    decoupled_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'enrollments'
});

// Compound index to prevent duplicate enrollments
enrollmentSchema.index({ student_id: 1, course_id: 1, section_code: 1, school_year: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
