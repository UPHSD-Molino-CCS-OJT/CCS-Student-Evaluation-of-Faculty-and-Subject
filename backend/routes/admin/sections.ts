import { Router, Response } from 'express';
import Section from '../../models/Section';
import Course from '../../models/Course';
import Teacher from '../../models/Teacher';
import { IRequest } from '../../types';
import { safeDecrypt, safeEncrypt } from '../../utils/encryption-helpers';
import { isAuthenticated } from '../../middleware/auth';

const router: Router = Router();

// Helper: decrypt a section with its populated fields
const decryptSection = (section: any) => {
    const course = section.course_id ? {
        ...section.course_id,
        name: safeDecrypt(section.course_id.name),
        code: safeDecrypt(section.course_id.code)
    } : section.course_id;

    const teacher = section.teacher_id ? {
        ...section.teacher_id,
        full_name: safeDecrypt(section.teacher_id.full_name),
        employee_id: safeDecrypt(section.teacher_id.employee_id),
        department: safeDecrypt(section.teacher_id.department)
    } : section.teacher_id;

    return {
        ...section,
        course_id: course,
        teacher_id: teacher,
        section_code: safeDecrypt(section.section_code),
        school_year: safeDecrypt(section.school_year),
        semester: safeDecrypt(section.semester)
    };
};

// GET all sections (admin)
router.get('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const sectionsRaw = await Section.find()
            .populate({ path: 'course_id', populate: { path: 'program_id' } })
            .populate('teacher_id')
            .lean();

        const sections = sectionsRaw.map(decryptSection);

        // Sort by course name then section_code
        sections.sort((a, b) => {
            const nameA = a.course_id?.name || '';
            const nameB = b.course_id?.name || '';
            return nameA.localeCompare(nameB) || a.section_code.localeCompare(b.section_code);
        });

        const totalCount = sections.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginated = sections.slice(skip, skip + limit);

        res.json({
            success: true,
            sections: paginated,
            pagination: { page, limit, totalPages, totalCount, hasMore: page < totalPages }
        });
    } catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).json({ success: false, message: 'Error fetching sections' });
    }
});

// GET list of courses + teachers for the create/edit form
router.get('/form-data', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        const [coursesRaw, teachersRaw] = await Promise.all([
            Course.find().populate('program_id').lean(),
            Teacher.find().lean()
        ]);

        const courses = coursesRaw.map(c => ({
            _id: c._id,
            name: safeDecrypt(c.name),
            code: safeDecrypt(c.code),
            program_id: c.program_id
        })).sort((a, b) => a.name.localeCompare(b.name));

        const teachers = teachersRaw.map(t => ({
            _id: t._id,
            full_name: safeDecrypt(t.full_name),
            department: safeDecrypt(t.department)
        })).sort((a, b) => a.full_name.localeCompare(b.full_name));

        res.json({ success: true, courses, teachers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching form data' });
    }
});

// POST create section
router.post('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { course_id, teacher_id, section_code, school_year, semester, is_active } = req.body;

        if (!course_id || !teacher_id || !section_code || !school_year || !semester) {
            res.status(400).json({ success: false, message: 'All fields are required' });
            return;
        }

        const section = await Section.create({
            course_id,
            teacher_id,
            section_code: safeEncrypt(section_code),
            school_year: safeEncrypt(school_year),
            semester: safeEncrypt(semester),
            is_active: is_active !== false
        });

        const populated = await Section.findById(section._id)
            .populate({ path: 'course_id', populate: { path: 'program_id' } })
            .populate('teacher_id')
            .lean();

        res.json({ success: true, section: decryptSection(populated) });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT update section
router.put('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { course_id, teacher_id, section_code, school_year, semester, is_active } = req.body;

        const updated = await Section.findByIdAndUpdate(
            req.params.id,
            {
                course_id,
                teacher_id,
                section_code: safeEncrypt(section_code),
                school_year: safeEncrypt(school_year),
                semester: safeEncrypt(semester),
                is_active
            },
            { new: true }
        )
            .populate({ path: 'course_id', populate: { path: 'program_id' } })
            .populate('teacher_id')
            .lean();

        if (!updated) {
            res.status(404).json({ success: false, message: 'Section not found' });
            return;
        }

        res.json({ success: true, section: decryptSection(updated) });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE section
router.delete('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Section.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, message: err.message });
    }
});

export default router;
