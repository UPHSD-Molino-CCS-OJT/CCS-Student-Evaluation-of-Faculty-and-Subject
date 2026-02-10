const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    student_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    program_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: true
    },
    year_level: {
        type: String,
        enum: ['1st', '2nd', '3rd', '4th'],
        required: true
    },
    section: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Regular', 'Irregular'],
        default: 'Regular'
    }
}, {
    timestamps: true,
    collection: 'students'
});

module.exports = mongoose.model('Student', studentSchema);
