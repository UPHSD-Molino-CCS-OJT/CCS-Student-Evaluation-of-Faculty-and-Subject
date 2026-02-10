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
        enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
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
