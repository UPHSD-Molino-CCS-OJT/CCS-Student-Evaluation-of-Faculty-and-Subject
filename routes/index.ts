import { Router } from 'express';

// Admin routes
import adminAuthRoutes from './admin/auth';
import adminDashboardRoutes from './admin/dashboard';
import adminEvaluationsRoutes from './admin/evaluations';
import adminTeachersRoutes from './admin/teachers';
import adminProgramsRoutes from './admin/programs';
import adminCoursesRoutes from './admin/courses';
import adminStudentsRoutes from './admin/students';
import adminPrivacyRoutes from './admin/privacy';
import adminEvaluationPeriodsRoutes from './admin/evaluation-periods';

// Student routes
import studentAuthRoutes from './student/auth';
import studentSubjectsRoutes from './student/subjects';
import studentEvaluationRoutes from './student/evaluation';

// Teacher routes
import teacherAuthRoutes from './teacher/auth';
import teacherDashboardRoutes from './teacher/dashboard';

const router: Router = Router();

// ==================== ADMIN ROUTES ====================
router.use('/admin', adminAuthRoutes);
router.use('/admin/dashboard', adminDashboardRoutes);
router.use('/admin/evaluations', adminEvaluationsRoutes);
router.use('/admin/teachers', adminTeachersRoutes);
router.use('/admin/programs', adminProgramsRoutes);
router.use('/admin/courses', adminCoursesRoutes);
router.use('/admin/students', adminStudentsRoutes);
router.use('/admin/privacy-audit', adminPrivacyRoutes);
router.use('/admin/evaluation-periods', adminEvaluationPeriodsRoutes);

// Public evaluation period endpoint (no auth required)
router.use('/evaluation-period', adminEvaluationPeriodsRoutes);

// Test endpoint from admin auth (no auth required)
router.use('/', adminAuthRoutes);

// ==================== STUDENT ROUTES ====================
router.use('/student', studentAuthRoutes);
router.use('/student/subjects', studentSubjectsRoutes);
router.use('/student/enrollment', studentSubjectsRoutes);
router.use('/student/submit-evaluation', studentEvaluationRoutes);

// ==================== TEACHER ROUTES ====================
router.use('/teacher', teacherAuthRoutes);
router.use('/teacher', teacherDashboardRoutes);

export default router;
