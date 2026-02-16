"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const Admin_1 = __importDefault(require("../../models/Admin"));
const Teacher_1 = __importDefault(require("../../models/Teacher"));
const Student_1 = __importDefault(require("../../models/Student"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const router = (0, express_1.Router)();
/**
 * Test endpoint - Get students for automated testing (no auth required)
 * This endpoint is specifically for test automation scripts
 */
router.get('/test/students', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
        // Fetch all students (cannot sort by encrypted field in database)
        const students = await Student_1.default.find().select('student_number');
        // Decrypt and prepare students for response
        const decryptedStudents = students.map(s => ({
            student_number: (0, encryption_helpers_1.safeDecrypt)(s.student_number),
            _id: s._id
        }));
        // Sort by student_number in memory (after decryption)
        decryptedStudents.sort((a, b) => {
            return a.student_number.localeCompare(b.student_number, undefined, { numeric: true });
        });
        // Apply limit if specified
        const result = limit && limit > 0
            ? decryptedStudents.slice(0, limit)
            : decryptedStudents;
        // Return only student_number (exclude _id)
        res.json(result.map(({ student_number }) => ({
            student_number
        })));
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching students for testing' });
    }
});
/**
 * Unified Staff Login - Handles both Admin and Teacher authentication
 * Automatically detects user type based on credentials
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({
                success: false,
                message: 'Please enter both username and password'
            });
            return;
        }
        // Try to find admin first
        const admin = await (0, encryption_helpers_1.findByEncryptedField)(Admin_1.default, 'username', username);
        if (admin) {
            // Verify admin password
            const isValidPassword = await bcrypt_1.default.compare(password, admin.password);
            if (!isValidPassword) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
                return;
            }
            // Update last login
            admin.last_login = new Date();
            await admin.save();
            // Set admin session
            req.session.adminId = admin._id.toString();
            req.session.username = (0, encryption_helpers_1.safeDecrypt)(admin.username);
            req.session.fullName = (0, encryption_helpers_1.safeDecrypt)(admin.full_name);
            // Clear any teacher session data
            delete req.session.teacherId;
            // Save session
            const saveSession = (retries = 3) => {
                req.session.save((err) => {
                    if (err) {
                        console.error(`Admin session save error (${4 - retries}/3 attempts):`, err.message);
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
                    res.json({
                        success: true,
                        userType: 'admin',
                        user: {
                            username: (0, encryption_helpers_1.safeDecrypt)(admin.username),
                            fullName: (0, encryption_helpers_1.safeDecrypt)(admin.full_name)
                        }
                    });
                });
            };
            saveSession();
            return;
        }
        // If not admin, try to find teacher
        const teacher = await (0, encryption_helpers_1.findByEncryptedField)(Teacher_1.default, 'username', username);
        if (teacher) {
            // Verify teacher password
            const isValidPassword = await bcrypt_1.default.compare(password, teacher.password);
            if (!isValidPassword) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
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
            // Update last login
            teacher.last_login = new Date();
            await teacher.save();
            // Set teacher session
            req.session.teacherId = teacher._id.toString();
            // Clear any admin session data
            delete req.session.adminId;
            delete req.session.username;
            delete req.session.fullName;
            // Save session
            const saveSession = (retries = 3) => {
                req.session.save((err) => {
                    if (err) {
                        console.error(`Teacher session save error (${4 - retries}/3 attempts):`, err.message);
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
                    res.json({
                        success: true,
                        userType: 'teacher',
                        user: {
                            fullName: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name),
                            employeeId: (0, encryption_helpers_1.safeDecrypt)(teacher.employee_id)
                        }
                    });
                });
            };
            saveSession();
            return;
        }
        // If neither admin nor teacher found
        res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    }
    catch (error) {
        console.error('Error during staff login:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again.'
        });
    }
});
/**
 * Check authentication status
 * Returns user type and authentication state
 */
router.get('/check-auth', (req, res) => {
    if (req.session.adminId) {
        res.json({
            authenticated: true,
            userType: 'admin',
            user: {
                id: req.session.adminId,
                username: req.session.username,
                fullName: req.session.fullName
            }
        });
    }
    else if (req.session.teacherId) {
        res.json({
            authenticated: true,
            userType: 'teacher',
            user: {
                id: req.session.teacherId
            }
        });
    }
    else {
        res.json({
            authenticated: false,
            userType: null,
            user: null
        });
    }
});
/**
 * Staff Logout - Clears both admin and teacher sessions
 */
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