"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Course_1 = __importDefault(require("../../models/Course"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Fetch all courses (cannot sort by encrypted field in database)
        const coursesRaw = await Course_1.default.find().populate('program_id');
        // Decrypt fields and prepare for admin viewing
        const courses = coursesRaw.map(c => {
            const course = c.toObject();
            // Also decrypt populated program fields
            const program = course.program_id ? {
                ...course.program_id,
                name: (0, encryption_helpers_1.safeDecrypt)(course.program_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(course.program_id.code)
            } : course.program_id;
            return {
                ...course,
                name: (0, encryption_helpers_1.safeDecrypt)(course.name),
                code: (0, encryption_helpers_1.safeDecrypt)(course.code),
                program_id: program
            };
        });
        // Sort by name in memory (after decryption)
        courses.sort((a, b) => a.name.localeCompare(b.name));
        // Apply pagination in memory
        const totalCount = courses.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedCourses = courses.slice(skip, skip + limit);
        res.json({
            courses: paginatedCourses,
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
        res.status(500).json({ error: 'Error fetching courses' });
    }
});
router.post('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before saving
        const courseData = {
            ...req.body,
            name: (0, encryption_helpers_1.safeEncrypt)(req.body.name),
            code: (0, encryption_helpers_1.safeEncrypt)(req.body.code)
        };
        const course = await Course_1.default.create(courseData);
        // Decrypt for response to admin
        const response = {
            ...course.toObject(),
            name: (0, encryption_helpers_1.safeDecrypt)(course.name),
            code: (0, encryption_helpers_1.safeDecrypt)(course.code)
        };
        res.json({ success: true, course: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before updating
        const courseData = {
            ...req.body,
            name: (0, encryption_helpers_1.safeEncrypt)(req.body.name),
            code: (0, encryption_helpers_1.safeEncrypt)(req.body.code)
        };
        const course = await Course_1.default.findByIdAndUpdate(req.params.id, courseData, { new: true });
        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }
        // Decrypt for response to admin
        const response = {
            ...course.toObject(),
            name: (0, encryption_helpers_1.safeDecrypt)(course.name),
            code: (0, encryption_helpers_1.safeDecrypt)(course.code)
        };
        res.json({ success: true, course: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.delete('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        await Course_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=courses.js.map