/**
 * Privacy Audit Utility
 * Ensures no school IDs are exposed in the evaluation pipeline
 */
interface AuditIssue {
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    timestamp: Date;
}
interface AuditWarning {
    level: string;
    title: string;
    description: string;
    recommendation: string;
    timestamp: Date;
}
interface AuditSummary {
    totalEvaluations: number;
    evaluationsChecked: number;
    issuesFound: number;
    warningsFound: number;
}
interface AuditResults {
    timestamp: Date;
    status: string;
    issues: AuditIssue[];
    warnings: AuditWarning[];
    summary: AuditSummary;
}
interface AuditConclusion {
    status: string;
    message: string;
    color: string;
}
interface AuditReport extends AuditResults {
    reportGenerated: Date;
    conclusion: AuditConclusion;
}
declare class PrivacyAuditor {
    private auditResults;
    constructor();
    /**
     * Main audit function that runs all privacy checks
     */
    runFullAudit(): Promise<AuditResults>;
    /**
     * Reset audit results
     */
    private resetAudit;
    /**
     * Check if Evaluation schema contains student_number field
     */
    private checkEvaluationSchema;
    /**
     * Check existing evaluation records for student identifiers
     */
    private checkEvaluationRecords;
    /**
     * Check enrollment linkage - verify receipt model adoption
     */
    private checkEnrollmentLinkage;
    /**
     * LAYER 1: Anonymous Token System (SHA-512)
     * Verify anonymous tokens use SHA-512 and are properly generated
     */
    private checkLayer1_AnonymousTokens;
    /**
     * LAYER 2: Submission Time Fuzzing
     * Check if timing delays are implemented to prevent correlation
     */
    private checkLayer2_SubmissionTimeFuzzing;
    /**
     * LAYER 3: IP Address Anonymization
     * Check if IP addresses are properly anonymized
     */
    private checkLayer3_IpAddressAnonymization;
    /**
     * LAYER 4: Cryptographic Receipt Model (No Reversible Links)
     * Verify that receipt-based system is active and no evaluation_id links exist
     */
    private checkLayer4_EnrollmentDecoupling;
    /**
     * LAYER 5: Timestamp Rounding
     * Check if timestamps are rounded to prevent timing attacks
     */
    private checkLayer5_TimestampRounding;
    /**
     * LAYER 6: Session Data Minimization
     * Check for session data leakage
     */
    private checkLayer6_SessionDataMinimization;
    /**
     * LAYER 7: Differential Privacy for Statistics
     * Check if Laplace noise is applied to aggregate statistics
     */
    private checkLayer7_DifferentialPrivacy;
    /**
     * LAYER 8: K-Anonymity Thresholds
     * Check if minimum group sizes are enforced (k=5 for teachers, k=10 for reports)
     */
    private checkLayer8_KAnonymity;
    /**
     * LAYER 9: Privacy-Safe Audit Logging
     * Check if audit logs avoid storing student identifiers
     */
    private checkLayer9_PrivacySafeAuditLogging;
    /**
     * LAYER 10: Pre-Storage Data Validation
     * Check if validation prevents storing identifying information
     */
    private checkLayer10_SubmissionDataValidation;
    /**
     * LAYER 11: Field-Level Encryption
     *
     * Verifies that sensitive evaluation comments are encrypted at rest using AES-256-GCM
     *
     * Threat Model Protection:
     * - MongoDB database breach
     * - Database administrator access
     * - Backup/snapshot theft
     * - Insider threat (requires both DB + server access)
     */
    private checkLayer11_FieldLevelEncryption;
    /**
     * Add a critical issue to audit results
     */
    private addIssue;
    /**
     * Add a warning to audit results
     */
    private addWarning;
    /**
     * Generate a summary report
     */
    generateReport(): AuditReport;
    /**
     * Generate conclusion based on audit results
     */
    private generateConclusion;
}
/**
 * Helper function to run a quick audit
 */
declare function runPrivacyAudit(): Promise<AuditReport>;
export { PrivacyAuditor, runPrivacyAudit };
//# sourceMappingURL=privacy-audit.d.ts.map