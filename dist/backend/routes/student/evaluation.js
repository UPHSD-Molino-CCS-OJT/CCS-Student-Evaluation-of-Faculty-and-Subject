"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Evaluation_1 = __importDefault(require("../../models/Evaluation"));
const Enrollment_1 = __importDefault(require("../../models/Enrollment"));
const EvaluationPeriod_1 = __importDefault(require("../../models/EvaluationPeriod"));
const privacy_protection_1 = __importDefault(require("../../utils/privacy-protection"));
const encryption_1 = require("../../utils/encryption");
const router = (0, express_1.Router)();
// Submit student evaluation
router.post('/', async (req, res) => {
    try {
        if (!req.session.studentId) {
            res.status(401).json({
                success: false,
                message: 'Please login first'
            });
            return;
        }
        // Check if there's an active evaluation period
        const activePeriod = await EvaluationPeriod_1.default.findOne({ is_active: true });
        if (!activePeriod) {
            res.status(403).json({
                success: false,
                message: 'Student evaluation is currently closed. Please check back later or contact your administrator.'
            });
            return;
        }
        const submissionDelay = privacy_protection_1.default.calculateSubmissionDelay(2, 8);
        await new Promise(resolve => setTimeout(resolve, submissionDelay));
        const data = req.body;
        const validationResult = privacy_protection_1.default.validateAnonymousSubmission(data);
        if (!validationResult.isValid) {
            res.status(400).json({
                success: false,
                message: validationResult.errors.join('. ')
            });
            return;
        }
        // Validate enrollment
        const enrollment = await Enrollment_1.default.findById(data.enrollment_id)
            .populate('student_id')
            .populate('course_id')
            .populate('teacher_id');
        if (!enrollment) {
            res.status(404).json({
                success: false,
                message: 'Enrollment not found'
            });
            return;
        }
        // Verify enrollment belongs to logged-in student
        if (enrollment.student_id._id.toString() !== req.session.studentId) {
            res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
            return;
        }
        if (enrollment.has_evaluated) {
            res.status(400).json({
                success: false,
                message: 'You have already evaluated this subject'
            });
            return;
        }
        const rawIp = req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress ||
            req.ip;
        const anonymizedIp = privacy_protection_1.default.anonymizeIpAddress(rawIp);
        const anonymousToken = privacy_protection_1.default.generateAnonymousToken(enrollment);
        const safeTimestamp = privacy_protection_1.default.getSafeSubmissionTimestamp();
        // Type guard for populated student
        const populatedStudent = enrollment.student_id;
        let encryptedComments = '';
        if (data.comments && data.comments.trim()) {
            if (!(0, encryption_1.isEncryptionConfigured)()) {
                console.error('CRITICAL: ENCRYPTION_MASTER_KEY not configured! Refusing to store plaintext comments.');
                res.status(500).json({
                    success: false,
                    message: 'Server configuration error. Please contact administrator.'
                });
                return;
            }
            const sanitizationResult = privacy_protection_1.default.sanitizeCommentForAnonymity(data.comments);
            if (!sanitizationResult.valid) {
                res.status(400).json({
                    success: false,
                    message: sanitizationResult.error || 'Comment validation failed'
                });
                return;
            }
            // Only encrypt if sanitized comment is not empty
            if (sanitizationResult.sanitized) {
                try {
                    encryptedComments = (0, encryption_1.encryptField)(sanitizationResult.sanitized);
                }
                catch (error) {
                    console.error('Comment encryption failed:', error);
                    res.status(500).json({
                        success: false,
                        message: 'Evaluation processing error. Please try again.'
                    });
                    return;
                }
            }
        }
        await Evaluation_1.default.create({
            school_year: enrollment.school_year,
            anonymous_token: anonymousToken,
            program_id: populatedStudent.program_id,
            year_level: populatedStudent.year_level,
            status: populatedStudent.status,
            course_id: enrollment.course_id._id,
            teacher_id: enrollment.teacher_id._id,
            // Teacher ratings (6 criteria)
            teacher_diction: Number(data.teacher_diction),
            teacher_grammar: Number(data.teacher_grammar),
            teacher_personality: Number(data.teacher_personality),
            teacher_disposition: Number(data.teacher_disposition),
            teacher_dynamic: Number(data.teacher_dynamic),
            teacher_fairness: Number(data.teacher_fairness),
            // Learning process ratings (13 criteria)
            learning_motivation: Number(data.learning_motivation),
            learning_critical_thinking: Number(data.learning_critical_thinking),
            learning_organization: Number(data.learning_organization),
            learning_interest: Number(data.learning_interest),
            learning_explanation: Number(data.learning_explanation),
            learning_clarity: Number(data.learning_clarity),
            learning_integration: Number(data.learning_integration),
            learning_mastery: Number(data.learning_mastery),
            learning_methodology: Number(data.learning_methodology),
            learning_values: Number(data.learning_values),
            learning_grading: Number(data.learning_grading),
            learning_synthesis: Number(data.learning_synthesis),
            learning_reasonableness: Number(data.learning_reasonableness),
            // Classroom management ratings (6 criteria)
            classroom_attendance: Number(data.classroom_attendance),
            classroom_policies: Number(data.classroom_policies),
            classroom_discipline: Number(data.classroom_discipline),
            classroom_authority: Number(data.classroom_authority),
            classroom_prayers: Number(data.classroom_prayers),
            classroom_punctuality: Number(data.classroom_punctuality),
            comments: encryptedComments, // Encrypted at rest (AES-256-GCM)
            ip_address: anonymizedIp,
            submitted_at: safeTimestamp
        });
        enrollment.has_evaluated = true;
        enrollment.submission_token_used = true;
        await enrollment.save();
        privacy_protection_1.default.clearSensitiveSessionData(req.session);
        res.json({
            success: true,
            message: 'Evaluation submitted successfully!'
        });
    }
    catch (error) {
        console.error('Error submitting evaluation:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting evaluation. Please try again.'
        });
    }
});
exports.default = router;
//# sourceMappingURL=evaluation.js.map