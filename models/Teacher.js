const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    employee_id: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true,
    collection: 'teachers'
});

module.exports = mongoose.model('Teacher', teacherSchema);
