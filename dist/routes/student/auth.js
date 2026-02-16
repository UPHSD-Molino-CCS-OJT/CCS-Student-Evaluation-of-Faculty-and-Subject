"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Student_1 = __importDefault(require("../../models/Student"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const router = (0, express_1.Router)();
// Check if student is authenticated
router.get('/check-auth', (req, res) => {
    res.json({
        authenticated: !!req.session.studentId,
        student: req.session.studentId ? {
            id: req.session.studentId
        } : null
    });
});
// Student Login
router.post('/login', async (req, res) => {
    try {
        const { student_number } = req.body;
        if (!student_number) {
            res.status(400).json({
                success: false,
                message: 'Please enter your School ID'
            });
            return;
        }
        // Find student by encrypted student_number field
        // Must fetch and decrypt because student_number is encrypted at rest
        const student = await (0, encryption_helpers_1.findByEncryptedField)(Student_1.default, 'student_number', student_number);
        // Populate program_id after finding the student
        if (student) {
            await student.populate('program_id');
        }
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'School ID not found. Please check your ID and try again.'
            });
            return;
        }
        // Store ONLY student ObjectId in session (never student_number for privacy)
        req.session.studentId = student._id.toString();
        // Save session with retry mechanism (helps during parallel testing)
        const saveSession = (retries = 3) => {
            req.session.save((err) => {
                if (err) {
                    console.error(`Session save error (${4 - retries}/3 attempts):`, err.message);
                    if (retries > 1) {
                        // Retry after 100ms delay
                        setTimeout(() => saveSession(retries - 1), 100);
                        return;
                    }
                    res.status(500).json({
                        success: false,
                        message: 'Session initialization failed. Please try again.'
                    });
                    return;
                }
                res.json({ success: true });
            });
        };
        saveSession();
    }
    catch (error) {
        console.error('Error during student login:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again.'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map