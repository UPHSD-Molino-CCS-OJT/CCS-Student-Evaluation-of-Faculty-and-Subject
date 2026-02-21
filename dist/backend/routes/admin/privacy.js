"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.post('/run', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const { runPrivacyAudit } = await Promise.resolve().then(() => __importStar(require('../../utils/privacy-audit')));
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
            priority: issue.severity === 'CRITICAL' ? 'high' : 'medium',
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
    }
    catch (error) {
        console.error('Error running privacy audit:', error);
        res.status(500).json({ error: 'Error running privacy audit' });
    }
});
exports.default = router;
//# sourceMappingURL=privacy.js.map