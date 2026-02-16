"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Admin routes
const auth_1 = __importDefault(require("./admin/auth"));
const dashboard_1 = __importDefault(require("./admin/dashboard"));
const evaluations_1 = __importDefault(require("./admin/evaluations"));
const teachers_1 = __importDefault(require("./admin/teachers"));
const programs_1 = __importDefault(require("./admin/programs"));
const courses_1 = __importDefault(require("./admin/courses"));
const students_1 = __importDefault(require("./admin/students"));
const privacy_1 = __importDefault(require("./admin/privacy"));
const evaluation_periods_1 = __importDefault(require("./admin/evaluation-periods"));
// Student routes
const auth_2 = __importDefault(require("./student/auth"));
const subjects_1 = __importDefault(require("./student/subjects"));
const evaluation_1 = __importDefault(require("./student/evaluation"));
// Teacher routes
const auth_3 = __importDefault(require("./teacher/auth"));
const dashboard_2 = __importDefault(require("./teacher/dashboard"));
const router = (0, express_1.Router)();
// ==================== ADMIN ROUTES ====================
router.use('/admin', auth_1.default);
router.use('/admin/dashboard', dashboard_1.default);
router.use('/admin/evaluations', evaluations_1.default);
router.use('/admin/teachers', teachers_1.default);
router.use('/admin/programs', programs_1.default);
router.use('/admin/courses', courses_1.default);
router.use('/admin/students', students_1.default);
router.use('/admin/privacy-audit', privacy_1.default);
router.use('/admin/evaluation-periods', evaluation_periods_1.default);
// Public evaluation period endpoint (no auth required)
router.use('/evaluation-period', evaluation_periods_1.default);
// Test endpoint from admin auth (no auth required)
router.use('/', auth_1.default);
// ==================== STUDENT ROUTES ====================
router.use('/student', auth_2.default);
router.use('/student/subjects', subjects_1.default);
router.use('/student/enrollment', subjects_1.default);
router.use('/student/submit-evaluation', evaluation_1.default);
// ==================== TEACHER ROUTES ====================
router.use('/teacher', auth_3.default);
router.use('/teacher', dashboard_2.default);
exports.default = router;
//# sourceMappingURL=index.js.map