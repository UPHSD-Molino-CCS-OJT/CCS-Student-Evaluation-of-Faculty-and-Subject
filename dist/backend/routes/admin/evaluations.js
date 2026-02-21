"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Evaluation_1 = __importDefault(require("../../models/Evaluation"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const auth_1 = require("../../middleware/auth");
const helpers_1 = require("../helpers");
const router = (0, express_1.Router)();
router.get('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Get total count
        const totalCount = await Evaluation_1.default.countDocuments();
        const totalPages = Math.ceil(totalCount / limit);
        const evaluationsRaw = await Evaluation_1.default.find()
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-anonymous_token -ip_address')
            .lean();
        // Transform to match frontend expectation
        const evaluations = evaluationsRaw.map((evaluation) => {
            // Calculate averages (virtuals not available with .lean())
            const teacher_average = (evaluation.teacher_diction +
                evaluation.teacher_grammar +
                evaluation.teacher_personality +
                evaluation.teacher_disposition +
                evaluation.teacher_dynamic +
                evaluation.teacher_fairness) / 6;
            const learning_average = (evaluation.learning_motivation +
                evaluation.learning_critical_thinking +
                evaluation.learning_organization +
                evaluation.learning_interest +
                evaluation.learning_explanation +
                evaluation.learning_clarity +
                evaluation.learning_integration +
                evaluation.learning_mastery +
                evaluation.learning_methodology +
                evaluation.learning_values +
                evaluation.learning_grading +
                evaluation.learning_synthesis +
                evaluation.learning_reasonableness) / 13;
            const classroom_average = (evaluation.classroom_attendance +
                evaluation.classroom_policies +
                evaluation.classroom_discipline +
                evaluation.classroom_authority +
                evaluation.classroom_prayers +
                evaluation.classroom_punctuality) / 6;
            const overall_average = (teacher_average + learning_average + classroom_average) / 3;
            // Decrypt populated fields for admin viewing
            const teacher = evaluation.teacher_id ? {
                _id: evaluation.teacher_id._id,
                full_name: (0, encryption_helpers_1.safeDecrypt)(evaluation.teacher_id.full_name),
                employee_id: (0, encryption_helpers_1.safeDecrypt)(evaluation.teacher_id.employee_id)
            } : evaluation.teacher_id;
            const course = evaluation.course_id ? {
                _id: evaluation.course_id._id,
                name: (0, encryption_helpers_1.safeDecrypt)(evaluation.course_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(evaluation.course_id.code)
            } : evaluation.course_id;
            const program = evaluation.program_id ? {
                _id: evaluation.program_id._id,
                name: (0, encryption_helpers_1.safeDecrypt)(evaluation.program_id.name)
            } : evaluation.program_id;
            return {
                ...evaluation,
                school_year: (0, encryption_helpers_1.safeDecrypt)(evaluation.school_year), // Decrypt Evaluation's own encrypted field
                year_level: (0, encryption_helpers_1.safeDecrypt)(evaluation.year_level), // Decrypt Evaluation's own encrypted field
                status: (0, encryption_helpers_1.safeDecrypt)(evaluation.status), // Decrypt Evaluation's own encrypted field
                comments: (0, helpers_1.decryptCommentsField)(evaluation.comments), // Decrypt for admin viewing
                teacher,
                course,
                program,
                teacher_id: evaluation.teacher_id?._id,
                course_id: evaluation.course_id?._id,
                program_id: evaluation.program_id?._id,
                teacher_average,
                learning_average,
                classroom_average,
                overall_average
            };
        });
        res.json({
            evaluations,
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
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ error: 'Error fetching evaluations' });
    }
});
router.get('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        const evaluationRaw = await Evaluation_1.default.findById(req.params.id)
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .select('-anonymous_token -ip_address')
            .lean();
        if (!evaluationRaw) {
            res.status(404).json({ error: 'Evaluation not found' });
            return;
        }
        // Decrypt populated fields for admin viewing
        const teacher = evaluationRaw.teacher_id ? {
            _id: evaluationRaw.teacher_id._id,
            full_name: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.teacher_id.full_name),
            employee_id: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.teacher_id.employee_id)
        } : evaluationRaw.teacher_id;
        const course = evaluationRaw.course_id ? {
            _id: evaluationRaw.course_id._id,
            name: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.course_id.name),
            code: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.course_id.code)
        } : evaluationRaw.course_id;
        const program = evaluationRaw.program_id ? {
            _id: evaluationRaw.program_id._id,
            name: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.program_id.name)
        } : evaluationRaw.program_id;
        // Transform to match frontend expectation
        // Calculate averages (virtuals not available with .lean())
        const teacher_average = (evaluationRaw.teacher_diction +
            evaluationRaw.teacher_grammar +
            evaluationRaw.teacher_personality +
            evaluationRaw.teacher_disposition +
            evaluationRaw.teacher_dynamic +
            evaluationRaw.teacher_fairness) / 6;
        const learning_average = (evaluationRaw.learning_motivation +
            evaluationRaw.learning_critical_thinking +
            evaluationRaw.learning_organization +
            evaluationRaw.learning_interest +
            evaluationRaw.learning_explanation +
            evaluationRaw.learning_clarity +
            evaluationRaw.learning_integration +
            evaluationRaw.learning_mastery +
            evaluationRaw.learning_methodology +
            evaluationRaw.learning_values +
            evaluationRaw.learning_grading +
            evaluationRaw.learning_synthesis +
            evaluationRaw.learning_reasonableness) / 13;
        const classroom_average = (evaluationRaw.classroom_attendance +
            evaluationRaw.classroom_policies +
            evaluationRaw.classroom_discipline +
            evaluationRaw.classroom_authority +
            evaluationRaw.classroom_prayers +
            evaluationRaw.classroom_punctuality) / 6;
        const overall_average = (teacher_average + learning_average + classroom_average) / 3;
        const evaluation = {
            ...evaluationRaw,
            school_year: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.school_year), // Decrypt Evaluation's own encrypted field
            year_level: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.year_level), // Decrypt Evaluation's own encrypted field
            status: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.status), // Decrypt Evaluation's own encrypted field
            comments: (0, helpers_1.decryptCommentsField)(evaluationRaw.comments), // Decrypt for admin viewing
            teacher, // Use decrypted teacher
            course, // Use decrypted course
            program, // Use decrypted program
            teacher_id: evaluationRaw.teacher_id?._id,
            course_id: evaluationRaw.course_id?._id,
            program_id: evaluationRaw.program_id?._id,
            teacher_average,
            learning_average,
            classroom_average,
            overall_average
        };
        res.json({ evaluation });
    }
    catch (error) {
        console.error('Error fetching evaluation:', error);
        res.status(500).json({ error: 'Error fetching evaluation' });
    }
});
exports.default = router;
//# sourceMappingURL=evaluations.js.map