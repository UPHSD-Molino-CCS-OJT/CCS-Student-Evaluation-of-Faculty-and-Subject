const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        trim: true
    },
    program_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        default: null
    }
}, {
    timestamps: true,
    collection: 'courses'
});

// Compound unique index for name + program_id to prevent duplicate courses per program
courseSchema.index({ name: 1, program_id: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
