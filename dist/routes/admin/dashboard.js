"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Evaluation_1 = __importDefault(require("../../models/Evaluation"));
const Teacher_1 = __importDefault(require("../../models/Teacher"));
const Program_1 = __importDefault(require("../../models/Program"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const auth_1 = require("../../middleware/auth");
const helpers_1 = require("../helpers");
const router = (0, express_1.Router)();
router.get('/', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const totalEvaluations = await Evaluation_1.default.countDocuments();
        // Since status is encrypted, we need to fetch and decrypt to count active teachers
        const allTeachers = await Teacher_1.default.find();
        const totalTeachers = allTeachers.filter(teacher => {
            const status = (0, encryption_helpers_1.safeDecrypt)(teacher.status);
            return status === 'active';
        }).length;
        const totalPrograms = await Program_1.default.countDocuments();
        // Calculate average ratings
        const avgRatings = await Evaluation_1.default.aggregate([
            {
                $addFields: {
                    teacher_avg: {
                        $avg: [
                            '$teacher_diction', '$teacher_grammar', '$teacher_personality',
                            '$teacher_disposition', '$teacher_dynamic', '$teacher_fairness'
                        ]
                    },
                    learning_avg: {
                        $avg: [
                            '$learning_motivation', '$learning_critical_thinking', '$learning_organization',
                            '$learning_interest', '$learning_explanation', '$learning_clarity',
                            '$learning_integration', '$learning_mastery', '$learning_methodology',
                            '$learning_values', '$learning_grading', '$learning_synthesis', '$learning_reasonableness'
                        ]
                    },
                    classroom_avg: {
                        $avg: [
                            '$classroom_attendance', '$classroom_policies', '$classroom_discipline',
                            '$classroom_authority', '$classroom_prayers', '$classroom_punctuality'
                        ]
                    }
                }
            },
            {
                $addFields: {
                    overall_avg: { $avg: ['$teacher_avg', '$learning_avg', '$classroom_avg'] }
                }
            },
            {
                $group: {
                    _id: null,
                    teacher: { $avg: '$teacher_avg' },
                    learning: { $avg: '$learning_avg' },
                    classroom: { $avg: '$classroom_avg' },
                    overall: { $avg: '$overall_avg' }
                }
            }
        ]);
        // Use actual ratings without any privacy noise
        const averageRatings = avgRatings.length > 0 ? avgRatings[0] :
            { teacher: 0, learning: 0, classroom: 0, overall: 0 };
        // Top teachers
        const topTeachersRaw = await Evaluation_1.default.aggregate([
            {
                $addFields: {
                    teacher_avg: {
                        $avg: [
                            '$teacher_diction', '$teacher_grammar', '$teacher_personality',
                            '$teacher_disposition', '$teacher_dynamic', '$teacher_fairness'
                        ]
                    },
                    learning_avg: {
                        $avg: [
                            '$learning_motivation', '$learning_critical_thinking', '$learning_organization',
                            '$learning_interest', '$learning_explanation', '$learning_clarity',
                            '$learning_integration', '$learning_mastery', '$learning_methodology',
                            '$learning_values', '$learning_grading', '$learning_synthesis', '$learning_reasonableness'
                        ]
                    },
                    classroom_avg: {
                        $avg: [
                            '$classroom_attendance', '$classroom_policies', '$classroom_discipline',
                            '$classroom_authority', '$classroom_prayers', '$classroom_punctuality'
                        ]
                    }
                }
            },
            {
                $addFields: {
                    overall_avg: { $avg: ['$teacher_avg', '$learning_avg', '$classroom_avg'] }
                }
            },
            {
                $group: {
                    _id: '$teacher_id',
                    average_rating: { $avg: '$overall_avg' },
                    evaluation_count: { $sum: 1 }
                }
            },
            // Admin view: Show all teachers with at least 1 evaluation
            { $match: { evaluation_count: { $gte: 1 } } },
            { $sort: { average_rating: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'teachers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $project: {
                    _id: '$teacher._id',
                    full_name: '$teacher.full_name', // Still encrypted at this stage
                    average_rating: 1,
                    evaluation_count: 1
                }
            }
        ]);
        // Decrypt teacher names for admin viewing
        const topTeachers = topTeachersRaw.map((teacher) => ({
            ...teacher,
            full_name: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name)
        }));
        // Recent evaluations
        const recentEvaluationsRaw = await Evaluation_1.default.find()
            .populate('teacher_id', 'full_name')
            .populate('course_id', 'name code')
            .sort({ createdAt: -1 })
            .limit(10)
            .select('-anonymous_token -ip_address')
            .lean();
        // Transform to match frontend expectation (teacher, course instead of teacher_id, course_id)
        const recentEvaluations = recentEvaluationsRaw.map((evaluation) => {
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
            // Decrypt populated teacher fields
            const teacher = evaluation.teacher_id ? {
                _id: evaluation.teacher_id._id,
                full_name: (0, encryption_helpers_1.safeDecrypt)(evaluation.teacher_id.full_name)
            } : evaluation.teacher_id;
            // Decrypt populated course fields
            const course = evaluation.course_id ? {
                _id: evaluation.course_id._id,
                name: (0, encryption_helpers_1.safeDecrypt)(evaluation.course_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(evaluation.course_id.code)
            } : evaluation.course_id;
            return {
                ...evaluation,
                school_year: (0, encryption_helpers_1.safeDecrypt)(evaluation.school_year), // Decrypt Evaluation's own encrypted field
                year_level: (0, encryption_helpers_1.safeDecrypt)(evaluation.year_level), // Decrypt Evaluation's own encrypted field
                status: (0, encryption_helpers_1.safeDecrypt)(evaluation.status), // Decrypt Evaluation's own encrypted field
                comments: (0, helpers_1.decryptCommentsField)(evaluation.comments), // Decrypt for admin viewing
                teacher,
                course,
                teacher_id: evaluation.teacher_id?._id,
                course_id: evaluation.course_id?._id,
                teacher_average,
                learning_average,
                classroom_average,
                overall_average
            };
        });
        // Admin response
        res.json({
            totalEvaluations,
            totalTeachers,
            totalPrograms,
            averageRatings,
            topTeachers,
            recentEvaluations
        });
    }
    catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).json({ error: 'Error loading dashboard data' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map