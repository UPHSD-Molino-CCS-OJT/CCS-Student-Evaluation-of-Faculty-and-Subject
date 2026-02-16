"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Teacher_1 = __importDefault(require("../../models/Teacher"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const router = (0, express_1.Router)();
// Check if teacher is authenticated
router.get('/check-auth', (req, res) => {
    res.json({
        authenticated: !!req.session.teacherId,
        teacher: req.session.teacherId ? {
            id: req.session.teacherId
        } : null
    });
});
// Teacher Login
router.post('/login', async (req, res) => {
    try {
        const { employee_id } = req.body;
        if (!employee_id) {
            res.status(400).json({
                success: false,
                message: 'Please enter your Employee ID'
            });
            return;
        }
        // Find teacher by encrypted employee_id field
        const teacher = await (0, encryption_helpers_1.findByEncryptedField)(Teacher_1.default, 'employee_id', employee_id);
        if (!teacher) {
            res.status(404).json({
                success: false,
                message: 'Employee ID not found. Please check your ID and try again.'
            });
            return;
        }
        // Check if teacher is active
        const status = (0, encryption_helpers_1.safeDecrypt)(teacher.status);
        if (status !== 'active') {
            res.status(403).json({
                success: false,
                message: 'Your account is not active. Please contact the administrator.'
            });
            return;
        }
        // Store teacher ObjectId in session
        req.session.teacherId = teacher._id.toString();
        // Save session
        const saveSession = (retries = 3) => {
            req.session.save((err) => {
                if (err) {
                    console.error(`Session save error (${4 - retries}/3 attempts):`, err.message);
                    if (retries > 1) {
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
        console.error('Error during teacher login:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again.'
        });
    }
});
// Teacher Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).json({ success: false, message: 'Error logging out' });
            return;
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map