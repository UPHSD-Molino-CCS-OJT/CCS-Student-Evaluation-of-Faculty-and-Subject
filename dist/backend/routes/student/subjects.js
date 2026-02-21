"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Student_1 = __importDefault(require("../../models/Student"));
const Enrollment_1 = __importDefault(require("../../models/Enrollment"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const router = (0, express_1.Router)();
// Get student subjects/enrollments
router.get('/', async (req, res) => {
    try {
        if (!req.session.studentId) {
            res.json({ authenticated: false });
            return;
        }
        const student = await Student_1.default.findById(req.session.studentId).populate('program_id');
        if (!student) {
            res.json({ authenticated: false });
            return;
        }
        const enrollments = await Enrollment_1.default.find({ student_id: student._id })
            .populate('course_id')
            .populate('teacher_id');
        // Decrypt enrollment and populated fields
        const decryptedEnrollments = enrollments.map(e => {
            const enrollment = e.toObject();
            // Decrypt enrollment fields
            const decryptedEnrollment = {
                ...enrollment,
                section_code: (0, encryption_helpers_1.safeDecrypt)(enrollment.section_code),
                school_year: (0, encryption_helpers_1.safeDecrypt)(enrollment.school_year),
                semester: (0, encryption_helpers_1.safeDecrypt)(enrollment.semester)
            };
            // Decrypt populated course fields
            if (enrollment.course_id) {
                decryptedEnrollment.course_id = {
                    ...enrollment.course_id,
                    name: (0, encryption_helpers_1.safeDecrypt)(enrollment.course_id.name),
                    code: (0, encryption_helpers_1.safeDecrypt)(enrollment.course_id.code)
                };
            }
            // Decrypt populated teacher fields
            if (enrollment.teacher_id) {
                decryptedEnrollment.teacher_id = {
                    ...enrollment.teacher_id,
                    full_name: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.full_name),
                    employee_id: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.employee_id),
                    email: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.email),
                    department: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.department),
                    status: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.status)
                };
            }
            return decryptedEnrollment;
        });
        // Sort by course name in memory (after decryption)
        decryptedEnrollments.sort((a, b) => {
            const nameA = a.course_id?.name || '';
            const nameB = b.course_id?.name || '';
            return nameA.localeCompare(nameB);
        });
        // Decrypt populated program for student
        const studentObj = student.toObject();
        const decryptedProgram = studentObj.program_id ? {
            ...studentObj.program_id,
            name: (0, encryption_helpers_1.safeDecrypt)(studentObj.program_id.name),
            code: (0, encryption_helpers_1.safeDecrypt)(studentObj.program_id.code)
        } : studentObj.program_id;
        res.json({
            authenticated: true,
            student: {
                program: decryptedProgram,
                year_level: (0, encryption_helpers_1.safeDecrypt)(student.year_level)
            },
            enrollments: decryptedEnrollments.map(e => ({
                _id: e._id,
                has_evaluated: e.has_evaluated,
                course: e.course_id,
                teacher: e.teacher_id,
                school_year: e.school_year,
                semester: e.semester,
                section_code: e.section_code
            }))
        });
    }
    catch (error) {
        console.error('Error loading student subjects:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading subjects'
        });
    }
});
// Get enrollment details for evaluation
router.get('/:enrollmentId', async (req, res) => {
    try {
        if (!req.session.studentId) {
            res.json({ success: false, message: 'Please login first' });
            return;
        }
        const enrollment = await Enrollment_1.default.findById(req.params.enrollmentId)
            .populate('student_id')
            .populate({
            path: 'course_id',
            populate: { path: 'program_id' }
        })
            .populate('teacher_id');
        if (!enrollment) {
            res.json({ success: false, message: 'Enrollment not found' });
            return;
        }
        // Verify enrollment belongs to logged-in student
        if (enrollment.student_id._id.toString() !== req.session.studentId) {
            res.json({ success: false, message: 'Unauthorized access' });
            return;
        }
        if (enrollment.has_evaluated) {
            res.json({ success: false, message: 'You have already evaluated this subject' });
            return;
        }
        // Decrypt enrollment and populated fields for student viewing
        const enrollmentObj = enrollment.toObject();
        // Decrypt course fields (including nested program)
        const course = enrollmentObj.course_id ? {
            ...enrollmentObj.course_id,
            name: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.course_id.name),
            code: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.course_id.code),
            program_id: enrollmentObj.course_id.program_id ? {
                ...enrollmentObj.course_id.program_id,
                name: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.course_id.program_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.course_id.program_id.code)
            } : enrollmentObj.course_id.program_id
        } : enrollmentObj.course_id;
        // Decrypt teacher fields
        const teacher = enrollmentObj.teacher_id ? {
            ...enrollmentObj.teacher_id,
            full_name: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.full_name),
            employee_id: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.employee_id),
            email: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.email),
            department: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.department),
            status: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.status)
        } : enrollmentObj.teacher_id;
        res.json({
            success: true,
            enrollment: {
                _id: enrollment._id,
                course,
                teacher,
                has_evaluated: enrollment.has_evaluated,
                section_code: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.section_code),
                school_year: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.school_year),
                semester: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.semester)
            }
        });
    }
    catch (error) {
        console.error('Error loading enrollment:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading enrollment data'
        });
    }
});
exports.default = router;
//# sourceMappingURL=subjects.js.map