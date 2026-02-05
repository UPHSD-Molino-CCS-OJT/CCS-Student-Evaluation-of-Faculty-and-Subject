const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    full_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        trim: true
    },
    last_login: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'admins'
});

module.exports = mongoose.model('Admin', adminSchema);
