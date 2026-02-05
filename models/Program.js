const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    code: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'programs'
});

module.exports = mongoose.model('Program', programSchema);
