"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Student_1 = __importDefault(require("../../models/Student"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Fetch all students (cannot sort by encrypted field in database)
        const studentsRaw = await Student_1.default.find().populate('program_id');
        // Decrypt fields and prepare for admin viewing
        const students = studentsRaw.map(s => {
            const student = s.toObject();
            // Also decrypt populated program fields
            const program = student.program_id ? {
                ...student.program_id,
                name: (0, encryption_helpers_1.safeDecrypt)(student.program_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(student.program_id.code)
            } : student.program_id;
            return {
                ...student,
                student_number: (0, encryption_helpers_1.safeDecrypt)(student.student_number),
                year_level: (0, encryption_helpers_1.safeDecrypt)(student.year_level),
                section: (0, encryption_helpers_1.safeDecrypt)(student.section),
                status: (0, encryption_helpers_1.safeDecrypt)(student.status),
                program_id: program
            };
        });
        // Sort by student_number in memory (after decryption)
        students.sort((a, b) => a.student_number.localeCompare(b.student_number, undefined, { numeric: true }));
        // Apply pagination in memory
        const totalCount = students.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedStudents = students.slice(skip, skip + limit);
        res.json({
            students: paginatedStudents,
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
        res.status(500).json({ error: 'Error fetching students' });
    }
});
router.post('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before saving
        const studentData = {
            ...req.body,
            student_number: (0, encryption_helpers_1.safeEncrypt)(req.body.student_number),
            year_level: (0, encryption_helpers_1.safeEncrypt)(req.body.year_level),
            section: (0, encryption_helpers_1.safeEncrypt)(req.body.section),
            status: (0, encryption_helpers_1.safeEncrypt)(req.body.status)
        };
        const student = await Student_1.default.create(studentData);
        // Decrypt for response to admin
        const response = {
            ...student.toObject(),
            student_number: (0, encryption_helpers_1.safeDecrypt)(student.student_number),
            year_level: (0, encryption_helpers_1.safeDecrypt)(student.year_level),
            section: (0, encryption_helpers_1.safeDecrypt)(student.section),
            status: (0, encryption_helpers_1.safeDecrypt)(student.status)
        };
        res.json({ success: true, student: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before updating
        const studentData = {
            ...req.body,
            student_number: (0, encryption_helpers_1.safeEncrypt)(req.body.student_number),
            year_level: (0, encryption_helpers_1.safeEncrypt)(req.body.year_level),
            section: (0, encryption_helpers_1.safeEncrypt)(req.body.section),
            status: (0, encryption_helpers_1.safeEncrypt)(req.body.status)
        };
        const student = await Student_1.default.findByIdAndUpdate(req.params.id, studentData, { new: true });
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        // Decrypt for response to admin
        const response = {
            ...student.toObject(),
            student_number: (0, encryption_helpers_1.safeDecrypt)(student.student_number),
            year_level: (0, encryption_helpers_1.safeDecrypt)(student.year_level),
            section: (0, encryption_helpers_1.safeDecrypt)(student.section),
            status: (0, encryption_helpers_1.safeDecrypt)(student.status)
        };
        res.json({ success: true, student: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.delete('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        await Student_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=students.js.map