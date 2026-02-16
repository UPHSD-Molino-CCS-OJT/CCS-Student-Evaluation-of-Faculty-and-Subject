"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EvaluationPeriod_1 = __importDefault(require("../../models/EvaluationPeriod"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Get all evaluation periods (with pagination support)
router.get('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const totalCount = await EvaluationPeriod_1.default.countDocuments();
        const periods = await EvaluationPeriod_1.default.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalPages = Math.ceil(totalCount / limit);
        const hasMore = page < totalPages;
        res.json({
            success: true,
            periods,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore
            }
        });
    }
    catch (error) {
        console.error('Error fetching evaluation periods:', error);
        res.status(500).json({ success: false, message: 'Error fetching evaluation periods' });
    }
});
// Get active evaluation period (public endpoint)
router.get('/active', async (_req, res) => {
    try {
        const activePeriod = await EvaluationPeriod_1.default.findOne({ is_active: true }).lean();
        if (!activePeriod) {
            res.json({
                success: false,
                message: 'No active evaluation period',
                period: null
            });
            return;
        }
        res.json({
            success: true,
            period: activePeriod
        });
    }
    catch (error) {
        console.error('Error fetching active period:', error);
        res.status(500).json({ success: false, message: 'Error checking evaluation period' });
    }
});
// Create evaluation period
router.post('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        const { academic_year, semester, is_active, description } = req.body;
        // Validate required fields
        if (!academic_year || !semester) {
            res.status(400).json({
                success: false,
                message: 'Academic year and semester are required'
            });
            return;
        }
        // Validate semester
        if (!['1st Semester', '2nd Semester', 'Summer'].includes(semester)) {
            res.status(400).json({
                success: false,
                message: 'Invalid semester. Must be "1st Semester", "2nd Semester", or "Summer"'
            });
            return;
        }
        // Check for duplicate period
        const existingPeriod = await EvaluationPeriod_1.default.findOne({
            academic_year,
            semester
        });
        if (existingPeriod) {
            res.status(400).json({
                success: false,
                message: 'An evaluation period for this academic year and semester already exists'
            });
            return;
        }
        const period = new EvaluationPeriod_1.default({
            academic_year,
            semester,
            is_active: is_active || false,
            description
        });
        await period.save();
        res.status(201).json({
            success: true,
            message: 'Evaluation period created successfully',
            period
        });
    }
    catch (error) {
        console.error('Error creating evaluation period:', error);
        res.status(500).json({ success: false, message: 'Error creating evaluation period' });
    }
});
// Update evaluation period
router.put('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { academic_year, semester, is_active, description } = req.body;
        const period = await EvaluationPeriod_1.default.findById(id);
        if (!period) {
            res.status(404).json({ success: false, message: 'Evaluation period not found' });
            return;
        }
        // Validate semester if provided
        if (semester && !['1st Semester', '2nd Semester', 'Summer'].includes(semester)) {
            res.status(400).json({
                success: false,
                message: 'Invalid semester. Must be "1st Semester", "2nd Semester", or "Summer"'
            });
            return;
        }
        // Check for duplicate if academic_year or semester is being changed
        if ((academic_year && academic_year !== period.academic_year) ||
            (semester && semester !== period.semester)) {
            const existingPeriod = await EvaluationPeriod_1.default.findOne({
                academic_year: academic_year || period.academic_year,
                semester: semester || period.semester,
                _id: { $ne: id }
            });
            if (existingPeriod) {
                res.status(400).json({
                    success: false,
                    message: 'An evaluation period for this academic year and semester already exists'
                });
                return;
            }
        }
        // Update fields
        if (academic_year)
            period.academic_year = academic_year;
        if (semester)
            period.semester = semester;
        if (typeof is_active === 'boolean')
            period.is_active = is_active;
        if (description !== undefined)
            period.description = description;
        await period.save();
        res.json({
            success: true,
            message: 'Evaluation period updated successfully',
            period
        });
    }
    catch (error) {
        console.error('Error updating evaluation period:', error);
        res.status(500).json({ success: false, message: 'Error updating evaluation period' });
    }
});
// Delete evaluation period
router.delete('/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const period = await EvaluationPeriod_1.default.findByIdAndDelete(id);
        if (!period) {
            res.status(404).json({ success: false, message: 'Evaluation period not found' });
            return;
        }
        res.json({
            success: true,
            message: 'Evaluation period deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting evaluation period:', error);
        res.status(500).json({ success: false, message: 'Error deleting evaluation period' });
    }
});
// Toggle evaluation period status (activate/deactivate)
router.patch('/:id/toggle', auth_1.isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const period = await EvaluationPeriod_1.default.findById(id);
        if (!period) {
            res.status(404).json({ success: false, message: 'Evaluation period not found' });
            return;
        }
        period.is_active = !period.is_active;
        await period.save();
        res.json({
            success: true,
            message: `Evaluation period ${period.is_active ? 'activated' : 'deactivated'} successfully`,
            period
        });
    }
    catch (error) {
        console.error('Error toggling evaluation period:', error);
        res.status(500).json({ success: false, message: 'Error toggling evaluation period' });
    }
});
exports.default = router;
//# sourceMappingURL=evaluation-periods.js.map