import { Router, Response } from 'express';
import Evaluation from '../../models/Evaluation';
import { IRequest } from '../../types';
import { safeDecrypt } from '../../utils/encryption-helpers';
import { isAuthenticated } from '../../middleware/auth';
import { decryptCommentsField } from '../helpers';

const router: Router = Router();

router.get('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        
        // Get total count
        const totalCount = await Evaluation.countDocuments();
        const totalPages = Math.ceil(totalCount / limit);
        
        const evaluationsRaw = await Evaluation.find()
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-anonymous_token -ip_address')
            .lean();
        
        // Transform to match frontend expectation
        const evaluations = evaluationsRaw.map((evaluation: any) => {
            // Calculate averages (virtuals not available with .lean())
            const teacher_average = (
                evaluation.teacher_diction +
                evaluation.teacher_grammar +
                evaluation.teacher_personality +
                evaluation.teacher_disposition +
                evaluation.teacher_dynamic +
                evaluation.teacher_fairness
            ) / 6;
            
            const learning_average = (
                evaluation.learning_motivation +
                evaluation.learning_critical_thinking +
                evaluation.learning_organization +
                evaluation.learning_interest +
                evaluation.learning_explanation +
                evaluation.learning_clarity +
                evaluation.learning_integration +
                evaluation.learning_mastery +
                evaluation.learning_methodology +
                evaluation.learning_values +
                evaluation.learning_grading +
                evaluation.learning_synthesis +
                evaluation.learning_reasonableness
            ) / 13;
            
            const classroom_average = (
                evaluation.classroom_attendance +
                evaluation.classroom_policies +
                evaluation.classroom_discipline +
                evaluation.classroom_authority +
                evaluation.classroom_prayers +
                evaluation.classroom_punctuality
            ) / 6;
            
            const overall_average = (teacher_average + learning_average + classroom_average) / 3;
            
            // Decrypt populated fields for admin viewing
            const teacher = evaluation.teacher_id ? {
                _id: evaluation.teacher_id._id,
                full_name: safeDecrypt(evaluation.teacher_id.full_name),
                employee_id: safeDecrypt(evaluation.teacher_id.employee_id)
            } : evaluation.teacher_id;
            
            const course = evaluation.course_id ? {
                _id: evaluation.course_id._id,
                name: safeDecrypt(evaluation.course_id.name),
                code: safeDecrypt(evaluation.course_id.code)
            } : evaluation.course_id;
            
            const program = evaluation.program_id ? {
                _id: evaluation.program_id._id,
                name: safeDecrypt(evaluation.program_id.name)
            } : evaluation.program_id;
            
            return {
                ...evaluation,
                school_year: safeDecrypt(evaluation.school_year), // Decrypt Evaluation's own encrypted field
                year_level: safeDecrypt(evaluation.year_level),   // Decrypt Evaluation's own encrypted field
                status: safeDecrypt(evaluation.status),           // Decrypt Evaluation's own encrypted field
                comments: decryptCommentsField(evaluation.comments), // Decrypt for admin viewing
                teacher,
                course,
                program,
                teacher_id: evaluation.teacher_id?._id,
                course_id: evaluation.course_id?._id,
                program_id: evaluation.program_id?._id,
                teacher_average,
                learning_average,
                classroom_average,
                overall_average
            };
        });
        
        res.json({ 
            evaluations,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ error: 'Error fetching evaluations' });
    }
});

router.get('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const evaluationRaw = await Evaluation.findById(req.params.id)
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .select('-anonymous_token -ip_address')
            .lean();
        
        if (!evaluationRaw) {
            res.status(404).json({ error: 'Evaluation not found' });
            return;
        }
        
        // Decrypt populated fields for admin viewing
        const teacher = evaluationRaw.teacher_id ? {
            _id: (evaluationRaw.teacher_id as any)._id,
            full_name: safeDecrypt((evaluationRaw.teacher_id as any).full_name),
            employee_id: safeDecrypt((evaluationRaw.teacher_id as any).employee_id)
        } : evaluationRaw.teacher_id;
        
        const course = evaluationRaw.course_id ? {
            _id: (evaluationRaw.course_id as any)._id,
            name: safeDecrypt((evaluationRaw.course_id as any).name),
            code: safeDecrypt((evaluationRaw.course_id as any).code)
        } : evaluationRaw.course_id;
        
        const program = evaluationRaw.program_id ? {
            _id: (evaluationRaw.program_id as any)._id,
            name: safeDecrypt((evaluationRaw.program_id as any).name)
        } : evaluationRaw.program_id;
        
        // Transform to match frontend expectation
        // Calculate averages (virtuals not available with .lean())
        const teacher_average = (
            (evaluationRaw as any).teacher_diction +
            (evaluationRaw as any).teacher_grammar +
            (evaluationRaw as any).teacher_personality +
            (evaluationRaw as any).teacher_disposition +
            (evaluationRaw as any).teacher_dynamic +
            (evaluationRaw as any).teacher_fairness
        ) / 6;
        
        const learning_average = (
            (evaluationRaw as any).learning_motivation +
            (evaluationRaw as any).learning_critical_thinking +
            (evaluationRaw as any).learning_organization +
            (evaluationRaw as any).learning_interest +
            (evaluationRaw as any).learning_explanation +
            (evaluationRaw as any).learning_clarity +
            (evaluationRaw as any).learning_integration +
            (evaluationRaw as any).learning_mastery +
            (evaluationRaw as any).learning_methodology +
            (evaluationRaw as any).learning_values +
            (evaluationRaw as any).learning_grading +
            (evaluationRaw as any).learning_synthesis +
            (evaluationRaw as any).learning_reasonableness
        ) / 13;
        
        const classroom_average = (
            (evaluationRaw as any).classroom_attendance +
            (evaluationRaw as any).classroom_policies +
            (evaluationRaw as any).classroom_discipline +
            (evaluationRaw as any).classroom_authority +
            (evaluationRaw as any).classroom_prayers +
            (evaluationRaw as any).classroom_punctuality
        ) / 6;
        
        const overall_average = (teacher_average + learning_average + classroom_average) / 3;
        
        const evaluation = {
            ...evaluationRaw,
            school_year: safeDecrypt((evaluationRaw as any).school_year), // Decrypt Evaluation's own encrypted field
            year_level: safeDecrypt((evaluationRaw as any).year_level),   // Decrypt Evaluation's own encrypted field
            status: safeDecrypt((evaluationRaw as any).status),           // Decrypt Evaluation's own encrypted field
            comments: decryptCommentsField((evaluationRaw as any).comments), // Decrypt for admin viewing
            teacher, // Use decrypted teacher
            course,  // Use decrypted course
            program, // Use decrypted program
            teacher_id: (evaluationRaw as any).teacher_id?._id,
            course_id: (evaluationRaw as any).course_id?._id,
            program_id: (evaluationRaw as any).program_id?._id,
            teacher_average,
            learning_average,
            classroom_average,
            overall_average
        };
        
        res.json({ evaluation });
    } catch (error) {
        console.error('Error fetching evaluation:', error);
        res.status(500).json({ error: 'Error fetching evaluation' });
    }
});

export default router;
