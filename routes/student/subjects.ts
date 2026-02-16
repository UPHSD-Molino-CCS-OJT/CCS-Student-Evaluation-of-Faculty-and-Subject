import { Router, Response } from 'express';
import Student from '../../models/Student';
import Enrollment from '../../models/Enrollment';
import { IRequest } from '../../types';
import { safeDecrypt } from '../../utils/encryption-helpers';

const router: Router = Router();

// Get student subjects/enrollments
router.get('/', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.studentId) {
            res.json({ authenticated: false });
            return;
        }
        
        const student = await Student.findById(req.session.studentId).populate('program_id');
        
        if (!student) {
            res.json({ authenticated: false });
            return;
        }
        
        const enrollments = await Enrollment.find({ student_id: student._id })
            .populate('course_id')
            .populate('teacher_id');
        
        // Decrypt enrollment and populated fields
        const decryptedEnrollments = enrollments.map(e => {
            const enrollment = e.toObject();
            
            // Decrypt enrollment fields
            const decryptedEnrollment: any = {
                ...enrollment,
                section_code: safeDecrypt(enrollment.section_code),
                school_year: safeDecrypt(enrollment.school_year),
                semester: safeDecrypt(enrollment.semester)
            };
            
            // Decrypt populated course fields
            if (enrollment.course_id) {
                decryptedEnrollment.course_id = {
                    ...enrollment.course_id,
                    name: safeDecrypt((enrollment.course_id as any).name),
                    code: safeDecrypt((enrollment.course_id as any).code)
                };
            }
            
            // Decrypt populated teacher fields
            if (enrollment.teacher_id) {
                decryptedEnrollment.teacher_id = {
                    ...enrollment.teacher_id,
                    full_name: safeDecrypt((enrollment.teacher_id as any).full_name),
                    employee_id: safeDecrypt((enrollment.teacher_id as any).employee_id),
                    email: safeDecrypt((enrollment.teacher_id as any).email),
                    department: safeDecrypt((enrollment.teacher_id as any).department),
                    status: safeDecrypt((enrollment.teacher_id as any).status)
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
            name: safeDecrypt((studentObj.program_id as any).name),
            code: safeDecrypt((studentObj.program_id as any).code)
        } : studentObj.program_id;
        
        res.json({ 
            authenticated: true,
            student: {
                program: decryptedProgram,
                year_level: safeDecrypt(student.year_level)
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
    } catch (error) {
        console.error('Error loading student subjects:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading subjects' 
        });
    }
});

// Get enrollment details for evaluation
router.get('/:enrollmentId', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.studentId) {
            res.json({ success: false, message: 'Please login first' });
            return;
        }
        
        const enrollment = await Enrollment.findById(req.params.enrollmentId)
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
            name: safeDecrypt((enrollmentObj.course_id as any).name),
            code: safeDecrypt((enrollmentObj.course_id as any).code),
            program_id: (enrollmentObj.course_id as any).program_id ? {
                ...(enrollmentObj.course_id as any).program_id,
                name: safeDecrypt(((enrollmentObj.course_id as any).program_id as any).name),
                code: safeDecrypt(((enrollmentObj.course_id as any).program_id as any).code)
            } : (enrollmentObj.course_id as any).program_id
        } : enrollmentObj.course_id;
        
        // Decrypt teacher fields
        const teacher = enrollmentObj.teacher_id ? {
            ...enrollmentObj.teacher_id,
            full_name: safeDecrypt((enrollmentObj.teacher_id as any).full_name),
            employee_id: safeDecrypt((enrollmentObj.teacher_id as any).employee_id),
            email: safeDecrypt((enrollmentObj.teacher_id as any).email),
            department: safeDecrypt((enrollmentObj.teacher_id as any).department),
            status: safeDecrypt((enrollmentObj.teacher_id as any).status)
        } : enrollmentObj.teacher_id;
        
        res.json({ 
            success: true,
            enrollment: {
                _id: enrollment._id,
                course,
                teacher,
                has_evaluated: enrollment.has_evaluated,
                section_code: safeDecrypt(enrollmentObj.section_code),
                school_year: safeDecrypt(enrollmentObj.school_year),
                semester: safeDecrypt(enrollmentObj.semester)
            }
        });
    } catch (error) {
        console.error('Error loading enrollment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading enrollment data' 
        });
    }
});

export default router;
