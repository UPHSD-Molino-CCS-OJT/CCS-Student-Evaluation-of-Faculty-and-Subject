"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Teacher_1 = __importDefault(require("../../models/Teacher"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Fetch all teachers (cannot sort by encrypted field in database)
        const teachersRaw = await Teacher_1.default.find();
        // Decrypt fields and prepare for admin viewing
        const teachers = teachersRaw.map(t => {
            const teacher = t.toObject();
            return {
                ...teacher,
                full_name: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name),
                employee_id: (0, encryption_helpers_1.safeDecrypt)(teacher.employee_id),
                email: (0, encryption_helpers_1.safeDecrypt)(teacher.email),
                department: (0, encryption_helpers_1.safeDecrypt)(teacher.department),
                status: (0, encryption_helpers_1.safeDecrypt)(teacher.status)
            };
        });
        // Sort by full_name in memory (after decryption)
        teachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
        // Apply pagination in memory
        const totalCount = teachers.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedTeachers = teachers.slice(skip, skip + limit);
        res.json({
            teachers: paginatedTeachers,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching teachers' });
    }
});
router.post('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before saving
        const teacherData = {
            ...req.body,
            full_name: (0, encryption_helpers_1.safeEncrypt)(req.body.full_name),
            employee_id: (0, encryption_helpers_1.safeEncrypt)(req.body.employee_id),
            email: (0, encryption_helpers_1.safeEncrypt)(req.body.email),
            department: (0, encryption_helpers_1.safeEncrypt)(req.body.department),
            status: (0, encryption_helpers_1.safeEncrypt)(req.body.status)
        };
        const teacher = await Teacher_1.default.create(teacherData);
        // Decrypt for response to admin
        const response = {
            ...teacher.toObject(),
            full_name: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name),
            employee_id: (0, encryption_helpers_1.safeDecrypt)(teacher.employee_id),
            email: (0, encryption_helpers_1.safeDecrypt)(teacher.email),
            department: (0, encryption_helpers_1.safeDecrypt)(teacher.department),
            status: (0, encryption_helpers_1.safeDecrypt)(teacher.status)
        };
        res.json({ success: true, teacher: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before updating
        const teacherData = {
            ...req.body,
            full_name: (0, encryption_helpers_1.safeEncrypt)(req.body.full_name),
            employee_id: (0, encryption_helpers_1.safeEncrypt)(req.body.employee_id),
            email: (0, encryption_helpers_1.safeEncrypt)(req.body.email),
            department: (0, encryption_helpers_1.safeEncrypt)(req.body.department),
            status: (0, encryption_helpers_1.safeEncrypt)(req.body.status)
        };
        const teacher = await Teacher_1.default.findByIdAndUpdate(req.params.id, teacherData, { new: true });
        if (!teacher) {
            res.status(404).json({ message: 'Teacher not found' });
            return;
        }
        // Decrypt for response to admin
        const response = {
            ...teacher.toObject(),
            full_name: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name),
            employee_id: (0, encryption_helpers_1.safeDecrypt)(teacher.employee_id),
            email: (0, encryption_helpers_1.safeDecrypt)(teacher.email),
            department: (0, encryption_helpers_1.safeDecrypt)(teacher.department),
            status: (0, encryption_helpers_1.safeDecrypt)(teacher.status)
        };
        res.json({ success: true, teacher: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.delete('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        await Teacher_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=teachers.js.map