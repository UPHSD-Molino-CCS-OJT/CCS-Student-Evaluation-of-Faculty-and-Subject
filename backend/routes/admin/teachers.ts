import { Router, Response } from 'express';
import Teacher from '../../models/Teacher';
import { IRequest } from '../../types';
import { safeDecrypt, safeEncrypt } from '../../utils/encryption-helpers';
import { isAuthenticated } from '../../middleware/auth';

const router: Router = Router();

router.get('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        // Fetch all teachers (cannot sort by encrypted field in database)
        const teachersRaw = await Teacher.find();
        
        // Decrypt fields and prepare for admin viewing
        const teachers = teachersRaw.map(t => {
            const teacher = t.toObject();
            return {
                ...teacher,
                full_name: safeDecrypt(teacher.full_name),
                employee_id: safeDecrypt(teacher.employee_id),
                email: safeDecrypt(teacher.email),
                department: safeDecrypt(teacher.department),
                status: safeDecrypt(teacher.status)
            };
        });
        
        // Sort by full_name in memory (after decryption)
        teachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
        
        // Apply pagination in memory
        const totalCount = teachers.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedTeachers = teachers.slice(skip, skip + limit);
        
        res.json({ 
            teachers: paginatedTeachers,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching teachers' });
    }
});

router.post('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before saving
        const teacherData = {
            ...req.body,
            full_name: safeEncrypt(req.body.full_name),
            employee_id: safeEncrypt(req.body.employee_id),
            email: safeEncrypt(req.body.email),
            department: safeEncrypt(req.body.department),
            status: safeEncrypt(req.body.status)
        };
        const teacher = await Teacher.create(teacherData);
        
        // Decrypt for response to admin
        const response = {
            ...teacher.toObject(),
            full_name: safeDecrypt(teacher.full_name),
            employee_id: safeDecrypt(teacher.employee_id),
            email: safeDecrypt(teacher.email),
            department: safeDecrypt(teacher.department),
            status: safeDecrypt(teacher.status)
        };
        
        res.json({ success: true, teacher: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before updating
        const teacherData = {
            ...req.body,
            full_name: safeEncrypt(req.body.full_name),
            employee_id: safeEncrypt(req.body.employee_id),
            email: safeEncrypt(req.body.email),
            department: safeEncrypt(req.body.department),
            status: safeEncrypt(req.body.status)
        };
        const teacher = await Teacher.findByIdAndUpdate(req.params.id, teacherData, { new: true });
        
        if (!teacher) {
            res.status(404).json({ message: 'Teacher not found' });
            return;
        }
        
        // Decrypt for response to admin
        const response = {
            ...teacher.toObject(),
            full_name: safeDecrypt(teacher.full_name),
            employee_id: safeDecrypt(teacher.employee_id),
            email: safeDecrypt(teacher.email),
            department: safeDecrypt(teacher.department),
            status: safeDecrypt(teacher.status)
        };
        
        res.json({ success: true, teacher: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Teacher.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

export default router;
