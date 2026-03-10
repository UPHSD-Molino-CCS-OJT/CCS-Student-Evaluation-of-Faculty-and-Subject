import { Router, Response } from 'express';
import Program from '../../models/Program';
import { IRequest } from '../../types';
import { safeDecrypt, safeEncrypt } from '../../utils/encryption-helpers';
import { isAuthenticated } from '../../middleware/auth';

const router: Router = Router();

router.get('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        // Fetch all programs (cannot sort by encrypted field in database)
        const programsRaw = await Program.find();
        
        // Decrypt fields and prepare for admin viewing
        const programs = programsRaw.map(p => {
            const program = p.toObject();
            return {
                ...program,
                name: safeDecrypt(program.name),
                code: safeDecrypt(program.code)
            };
        });
        
        // Sort by name in memory (after decryption)
        programs.sort((a, b) => a.name.localeCompare(b.name));
        
        // Apply pagination in memory
        const totalCount = programs.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedPrograms = programs.slice(skip, skip + limit);
        
        res.json({ 
            programs: paginatedPrograms,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching programs' });
    }
});

router.post('/', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before saving
        const programData = {
            ...req.body,
            name: safeEncrypt(req.body.name),
            code: safeEncrypt(req.body.code)
        };
        const program = await Program.create(programData);
        
        // Decrypt for response to admin
        const response = {
            ...program.toObject(),
            name: safeDecrypt(program.name),
            code: safeDecrypt(program.code)
        };
        
        res.json({ success: true, program: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before updating
        const programData = {
            ...req.body,
            name: safeEncrypt(req.body.name),
            code: safeEncrypt(req.body.code)
        };
        const program = await Program.findByIdAndUpdate(req.params.id, programData, { new: true });
        
        if (!program) {
            res.status(404).json({ message: 'Program not found' });
            return;
        }
        
        // Decrypt for response to admin
        const response = {
            ...program.toObject(),
            name: safeDecrypt(program.name),
            code: safeDecrypt(program.code)
        };
        
        res.json({ success: true, program: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Program.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

export default router;
