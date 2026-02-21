import { Router, Response } from 'express';
import { Types } from 'mongoose';
import Teacher from '../../models/Teacher';
import Course from '../../models/Course';
import Enrollment from '../../models/Enrollment';
import Evaluation from '../../models/Evaluation';
import { IRequest } from '../../types';
import { safeDecrypt } from '../../utils/encryption-helpers';
import { decryptCommentsField } from '../helpers';

const router: Router = Router();

// Get Teacher Dashboard Data
router.get('/', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.teacherId) {
            res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
            return;
        }

        const teacherId = new Types.ObjectId(req.session.teacherId);
        
        // Get teacher details
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            res.status(404).json({ 
                success: false, 
                message: 'Teacher not found' 
            });
            return;
        }

        // Get all enrollments for this teacher
        const enrollments = await Enrollment.find({ teacher_id: teacherId })
            .populate('course_id')
            .populate('student_id');

        // Get all evaluations for this teacher
        const evaluations = await Evaluation.find({ teacher_id: teacherId });

        // Group by course
        const courseMap = new Map();

        for (const enrollment of enrollments) {
            const course = enrollment.course_id as any;
            if (!course) continue;

            const courseId = course._id.toString();
            
            if (!courseMap.has(courseId)) {
                courseMap.set(courseId, {
                    course_id: courseId,
                    course_name: safeDecrypt(course.name),
                    course_code: safeDecrypt(course.code),
                    section_code: safeDecrypt(enrollment.section_code),
                    school_year: safeDecrypt(enrollment.school_year),
                    semester: safeDecrypt(enrollment.semester),
                    total_students: 0,
                    evaluated_students: 0,
                    evaluations: []
                });
            }

            const courseData = courseMap.get(courseId);
            courseData.total_students++;
            if (enrollment.has_evaluated) {
                courseData.evaluated_students++;
            }
        }

        // Add evaluations to courses
        for (const evaluation of evaluations) {
            const course = await Course.findById(evaluation.course_id);
            if (!course) continue;

            const courseId = course._id.toString();
            if (courseMap.has(courseId)) {
                courseMap.get(courseId).evaluations.push(evaluation);
            }
        }

        // Calculate statistics for each course
        const courseStats = Array.from(courseMap.values()).map(courseData => {
            const evals = courseData.evaluations;
            const evalCount = evals.length;

            if (evalCount === 0) {
                return {
                    ...courseData,
                    average_rating: 0,
                    question_averages: {},
                    remarks: 'No evaluations yet'
                };
            }

            // Calculate averages for all rating fields
            const ratingFields = [
                'teacher_diction', 'teacher_grammar', 'teacher_personality',
                'teacher_disposition', 'teacher_dynamic', 'teacher_fairness',
                'learning_motivation', 'learning_critical_thinking', 'learning_organization',
                'learning_interest', 'learning_explanation', 'learning_clarity',
                'learning_integration', 'learning_mastery', 'learning_methodology',
                'learning_values', 'learning_grading', 'learning_synthesis',
                'learning_reasonableness', 'classroom_attendance', 'classroom_policies',
                'classroom_discipline', 'classroom_authority', 'classroom_prayers',
                'classroom_punctuality'
            ];

            const questionAverages: any = {};
            let totalSum = 0;
            let totalCount = 0;

            for (const field of ratingFields) {
                const sum = evals.reduce((acc: number, e: any) => acc + (e[field as keyof typeof e] as number || 0), 0);
                const avg = sum / evalCount;
                questionAverages[field] = parseFloat(avg.toFixed(2));
                totalSum += sum;
                totalCount += evalCount;
            }

            const overallAverage = totalSum / totalCount;
            
            // Determine remarks based on average
            let remarks = '';
            if (overallAverage >= 4.5) {
                remarks = 'Outstanding';
            } else if (overallAverage >= 4.0) {
                remarks = 'High Satisfactory';
            } else if (overallAverage >= 3.5) {
                remarks = 'Satisfactory';
            } else if (overallAverage >= 3.0) {
                remarks = 'Fairly Satisfactory';
            } else {
                remarks = 'Needs Improvement';
            }

            return {
                course_id: courseData.course_id,
                course_name: courseData.course_name,
                course_code: courseData.course_code,
                section_code: courseData.section_code,
                school_year: courseData.school_year,
                semester: courseData.semester,
                total_students: courseData.total_students,
                evaluated_students: courseData.evaluated_students,
                average_rating: parseFloat(overallAverage.toFixed(2)),
                question_averages: questionAverages,
                remarks: remarks
            };
        });

        res.json({
            success: true,
            teacher: {
                full_name: safeDecrypt(teacher.full_name),
                employee_id: safeDecrypt(teacher.employee_id),
                department: safeDecrypt(teacher.department),
                email: safeDecrypt(teacher.email)
            },
            courses: courseStats
        });
    } catch (error) {
        console.error('Error fetching teacher dashboard data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching dashboard data' 
        });
    }
});

// Get Detailed Course Evaluation Data (with comments)
router.get('/course/:courseId', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.teacherId) {
            res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
            return;
        }

        const teacherId = new Types.ObjectId(req.session.teacherId);
        const courseIdParam = req.params.courseId;
        const courseId = new Types.ObjectId(Array.isArray(courseIdParam) ? courseIdParam[0] : courseIdParam);
        
        // Get teacher details
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            res.status(404).json({ 
                success: false, 
                message: 'Teacher not found' 
            });
            return;
        }

        // Get course details
        const course = await Course.findById(courseId);
        if (!course) {
            res.status(404).json({ 
                success: false, 
                message: 'Course not found' 
            });
            return;
        }

        // Get enrollments for this course and teacher
        const enrollments = await Enrollment.find({ 
            course_id: courseId,
            teacher_id: teacherId 
        }).populate('student_id');

        // Get evaluations for this course and teacher
        const evaluations = await Evaluation.find({ 
            course_id: courseId,
            teacher_id: teacherId 
        });

        const totalStudents = enrollments.length;
        const evaluatedStudents = enrollments.filter(e => e.has_evaluated).length;

        if (evaluations.length === 0) {
            res.json({
                success: true,
                course: {
                    course_id: course._id,
                    course_name: safeDecrypt(course.name),
                    course_code: safeDecrypt(course.code),
                    total_students: totalStudents,
                    evaluated_students: evaluatedStudents
                },
                teacher: {
                    full_name: safeDecrypt(teacher.full_name),
                    employee_id: safeDecrypt(teacher.employee_id)
                },
                statistics: {
                    average_rating: 0,
                    question_averages: {},
                    remarks: 'No evaluations yet'
                },
                comments: []
            });
            return;
        }

        // Calculate statistics
        const ratingFields = [
            'teacher_diction', 'teacher_grammar', 'teacher_personality',
            'teacher_disposition', 'teacher_dynamic', 'teacher_fairness',
            'learning_motivation', 'learning_critical_thinking', 'learning_organization',
            'learning_interest', 'learning_explanation', 'learning_clarity',
            'learning_integration', 'learning_mastery', 'learning_methodology',
            'learning_values', 'learning_grading', 'learning_synthesis',
            'learning_reasonableness', 'classroom_attendance', 'classroom_policies',
            'classroom_discipline', 'classroom_authority', 'classroom_prayers',
            'classroom_punctuality'
        ];

        const questionAverages: any = {};
        let totalSum = 0;
        let totalCount = 0;
        const evalCount = evaluations.length;

        for (const field of ratingFields) {
            const sum = evaluations.reduce((acc: number, e: any) => acc + (e[field as keyof typeof e] as number || 0), 0);
            const avg = sum / evalCount;
            questionAverages[field] = parseFloat(avg.toFixed(2));
            totalSum += sum;
            totalCount += evalCount;
        }

        const overallAverage = totalSum / totalCount;
        
        // Determine remarks based on average
        let remarks = '';
        if (overallAverage >= 4.5) {
            remarks = 'Outstanding';
        } else if (overallAverage >= 4.0) {
            remarks = 'High Satisfactory';
        } else if (overallAverage >= 3.5) {
            remarks = 'Satisfactory';
        } else if (overallAverage >= 3.0) {
            remarks = 'Fairly Satisfactory';
        } else {
            remarks = 'Needs Improvement';
        }

        // Extract comments (decrypt them)
        const comments = evaluations
            .filter(e => e.comments)
            .map(e => {
                const decryptedComment = decryptCommentsField(e.comments);
                return {
                    comment: decryptedComment,
                    submitted_at: e.submitted_at
                };
            })
            .filter(c => c.comment && c.comment.trim().length > 0)
            .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

        // Get enrollment info for section details
        const sampleEnrollment = enrollments[0];
        
        res.json({
            success: true,
            course: {
                course_id: course._id,
                course_name: safeDecrypt(course.name),
                course_code: safeDecrypt(course.code),
                section_code: sampleEnrollment ? safeDecrypt(sampleEnrollment.section_code) : 'N/A',
                school_year: sampleEnrollment ? safeDecrypt(sampleEnrollment.school_year) : 'N/A',
                semester: sampleEnrollment ? safeDecrypt(sampleEnrollment.semester) : 'N/A',
                total_students: totalStudents,
                evaluated_students: evaluatedStudents
            },
            teacher: {
                full_name: safeDecrypt(teacher.full_name),
                employee_id: safeDecrypt(teacher.employee_id)
            },
            statistics: {
                average_rating: parseFloat(overallAverage.toFixed(2)),
                question_averages: questionAverages,
                remarks: remarks
            },
            comments: comments
        });
    } catch (error) {
        console.error('Error fetching course detail:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching course detail' 
        });
    }
});

export default router;
