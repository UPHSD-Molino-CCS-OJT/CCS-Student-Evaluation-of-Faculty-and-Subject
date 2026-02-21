import { Router, Response } from 'express';
import Student from '../../models/Student';
import { IRequest } from '../../types';
import { safeDecrypt, safeEncrypt } from '../../utils/encryption-helpers';
import { isAuthenticated } from '../../middleware/auth';

const router: Router = Router();

router.get('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        // Fetch all students (cannot sort by encrypted field in database)
        const studentsRaw = await Student.find().populate('program_id');
        
        // Decrypt fields and prepare for admin viewing
        const students = studentsRaw.map(s => {
            const student = s.toObject();
            // Also decrypt populated program fields
            const program = student.program_id ? {
                ...student.program_id,
                name: safeDecrypt((student.program_id as any).name),
                code: safeDecrypt((student.program_id as any).code)
            } : student.program_id;
            
            return {
                ...student,
                student_number: safeDecrypt(student.student_number),
                year_level: safeDecrypt(student.year_level),
                section: safeDecrypt(student.section),
                status: safeDecrypt(student.status),
                program_id: program
            };
        });
        
        // Sort by student_number in memory (after decryption)
        students.sort((a, b) => a.student_number.localeCompare(b.student_number, undefined, { numeric: true }));
        
        // Apply pagination in memory
        const totalCount = students.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedStudents = students.slice(skip, skip + limit);
        
        res.json({ 
            students: paginatedStudents,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching students' });
    }
});

router.post('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before saving
        const studentData = {
            ...req.body,
            student_number: safeEncrypt(req.body.student_number),
            year_level: safeEncrypt(req.body.year_level),
            section: safeEncrypt(req.body.section),
            status: safeEncrypt(req.body.status)
        };
        const student = await Student.create(studentData);
        
        // Decrypt for response to admin
        const response = {
            ...student.toObject(),
            student_number: safeDecrypt(student.student_number),
            year_level: safeDecrypt(student.year_level),
            section: safeDecrypt(student.section),
            status: safeDecrypt(student.status)
        };
        
        res.json({ success: true, student: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before updating
        const studentData = {
            ...req.body,
            student_number: safeEncrypt(req.body.student_number),
            year_level: safeEncrypt(req.body.year_level),
            section: safeEncrypt(req.body.section),
            status: safeEncrypt(req.body.status)
        };
        const student = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true });
        
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        
        // Decrypt for response to admin
        const response = {
            ...student.toObject(),
            student_number: safeDecrypt(student.student_number),
            year_level: safeDecrypt(student.year_level),
            section: safeDecrypt(student.section),
            status: safeDecrypt(student.status)
        };
        
        res.json({ success: true, student: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

export default router;
