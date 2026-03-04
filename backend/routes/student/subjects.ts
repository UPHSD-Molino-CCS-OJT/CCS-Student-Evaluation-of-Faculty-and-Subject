import { Router, Response } from 'express';
import Student from '../../models/Student';
import Enrollment from '../../models/Enrollment';
import Section from '../../models/Section';
import { IRequest } from '../../types';
import { safeDecrypt, safeEncrypt } from '../../utils/encryption-helpers';

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

// Get available sections grouped by course (for enrollment form)
router.get('/available', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.studentId) {
            res.json({ success: false, message: 'Please login first' });
            return;
        }

        const student = await Student.findById(req.session.studentId);
        if (!student) {
            res.json({ success: false, message: 'Student not found' });
            return;
        }

        // Fetch active sections whose course belongs to the student's program
        const sectionsRaw = await Section.find({ is_active: true })
            .populate({ path: 'course_id', populate: { path: 'program_id' } })
            .populate('teacher_id')
            .lean();

        // Filter by student program and decrypt
        const sections = sectionsRaw
            .filter(s => {
                const course = s.course_id as any;
                if (!course || !course.program_id) return false;
                return course.program_id._id.toString() === student.program_id.toString();
            })
            .map(s => {
                const course = s.course_id as any;
                const teacher = s.teacher_id as any;
                return {
                    _id: s._id,
                    section_code: safeDecrypt(s.section_code),
                    school_year: safeDecrypt(s.school_year),
                    semester: safeDecrypt(s.semester),
                    course: {
                        _id: course._id,
                        name: safeDecrypt(course.name),
                        code: safeDecrypt(course.code)
                    },
                    teacher: {
                        _id: teacher._id,
                        full_name: safeDecrypt(teacher.full_name),
                        department: safeDecrypt(teacher.department)
                    }
                };
            });

        // Group by course id
        const grouped: Record<string, { course: any; sections: any[] }> = {};
        for (const s of sections) {
            const key = s.course._id.toString();
            if (!grouped[key]) {
                grouped[key] = { course: s.course, sections: [] };
            }
            grouped[key].sections.push(s);
        }

        const result = Object.values(grouped).sort((a, b) =>
            a.course.name.localeCompare(b.course.name)
        );

        res.json({ success: true, courseGroups: result });
    } catch (error) {
        console.error('Error loading available sections:', error);
        res.status(500).json({ success: false, message: 'Error loading available sections' });
    }
});

// Enroll student using a pre-configured section
router.post('/enroll', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.studentId) {
            res.json({ success: false, message: 'Please login first' });
            return;
        }

        const { section_id } = req.body;

        if (!section_id) {
            res.status(400).json({ success: false, message: 'section_id is required' });
            return;
        }

        const section = await Section.findById(section_id);
        if (!section || !section.is_active) {
            res.status(404).json({ success: false, message: 'Section not found or inactive' });
            return;
        }

        const schoolYear = safeDecrypt(section.school_year);
        const semester = safeDecrypt(section.semester);

        // Prevent duplicate enrollment in same course + semester
        const existing = await Enrollment.find({
            student_id: req.session.studentId,
            course_id: section.course_id
        });
        for (const e of existing) {
            if (safeDecrypt(e.school_year) === schoolYear && safeDecrypt(e.semester) === semester) {
                res.status(409).json({
                    success: false,
                    message: 'You are already enrolled in this course for the selected semester'
                });
                return;
            }
        }

        const enrollment = await Enrollment.create({
            student_id: req.session.studentId,
            course_id: section.course_id,
            teacher_id: section.teacher_id,
            section_code: safeEncrypt(safeDecrypt(section.section_code)),
            school_year: safeEncrypt(schoolYear),
            semester: safeEncrypt(semester)
        });

        res.json({ success: true, enrollment: { _id: enrollment._id } });
    } catch (error) {
        console.error('Error enrolling student:', error);
        res.status(500).json({ success: false, message: 'Error creating enrollment' });
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
