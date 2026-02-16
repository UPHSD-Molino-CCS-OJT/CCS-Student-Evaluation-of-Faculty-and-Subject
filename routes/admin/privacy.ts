import { Router, Response } from 'express';
import { IRequest } from '../../types';
import { isAuthenticated } from '../../middleware/auth';

const router: Router = Router();

router.post('/run', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        const { runPrivacyAudit } = await import('../../utils/privacy-audit');
        const auditReport = await runPrivacyAudit();
        
        // Transform AuditReport into DetailedAuditResults format expected by frontend
        const checks = [
            // Add issues as failed checks
            ...auditReport.issues.map(issue => ({
                name: issue.title,
                description: issue.description,
                passed: false,
                details: issue.recommendation
            })),
            // Add warnings as passed checks (INFO level warnings are informational, not failures)
            ...auditReport.warnings.map(warning => ({
                name: warning.title,
                description: warning.description,
                passed: warning.level === 'INFO',
                details: warning.recommendation
            }))
        ];
        
        const failed_checks = checks.filter(c => !c.passed).length;
        const passed_checks = checks.filter(c => c.passed).length;
        const total_checks = checks.length;
        
        // Transform issues into recommendations
        const recommendations = auditReport.issues.map(issue => ({
            priority: issue.severity === 'CRITICAL' ? 'high' as const : 'medium' as const,
            title: issue.title,
            description: issue.recommendation
        }));
        
        const results = {
            overall_compliance: auditReport.issues.length === 0,
            total_checks,
            passed_checks,
            failed_checks,
            checks,
            recommendations,
            timestamp: auditReport.timestamp
        };
        
        res.json({ results });
    } catch (error) {
        console.error('Error running privacy audit:', error);
        res.status(500).json({ error: 'Error running privacy audit' });
    }
});

export default router;
