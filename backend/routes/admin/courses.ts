import { Router, Response } from 'express';
import Course from '../../models/Course';
import { IRequest } from '../../types';
import { safeDecrypt, safeEncrypt } from '../../utils/encryption-helpers';
import { isAuthenticated } from '../../middleware/auth';

const router: Router = Router();

router.get('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        // Fetch all courses (cannot sort by encrypted field in database)
        const coursesRaw = await Course.find().populate('program_id');
        
        // Decrypt fields and prepare for admin viewing
        const courses = coursesRaw.map(c => {
            const course = c.toObject();
            // Also decrypt populated program fields
            const program = course.program_id ? {
                ...course.program_id,
                name: safeDecrypt((course.program_id as any).name),
                code: safeDecrypt((course.program_id as any).code)
            } : course.program_id;
            
            return {
                ...course,
                name: safeDecrypt(course.name),
                code: safeDecrypt(course.code),
                program_id: program
            };
        });
        
        // Sort by name in memory (after decryption)
        courses.sort((a, b) => a.name.localeCompare(b.name));
        
        // Apply pagination in memory
        const totalCount = courses.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedCourses = courses.slice(skip, skip + limit);
        
        res.json({ 
            courses: paginatedCourses,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching courses' });
    }
});

router.post('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before saving
        const courseData = {
            ...req.body,
            name: safeEncrypt(req.body.name),
            code: safeEncrypt(req.body.code)
        };
        const course = await Course.create(courseData);
        
        // Decrypt for response to admin
        const response = {
            ...course.toObject(),
            name: safeDecrypt(course.name),
            code: safeDecrypt(course.code)
        };
        
        res.json({ success: true, course: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before updating
        const courseData = {
            ...req.body,
            name: safeEncrypt(req.body.name),
            code: safeEncrypt(req.body.code)
        };
        const course = await Course.findByIdAndUpdate(req.params.id, courseData, { new: true });
        
        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }
        
        // Decrypt for response to admin
        const response = {
            ...course.toObject(),
            name: safeDecrypt(course.name),
            code: safeDecrypt(course.code)
        };
        
        res.json({ success: true, course: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

export default router;
