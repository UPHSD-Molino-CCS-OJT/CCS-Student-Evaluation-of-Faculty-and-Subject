"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Program_1 = __importDefault(require("../../models/Program"));
const encryption_helpers_1 = require("../../utils/encryption-helpers");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Fetch all programs (cannot sort by encrypted field in database)
        const programsRaw = await Program_1.default.find();
        // Decrypt fields and prepare for admin viewing
        const programs = programsRaw.map(p => {
            const program = p.toObject();
            return {
                ...program,
                name: (0, encryption_helpers_1.safeDecrypt)(program.name),
                code: (0, encryption_helpers_1.safeDecrypt)(program.code)
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
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching programs' });
    }
});
router.post('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before saving
        const programData = {
            ...req.body,
            name: (0, encryption_helpers_1.safeEncrypt)(req.body.name),
            code: (0, encryption_helpers_1.safeEncrypt)(req.body.code)
        };
        const program = await Program_1.default.create(programData);
        // Decrypt for response to admin
        const response = {
            ...program.toObject(),
            name: (0, encryption_helpers_1.safeDecrypt)(program.name),
            code: (0, encryption_helpers_1.safeDecrypt)(program.code)
        };
        res.json({ success: true, program: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before updating
        const programData = {
            ...req.body,
            name: (0, encryption_helpers_1.safeEncrypt)(req.body.name),
            code: (0, encryption_helpers_1.safeEncrypt)(req.body.code)
        };
        const program = await Program_1.default.findByIdAndUpdate(req.params.id, programData, { new: true });
        if (!program) {
            res.status(404).json({ message: 'Program not found' });
            return;
        }
        // Decrypt for response to admin
        const response = {
            ...program.toObject(),
            name: (0, encryption_helpers_1.safeDecrypt)(program.name),
            code: (0, encryption_helpers_1.safeDecrypt)(program.code)
        };
        res.json({ success: true, program: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.delete('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        await Program_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=programs.js.map