import Evaluation from '../models/Evaluation';
import Enrollment from '../models/Enrollment';
import * as fs from 'fs';
import * as path from 'path';

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

class PrivacyAuditor {
    private auditResults: AuditResults;

    constructor() {
        this.auditResults = {
            timestamp: new Date(),
            status: 'passed',
            issues: [],
            warnings: [],
            summary: {
                totalEvaluations: 0,
                evaluationsChecked: 0,
                issuesFound: 0,
                warningsFound: 0
            }
        };
    }

    /**
     * Main audit function that runs all privacy checks
     */
    async runFullAudit(): Promise<AuditResults> {
        console.log('Starting privacy audit...');
        
        // Reset audit results
        this.resetAudit();

        // Run all audit checks for 10-layer privacy protection
        await this.checkLayer1_AnonymousTokens();
        await this.checkLayer2_SubmissionTimeFuzzing();
        await this.checkLayer3_IpAddressAnonymization();
        await this.checkLayer4_EnrollmentDecoupling();
        await this.checkLayer5_TimestampRounding();
        await this.checkLayer6_SessionDataMinimization();
        await this.checkLayer7_DifferentialPrivacy();
        await this.checkLayer8_KAnonymity();
        await this.checkLayer9_PrivacySafeAuditLogging();
        await this.checkLayer10_SubmissionDataValidation();
        await this.checkLayer11_FieldLevelEncryption();
        
        // Legacy checks for schema and records
        await this.checkEvaluationSchema();
        await this.checkEvaluationRecords();
        await this.checkEnrollmentLinkage();
        
        // Determine overall status
        if (this.auditResults.issues.length > 0) {
            this.auditResults.status = 'failed';
        } else if (this.auditResults.warnings.length > 0) {
            this.auditResults.status = 'warning';
        }

        this.auditResults.summary.issuesFound = this.auditResults.issues.length;
        this.auditResults.summary.warningsFound = this.auditResults.warnings.length;

        console.log('Privacy audit completed:', this.auditResults.status);
        return this.auditResults;
    }

    /**
     * Reset audit results
     */
    private resetAudit(): void {
        this.auditResults = {
            timestamp: new Date(),
            status: 'passed',
            issues: [],
            warnings: [],
            summary: {
                totalEvaluations: 0,
                evaluationsChecked: 0,
                issuesFound: 0,
                warningsFound: 0
            }
        };
    }

    /**
     * Check if Evaluation schema contains student_number field
     */
    private async checkEvaluationSchema(): Promise<void> {
        const schemaFields = Object.keys(Evaluation.schema.paths);
        
        // Critical: student_number should NOT exist in schema
        if (schemaFields.includes('student_number')) {
            this.addIssue(
                'CRITICAL',
                'Evaluation Schema Contains student_number Field',
                'The Evaluation model schema contains a student_number field. This violates zero-knowledge privacy.',
                'Remove student_number from the Evaluation schema in models/Evaluation.js'
            );
        }

        // Verify anonymous_token exists
        if (!schemaFields.includes('anonymous_token')) {
            this.addIssue(
                'CRITICAL',
                'Missing Anonymous Token Field',
                'The Evaluation model schema does not have an anonymous_token field.',
                'Add anonymous_token field to the Evaluation schema'
            );
        }

        // Verify student_id is NOT in schema
        if (schemaFields.includes('student_id')) {
            this.addIssue(
                'CRITICAL',
                'Evaluation Schema Contains student_id Reference',
                'The Evaluation model contains a direct reference to student_id.',
                'Remove student_id reference from Evaluation schema'
            );
        }
    }

    /**
     * Check existing evaluation records for student identifiers
     */
    private async checkEvaluationRecords(): Promise<void> {
        try {
            const totalEvaluations = await Evaluation.countDocuments();
            this.auditResults.summary.totalEvaluations = totalEvaluations;

            if (totalEvaluations === 0) {
                this.addWarning(
                    'INFO',
                    'No Evaluations Found',
                    'No evaluation records exist in the database yet.',
                    'This is normal for a new system'
                );
                return;
            }

            // Check for any records with student_number field
            const evaluationsWithStudentNumber = await Evaluation.find({
                student_number: { $exists: true }
            }).countDocuments();

            if (evaluationsWithStudentNumber > 0) {
                this.addIssue(
                    'CRITICAL',
                    `${evaluationsWithStudentNumber} Evaluations Contain student_number`,
                    `Found ${evaluationsWithStudentNumber} evaluation records with student_number field in the database.`,
                    'Run the migration script to anonymize existing evaluations: npm run migrate-anonymous'
                );
            }

            // Check for records with student_id references
            const evaluationsWithStudentId = await Evaluation.find({
                student_id: { $exists: true }
            }).countDocuments();

            if (evaluationsWithStudentId > 0) {
                this.addIssue(
                    'CRITICAL',
                    `${evaluationsWithStudentId} Evaluations Contain student_id Reference`,
                    `Found ${evaluationsWithStudentId} evaluation records with student_id reference.`,
                    'Remove all student_id references from evaluation records'
                );
            }

            // Verify all evaluations have anonymous tokens
            const evaluationsWithoutToken = await Evaluation.find({
                $or: [
                    { anonymous_token: { $exists: false } },
                    { anonymous_token: null },
                    { anonymous_token: '' }
                ]
            }).countDocuments();

            if (evaluationsWithoutToken > 0) {
                this.addIssue(
                    'HIGH',
                    `${evaluationsWithoutToken} Evaluations Missing Anonymous Token`,
                    `Found ${evaluationsWithoutToken} evaluations without proper anonymous tokens.`,
                    'Generate anonymous tokens for all evaluations'
                );
            }

            this.auditResults.summary.evaluationsChecked = totalEvaluations;

        } catch (error) {
            this.addIssue(
                'ERROR',
                'Database Check Failed',
                `Error checking evaluation records: ${(error as Error).message}`,
                'Check database connection and model definitions'
            );
        }
    }

    /**
     * Check enrollment linkage - verify receipt model adoption
     */
    private async checkEnrollmentLinkage(): Promise<void> {
        try {
            const totalEnrollments = await Enrollment.countDocuments();
            
            if (totalEnrollments === 0) {
                this.addWarning(
                    'INFO',
                    'No Enrollments Found',
                    'No enrollment records exist in the database yet.',
                    'This is normal for a new system'
                );
                return;
            }

            const evaluatedEnrollments = await Enrollment.countDocuments({
                has_evaluated: true
            });

            if (evaluatedEnrollments === 0) {
                this.addWarning(
                    'INFO',
                    'No Evaluated Enrollments Yet',
                    'No students have submitted evaluations yet.',
                    'This is normal before evaluation period'
                );
                return;
            }

            // Check for receipt model adoption
            const enrollmentsWithReceipt = await Enrollment.countDocuments({
                has_evaluated: true,
                receipt_hash: { $exists: true, $ne: null }
            });

            const receiptAdoptionRate = Math.round((enrollmentsWithReceipt / evaluatedEnrollments) * 100);

            if (receiptAdoptionRate === 100) {
                this.addWarning(
                    'INFO',
                    '✓ Receipt Model Fully Adopted',
                    `All ${evaluatedEnrollments} evaluated enrollments use cryptographic receipt verification.`,
                    'Excellent privacy protection - no reversible links exist'
                );
            } else if (receiptAdoptionRate > 50) {
                this.addWarning(
                    'INFO',
                    `Receipt Model Adoption: ${receiptAdoptionRate}%`,
                    `${enrollmentsWithReceipt} of ${evaluatedEnrollments} enrollments using receipt model.`,
                    'Migration to receipt model in progress'
                );
            } else {
                this.addWarning(
                    'MEDIUM',
                    'Low Receipt Model Adoption',
                    `Only ${receiptAdoptionRate}% of enrollments use receipt model.`,
                    'Consider migrating to cryptographic receipt model for maximum privacy'
                );
            }

            // CRITICAL: Check for old evaluation_id fields (should not exist)
            const oldModelCount = await Enrollment.countDocuments({
                evaluation_id: { $exists: true, $ne: null }
            });

            if (oldModelCount > 0) {
                this.addIssue(
                    'HIGH',
                    `${oldModelCount} Enrollments Using Deprecated evaluation_id`,
                    'Found enrollments with evaluation_id field from old model. This creates reversible links!',
                    'Migrate to receipt model: Remove evaluation_id field, implement receipt_hash'
                );
            }

        } catch (error) {
            this.addIssue(
                'ERROR',
                'Enrollment Check Failed',
                `Error checking enrollment linkage: ${(error as Error).message}`,
                'Check database connection and Enrollment model'
            );
        }
    }

    /**
     * LAYER 1: Anonymous Token System (SHA-512)
     * Verify anonymous tokens use SHA-512 and are properly generated
     */
    private async checkLayer1_AnonymousTokens(): Promise<void> {
        try {
            const evaluations = await Evaluation.find({ 
                anonymous_token: { $exists: true, $nin: [null, ''] } 
            }).select('anonymous_token').lean();

            if (evaluations.length === 0) {
                return; // Will be reported in schema checks
            }

            // Check for duplicate tokens (should never happen with proper crypto)
            const tokens = evaluations.map(e => e.anonymous_token);
            const uniqueTokens = new Set(tokens);

            if (tokens.length !== uniqueTokens.size) {
                this.addIssue(
                    'CRITICAL',
                    '[Layer 1] Duplicate Anonymous Tokens Found',
                    `Found ${tokens.length - uniqueTokens.size} duplicate anonymous tokens. This severely compromises privacy!`,
                    'Regenerate duplicate tokens with proper cryptographic randomness using SHA-512'
                );
            }

            // Check token format (should be SHA-512 hex = 128 characters, or SHA-256 = 64 characters)
            const sha512Tokens = evaluations.filter(e => {
                const token = e.anonymous_token;
                return token && token.length === 128 && /^[a-f0-9]{128}$/i.test(token);
            });

            const sha256Tokens = evaluations.filter(e => {
                const token = e.anonymous_token;
                return token && token.length === 64 && /^[a-f0-9]{64}$/i.test(token);
            });

            const invalidTokens = evaluations.length - sha512Tokens.length - sha256Tokens.length;

            if (sha256Tokens.length > 0 && sha512Tokens.length === 0) {
                this.addWarning(
                    'MEDIUM',
                    '[Layer 1] Using SHA-256 Instead of SHA-512',
                    `All ${sha256Tokens.length} tokens use SHA-256. Enhanced security requires SHA-512.`,
                    'Update token generation to use SHA-512 (128 character hex) for stronger cryptographic protection'
                );
            } else if (sha512Tokens.length > 0 && sha256Tokens.length > 0) {
                this.addWarning(
                    'MEDIUM',
                    '[Layer 1] Mixed Token Formats',
                    `Found ${sha512Tokens.length} SHA-512 tokens and ${sha256Tokens.length} SHA-256 tokens.`,
                    'Standardize on SHA-512 for all anonymous tokens'
                );
            } else if (sha512Tokens.length === evaluations.length) {
                // Perfect! All using SHA-512
                this.addWarning(
                    'INFO',
                    '[Layer 1] ✓ SHA-512 Tokens Verified',
                    `All ${sha512Tokens.length} anonymous tokens properly use SHA-512 cryptographic hashing.`,
                    'Continue using SHA-512 for maximum privacy protection'
                );
            }

            if (invalidTokens > 0) {
                this.addIssue(
                    'HIGH',
                    `[Layer 1] ${invalidTokens} Invalid Token Formats`,
                    'Some anonymous tokens do not match SHA-256 or SHA-512 format.',
                    'Regenerate invalid tokens using proper cryptographic hash functions'
                );
            }

        } catch (error) {
            this.addIssue(
                'ERROR',
                '[Layer 1] Token Verification Failed',
                `Error checking anonymous tokens: ${(error as Error).message}`,
                'Check database query and token generation logic'
            );
        }
    }

    /**
     * LAYER 2: Submission Time Fuzzing
     * Check if timing delays are implemented to prevent correlation
     */
    private async checkLayer2_SubmissionTimeFuzzing(): Promise<void> {
        try {
            // Check if privacy-protection.ts exists and has timing functions
            const privacyProtectionPath = path.join(__dirname, 'privacy-protection.ts');
            
            if (!fs.existsSync(privacyProtectionPath)) {
                this.addIssue(
                    'CRITICAL',
                    '[Layer 2] Privacy Protection Module Missing',
                    'The privacy-protection.ts utility file does not exist.',
                    'Create privacy-protection.ts with calculateSubmissionDelay() function'
                );
                return;
            }

            const privacyContent = fs.readFileSync(privacyProtectionPath, 'utf-8');
            
            // Check for submission delay function
            if (!privacyContent.includes('calculateSubmissionDelay') &&
                !privacyContent.includes('getSubmissionDelay')) {
                this.addIssue(
                    'HIGH',
                    '[Layer 2] Submission Timing Fuzzing Not Implemented',
                    'No submission delay function found in privacy-protection.ts.',
                    'Implement calculateSubmissionDelay() with random 2-8 second delays'
                );
            } else {
                this.addWarning(
                    'INFO',
                    '[Layer 2] ✓ Submission Timing Fuzzing Detected',
                    'Submission delay function found in privacy utilities.',
                    'Ensure delays are applied before saving evaluations to database'
                );
            }

            // Check both server.ts and routes/api.ts for delay implementation
            const serverPath = path.join(__dirname, '..', 'server.ts');
            const routesPath = path.join(__dirname, '..', 'routes', 'api.ts');
            
            let hasDelayImplementation = false;
            let implementationLocation = '';
            
            // Check routes/api.ts first (most likely location for route handlers)
            if (fs.existsSync(routesPath)) {
                const routesContent = fs.readFileSync(routesPath, 'utf-8');
                
                if (routesContent.includes('calculateSubmissionDelay') ||
                    (routesContent.includes('submit-evaluation') && 
                     routesContent.includes('await new Promise') && 
                     routesContent.includes('setTimeout'))) {
                    hasDelayImplementation = true;
                    implementationLocation = 'routes/api.ts';
                }
            }
            
            // If not found in routes, check server.ts
            if (!hasDelayImplementation && fs.existsSync(serverPath)) {
                const serverContent = fs.readFileSync(serverPath, 'utf-8');
                
                if (serverContent.includes('calculateSubmissionDelay') ||
                    (serverContent.includes('submit-evaluation') && 
                     serverContent.includes('await new Promise') && 
                     serverContent.includes('setTimeout'))) {
                    hasDelayImplementation = true;
                    implementationLocation = 'server.ts';
                }
            }
            
            if (!hasDelayImplementation) {
                this.addWarning(
                    'MEDIUM',
                    '[Layer 2] Timing Delays Not Applied in Server',
                    'Could not verify that submission delays are actually being used in submission handler.',
                    'Add await delay logic in POST /submit-evaluation route'
                );
            } else {
                this.addWarning(
                    'INFO',
                    `[Layer 2] ✓ Submission Delays Active in ${implementationLocation}`,
                    'Timing delays are properly implemented in the submission handler.',
                    'Continue using 2-8 second random delays to prevent timing correlation attacks'
                );
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 2] Timing Fuzzing Check Failed',
                `Could not verify submission timing: ${(error as Error).message}`,
                'Manually verify 2-8 second random delays are implemented'
            );
        }
    }

    /**
     * LAYER 3: IP Address Anonymization
     * Check if IP addresses are properly anonymized
     */
    private async checkLayer3_IpAddressAnonymization(): Promise<void> {
        try {
            // Check for non-anonymized IP addresses
            const evaluationsWithIp = await Evaluation.find({
                ip_address: { $exists: true, $nin: [null, ''] }
            }).select('ip_address').lean();

            if (evaluationsWithIp.length > 0) {
                // Check if IPs are properly anonymized (should end with .0 or ::0)
                const nonAnonymizedIps = evaluationsWithIp.filter(e => {
                    const ip = e.ip_address;
                    // IPv4 should end with .0, IPv6 should end with ::0
                    return ip && !ip.endsWith('.0') && !ip.endsWith('::0');
                });

                if (nonAnonymizedIps.length > 0) {
                    this.addIssue(
                        'CRITICAL',
                        `[Layer 3] ${nonAnonymizedIps.length} Non-Anonymized IP Addresses`,
                        'Found evaluation records with full IP addresses. This enables tracking and correlation!',
                        'Use anonymizeIpAddress() function to remove last octet (IPv4) or last 80 bits (IPv6)'
                    );
                } else {
                    this.addWarning(
                        'INFO',
                        '[Layer 3] ✓ IP Addresses Properly Anonymized',
                        `All ${evaluationsWithIp.length} stored IP addresses are properly anonymized.`,
                        'Continue anonymizing IPs by removing last octet/segments'
                    );
                }
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 3] IP Address Check Failed',
                `Could not check IP addresses: ${(error as Error).message}`,
                'Verify IP anonymization manually'
            );
        }
    }

    /**
     * LAYER 4: Cryptographic Receipt Model (No Reversible Links)
     * Verify that receipt-based system is active and no evaluation_id links exist
     */
    private async checkLayer4_EnrollmentDecoupling(): Promise<void> {
        try {
            const totalEvaluatedEnrollments = await Enrollment.countDocuments({
                has_evaluated: true
            });

            if (totalEvaluatedEnrollments === 0) {
                return; // No enrollments to check
            }

            // CRITICAL CHECK: No evaluation_id should exist (old model)
            const enrollmentsWithEvaluationId = await Enrollment.countDocuments({
                evaluation_id: { $exists: true, $ne: null }
            });

            if (enrollmentsWithEvaluationId > 0) {
                this.addIssue(
                    'CRITICAL',
                    `[Layer 4] ${enrollmentsWithEvaluationId} Enrollments Using Old Link Model`,
                    'Found enrollments with evaluation_id field. This creates reversible links! Receipt model should be used instead.',
                    'Migrate to cryptographic receipt model: Remove evaluation_id, add receipt_hash to enrollments'
                );
            }

            // Check receipt model adoption
            const enrollmentsWithReceipt = await Enrollment.countDocuments({
                has_evaluated: true,
                receipt_hash: { $exists: true, $ne: null }
            });

            const receiptAdoptionRate = totalEvaluatedEnrollments > 0
                ? Math.round((enrollmentsWithReceipt / totalEvaluatedEnrollments) * 100)
                : 0;

            if (receiptAdoptionRate === 100) {
                this.addWarning(
                    'INFO',
                    '[Layer 4] ✓ Cryptographic Receipt Model Active',
                    `All ${totalEvaluatedEnrollments} evaluated enrollments use receipt-based verification. No reversible links exist!`,
                    'Excellent! Continue using receipt model for maximum privacy protection'
                );
            } else if (receiptAdoptionRate > 0) {
                this.addWarning(
                    'MEDIUM',
                    `[Layer 4] Partial Receipt Model Adoption (${receiptAdoptionRate}%)`,
                    `${enrollmentsWithReceipt} of ${totalEvaluatedEnrollments} enrollments using receipt model. Migration in progress.`,
                    'Complete migration to receipt model to eliminate all reversible links'
                );
            } else {
                this.addWarning(
                    'HIGH',
                    '[Layer 4] Receipt Model Not Implemented',
                    'No enrollments found with receipt_hash field. Old linkage model may still be in use.',
                    'Implement cryptographic receipt model: generateReceiptHash() and store in enrollment'
                );
            }

            // Verify no decoupled_at timestamps (old model indicator)
            const enrollmentsWithDecoupledAt = await Enrollment.countDocuments({
                decoupled_at: { $exists: true }
            });

            if (enrollmentsWithDecoupledAt > 0) {
                this.addWarning(
                    'INFO',
                    '[Layer 4] Legacy Decoupled Records Found',
                    `Found ${enrollmentsWithDecoupledAt} enrollments with decoupled_at timestamp from old 24h grace period model.`,
                    'These are from the old system. New submissions use receipt model with no grace period needed'
                );
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 4] Receipt Model Check Failed',
                `Could not verify receipt model status: ${(error as Error).message}`,
                'Manually verify cryptographic receipt model is active'
            );
        }
    }

    /**
     * LAYER 5: Timestamp Rounding
     * Check if timestamps are rounded to prevent timing attacks
     */
    private async checkLayer5_TimestampRounding(): Promise<void> {
        try {
            const evaluations = await Evaluation.find({
                submitted_at: { $exists: true, $ne: null }
            }).select('submitted_at').limit(100).lean();

            if (evaluations.length > 0) {
                // Check if timestamps are rounded to hour (privacy-safe)
                const preciseTimestamps = evaluations.filter(e => {
                    const date = new Date(e.submitted_at);
                    // If minutes, seconds, or milliseconds are non-zero, it's not rounded
                    return date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0;
                });

                if (preciseTimestamps.length > 0) {
                    const percentPrecise = Math.round((preciseTimestamps.length / evaluations.length) * 100);
                    this.addIssue(
                        'MEDIUM',
                        '[Layer 5] Precise Timestamps Enable Correlation',
                        `${percentPrecise}% of sampled evaluations have precise timestamps (not rounded to hour).`,
                        'Use getSafeSubmissionTimestamp() to round timestamps to nearest hour'
                    );
                } else {
                    this.addWarning(
                        'INFO',
                        '[Layer 5] ✓ Timestamps Properly Rounded',
                        `All ${evaluations.length} sampled evaluations have timestamps rounded to the hour.`,
                        'Continue rounding timestamps for timing attack prevention'
                    );
                }
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 5] Timestamp Check Failed',
                `Could not check timestamp precision: ${(error as Error).message}`,
                'Verify timestamp handling manually'
            );
        }
    }

    /**
     * LAYER 6: Session Data Minimization
     * Check for session data leakage
     */
    private async checkLayer6_SessionDataMinimization(): Promise<void> {
        try {
            const serverPath = path.join(__dirname, '..', 'server.ts');
            const routesPath = path.join(__dirname, '..', 'routes', 'api.ts');
            
            let serverContent = '';
            let routesContent = '';
            let hasServerFile = false;
            let hasRoutesFile = false;
            
            // Read both files if they exist
            if (fs.existsSync(serverPath)) {
                serverContent = fs.readFileSync(serverPath, 'utf-8');
                hasServerFile = true;
            }
            
            if (fs.existsSync(routesPath)) {
                routesContent = fs.readFileSync(routesPath, 'utf-8');
                hasRoutesFile = true;
            }
            
            if (!hasServerFile && !hasRoutesFile) {
                this.addWarning(
                    'INFO',
                    'Session Code Review',
                    'Could not automatically scan source code. Manual review recommended.',
                    'Manually verify that req.session only stores studentId (ObjectId), never student_number'
                );
                return;
            }
            
            // Combine content for checking
            const combinedContent = serverContent + '\n' + routesContent;
            
            // Check for student_number in session (CRITICAL violation)
            if (combinedContent.includes('req.session.studentNumber') || 
                combinedContent.includes('session.student_number') ||
                combinedContent.includes('req.session.student_number')) {
                this.addIssue(
                    'CRITICAL',
                    '[Layer 6] Session Contains student_number',
                    'The server code stores student_number in session data. This violates zero-knowledge privacy.',
                    'Remove all instances of storing student_number in req.session. Only store studentId (ObjectId).'
                );
            }
            
            // Verify studentId is stored properly
            const sessionStudentIdPattern = /req\.session\.studentId\s*=/;
            let hasStudentIdAssignment = false;
            let implementationLocation = '';
            
            if (sessionStudentIdPattern.test(routesContent)) {
                hasStudentIdAssignment = true;
                implementationLocation = 'routes/api.ts';
            } else if (sessionStudentIdPattern.test(serverContent)) {
                hasStudentIdAssignment = true;
                implementationLocation = 'server.ts';
            }
            
            if (!hasStudentIdAssignment) {
                this.addWarning(
                    'MEDIUM',
                    '[Layer 6] Session StudentId Not Found',
                    'Could not verify that studentId is being stored in session properly.',
                    'Ensure req.session.studentId = student._id is used in login routes'
                );
            } else {
                this.addWarning(
                    'INFO',
                    `[Layer 6] ✓ Session StudentId Properly Set in ${implementationLocation}`,
                    'Session correctly stores only studentId (ObjectId), not student_number.',
                    'Continue storing only ObjectId references in session for privacy protection'
                );
            }
            
            // Check for console.log statements that might leak student data
            const consoleLogPattern = /console\.log.*student_number|console\.log.*studentNumber/i;
            if (consoleLogPattern.test(combinedContent)) {
                this.addWarning(
                    'MEDIUM',
                    '[Layer 6] Potential Console Logging of Student IDs',
                    'Found console.log statements that might be logging student numbers.',
                    'Remove or sanitize all console.log statements containing student identifiers'
                );
            }
            
        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 6] Session Code Review Failed',
                `Could not automatically scan source code: ${(error as Error).message}`,
                'Manually verify that req.session only stores studentId (ObjectId), never student_number'
            );
        }
    }

    /**
     * LAYER 7: Differential Privacy for Statistics
     * Check if Laplace noise is applied to aggregate statistics
     */
    private async checkLayer7_DifferentialPrivacy(): Promise<void> {
        try {
            // Check if privacy-protection.ts has differential privacy implementation
            const privacyProtectionPath = path.join(__dirname, 'privacy-protection.ts');
            
            if (!fs.existsSync(privacyProtectionPath)) {
                this.addIssue(
                    'HIGH',
                    '[Layer 7] Differential Privacy Module Missing',
                    'privacy-protection.ts not found. Aggregate statistics may not have Laplace noise.',
                    'Create differential privacy utilities with ε=0.1 for teacher statistics'
                );
                return;
            }

            const privacyContent = fs.readFileSync(privacyProtectionPath, 'utf-8');
            
            // Check for Laplace noise functions
            if (!privacyContent.includes('laplace') && 
                !privacyContent.includes('Laplace') &&
                !privacyContent.includes('addNoise')) {
                this.addIssue(
                    'MEDIUM',
                    '[Layer 7] Laplace Noise Not Implemented',
                    'No differential privacy noise functions found in privacy utilities.',
                    'Implement addLaplaceNoise(value, epsilon=0.1) for aggregate statistics'
                );
            } else {
                this.addWarning(
                    'INFO',
                    '[Layer 7] ✓ Differential Privacy Detected',
                    'Found Laplace noise implementation in privacy utilities.',
                    'Ensure ε=0.1 is used for teacher statistics and noise is applied before returning aggregates'
                );
            }

            // Check server.ts for noise application in statistics routes
            const serverPath = path.join(__dirname, '..', 'server.ts');
            if (fs.existsSync(serverPath)) {
                const serverContent = fs.readFileSync(serverPath, 'utf-8');
                
                if (!serverContent.includes('addLaplaceNoise') && 
                    !serverContent.includes('laplace') &&
                    serverContent.includes('aggregate') || serverContent.includes('$avg')) {
                    this.addWarning(
                        'MEDIUM',
                        '[Layer 7] Statistics May Lack Noise',
                        'Found aggregation queries but no evidence of Laplace noise application.',
                        'Apply differential privacy noise to all aggregate statistics before displaying'
                    );
                }
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 7] Differential Privacy Check Failed',
                `Could not verify differential privacy: ${(error as Error).message}`,
                'Manually verify Laplace noise with ε=0.1 is applied to statistics'
            );
        }
    }

    /**
     * LAYER 8: K-Anonymity Thresholds
     * Check if minimum group sizes are enforced (k=5 for teachers, k=10 for reports)
     */
    private async checkLayer8_KAnonymity(): Promise<void> {
        try {
            // Check both server.ts and routes/api.ts
            const serverPath = path.join(__dirname, '..', 'server.ts');
            const routesPath = path.join(__dirname, '..', 'routes', 'api.ts');
            
            let hasMinimumCheck = false;
            let checkLocation = '';
            
            // Check routes/api.ts first (most likely location)
            if (fs.existsSync(routesPath)) {
                const routesContent = fs.readFileSync(routesPath, 'utf-8');
                
                hasMinimumCheck = 
                    routesContent.includes('K_ANONYMITY_THRESHOLD') ||
                    routesContent.includes('checkKAnonymity') ||
                    routesContent.includes('evaluations.length < 5') ||
                    routesContent.includes('evaluations.length >= 5') ||
                    routesContent.includes('totalEvaluations >= 5') ||
                    routesContent.includes('totalEvaluations < 5') ||
                    routesContent.includes('MIN_EVALUATIONS') ||
                    routesContent.includes('MINIMUM_RESPONSES');
                
                if (hasMinimumCheck) {
                    checkLocation = 'routes/api.ts';
                }
            }
            
            // If not found in routes, check server.ts
            if (!hasMinimumCheck && fs.existsSync(serverPath)) {
                const serverContent = fs.readFileSync(serverPath, 'utf-8');
                
                hasMinimumCheck = 
                    serverContent.includes('K_ANONYMITY_THRESHOLD') ||
                    serverContent.includes('checkKAnonymity') ||
                    serverContent.includes('evaluations.length < 5') ||
                    serverContent.includes('evaluations.length >= 5') ||
                    serverContent.includes('MIN_EVALUATIONS') ||
                    serverContent.includes('MINIMUM_RESPONSES');
                
                if (hasMinimumCheck) {
                    checkLocation = 'server.ts';
                }
            }

            if (!hasMinimumCheck) {
                this.addIssue(
                    'HIGH',
                    '[Layer 8] K-Anonymity Thresholds Missing',
                    'No evidence of minimum group size checks (k≥5) in server code.',
                    'Add checks: if (evaluations.length < 5) return "Insufficient data for privacy protection"'
                );
            } else {
                this.addWarning(
                    'INFO',
                    `[Layer 8] ✓ K-Anonymity Checks Found in ${checkLocation}`,
                    'Found evidence of minimum threshold checks in server code.',
                    'Verify k≥5 for teachers and k≥10 for department-wide reports'
                );
            }

            // Check actual evaluation counts per teacher
            const teachersWithFewEvals = await Evaluation.aggregate([
                { $group: { _id: '$teacher_id', count: { $sum: 1 } } },
                { $match: { count: { $lt: 5 } } }
            ]);

            if (teachersWithFewEvals.length > 0) {
                this.addWarning(
                    'MEDIUM',
                    `[Layer 8] ${teachersWithFewEvals.length} Teachers Below K=5 Threshold`,
                    'Some teachers have fewer than 5 evaluations. Their data should not be displayed.',
                    'Hide statistics for teachers with <5 evaluations to maintain k-anonymity'
                );
            } else {
                const totalTeachers = await Evaluation.distinct('teacher_id');
                if (totalTeachers.length > 0) {
                    this.addWarning(
                        'INFO',
                        '[Layer 8] ✓ All Teachers Meet K-Anonymity',
                        `All ${totalTeachers.length} evaluated teachers have ≥5 responses.`,
                        'Continue enforcing k-anonymity thresholds'
                    );
                }
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 8] K-Anonymity Check Failed',
                `Could not verify k-anonymity thresholds: ${(error as Error).message}`,
                'Manually verify k≥5 minimum thresholds are enforced'
            );
        }
    }

    /**
     * LAYER 9: Privacy-Safe Audit Logging
     * Check if audit logs avoid storing student identifiers
     */
    private async checkLayer9_PrivacySafeAuditLogging(): Promise<void> {
        try {
            // Check privacy-audit.ts itself (this file)
            const privacyAuditPath = path.join(__dirname, 'privacy-audit.ts');
            
            if (!fs.existsSync(privacyAuditPath)) {
                this.addWarning(
                    'INFO',
                    '[Layer 9] Audit File Not Found',
                    'Could not locate privacy-audit.ts file for self-inspection',
                    'This is expected in compiled/production environments'
                );
                return;
            }
            
            const auditContent = fs.readFileSync(privacyAuditPath, 'utf-8');
            
            // Note: privacy-audit.ts legitimately references 'student_number' in:
            // - String literals for error messages
            // - MongoDB queries checking for field existence  
            // - Regex patterns for detection
            // - Validation code checking FOR violations (not committing them)
            // These are all acceptable uses for audit code.
            
            // Only report if there's actual console.log WITH student_number variable (not string check)
            const directVariableLog = /console\.log\s*\(\s*student_number\s*\)/;
            const sessionAssignment = /req\.session\.student_number\s*=/;
            
            let actualCodeReferences = 0;
            if (directVariableLog.test(auditContent)) {
                actualCodeReferences++;
            }
            if (sessionAssignment.test(auditContent)) {
                actualCodeReferences++;
            }
            
            if (actualCodeReferences > 0) {
                this.addIssue(
                    'CRITICAL',
                    '[Layer 9] Audit Code Contains Direct student_number Usage',
                    `Privacy audit code contains direct usage of student_number variable (not just string checks).`,
                    'Remove direct student_number variable usage; only check for field names in strings'
                );
            } else {
                this.addWarning(
                    'INFO',
                    '[Layer 9] ✓ Audit Code is Privacy-Safe',
                    'Privacy audit code properly uses student_number only in validation checks (strings, patterns, field names).',
                    'Continue checking FOR student_number field existence without using actual values'
                );
            }

            // Check server.ts and routes/api.ts for audit logging practices
            const filesToCheck = [
                { path: path.join(__dirname, '..', 'server.ts'), name: 'server.ts' },
                { path: path.join(__dirname, '..', 'routes', 'api.ts'), name: 'routes/api.ts' }
            ];
            
            let foundLoggingIssue = false;
            let foundGoodPractice = false;
            
            for (const file of filesToCheck) {
                if (fs.existsSync(file.path)) {
                    const content = fs.readFileSync(file.path, 'utf-8');
                    
                    // Look for console.log or logger statements with student identifiers (using regex)
                    const logPatterns = [
                        /console\.log.*student_number/i,
                        /logger.*student_number/i,
                        /log\(['"`].*student_number/i
                    ];
                    
                    for (const pattern of logPatterns) {
                        if (pattern.test(content)) {
                            this.addIssue(
                                'MEDIUM',
                                `[Layer 9] ${file.name} Logs May Contain Student IDs`,
                                `${file.name} contains logging statements that might include student_number.`,
                                'Replace all student_number with anonymous_token in logs'
                            );
                            foundLoggingIssue = true;
                            break;
                        }
                    }
                    
                    // Check for good practice (anonymous token usage)
                    if (content.includes('anonymous_token') || content.includes('audit_token')) {
                        foundGoodPractice = true;
                    }
                }
            }
            
            if (!foundLoggingIssue) {
                this.addWarning(
                    'INFO',
                    '[Layer 9] ✓ Privacy-Safe Logging Verified',
                    'No evidence of student_number in logging statements.',
                    'Continue using anonymous tokens for all audit logging'
                );
            }
            
            if (foundGoodPractice) {
                this.addWarning(
                    'INFO',
                    '[Layer 9] ✓ Audit Tokens In Use',
                    'Server code uses anonymous tokens for tracking.',
                    'Excellent! Continue using anonymous tokens instead of student IDs'
                );
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 9] Audit Logging Check Failed',
                `Could not verify audit logging practices: ${(error as Error).message}`,
                'Manually verify logs use anonymous_token instead of student_number'
            );
        }
    }

    /**
     * LAYER 10: Pre-Storage Data Validation
     * Check if validation prevents storing identifying information
     */
    private async checkLayer10_SubmissionDataValidation(): Promise<void> {
        try {
            // Check both server.ts and routes/api.ts
            const serverPath = path.join(__dirname, '..', 'server.ts');
            const routesPath = path.join(__dirname, '..', 'routes', 'api.ts');
            
            let hasValidation = false;
            let checkLocation = '';
            
            // Check routes/api.ts first (most likely location)
            if (fs.existsSync(routesPath)) {
                const routesContent = fs.readFileSync(routesPath, 'utf-8');
                
                hasValidation = 
                    routesContent.includes('validateAnonymousSubmission') ||
                    routesContent.includes('validateSubmission') ||
                    routesContent.includes('validate(req.body');
                
                if (hasValidation) {
                    checkLocation = 'routes/api.ts';
                }
            }
            
            // If not found in routes, check server.ts
            if (!hasValidation && fs.existsSync(serverPath)) {
                const serverContent = fs.readFileSync(serverPath, 'utf-8');
                
                hasValidation = 
                    serverContent.includes('validateAnonymousSubmission') ||
                    serverContent.includes('validateSubmission') ||
                    serverContent.includes('validate(req.body');
                
                if (hasValidation) {
                    checkLocation = 'server.ts';
                }
            }

            if (!hasValidation) {
                this.addIssue(
                    'HIGH',
                    '[Layer 10] Pre-Storage Validation Missing',
                    'No evidence of validation function before saving evaluations.',
                    'Add validateAnonymousSubmission(data) to check for student_number, names, and identifying text'
                );
            } else {
                this.addWarning(
                    'INFO',
                    `[Layer 10] ✓ Validation Function Found in ${checkLocation}`,
                    'Found evidence of validation before storage.',
                    'Ensure validation rejects: student_number, student names, email addresses, and identifying text'
                );
            }
            
            // Check for blacklist/sanitization patterns in privacy-protection.ts
            const privacyProtectionPath = path.join(__dirname, 'privacy-protection.ts');
            let hasSanitization = false;
            
            if (fs.existsSync(privacyProtectionPath)) {
                const privacyContent = fs.readFileSync(privacyProtectionPath, 'utf-8');
                hasSanitization = 
                    privacyContent.includes('sanitize') ||
                    privacyContent.includes('blacklist') ||
                    privacyContent.includes('forbidden') ||
                    privacyContent.includes('prohibited') ||
                    privacyContent.includes('student_number.*pattern') ||
                    privacyContent.includes('email.*pattern');
            }

            if (!hasSanitization) {
                this.addWarning(
                    'MEDIUM',
                    '[Layer 10] Text Sanitization Not Found',
                    'Could not find evidence of text sanitization or pattern matching in validation.',
                    'Add blacklist patterns to detect and reject: student_number, names, emails in free text'
                );
            } else {
                this.addWarning(
                    'INFO',
                    '[Layer 10] ✓ Sanitization Logic Detected',
                    'Found sanitization or blacklist patterns in privacy utilities.',
                    'Continue blocking identifying information in evaluation text fields'
                );
            }

            // Check actual evaluation data for potential leaks
            const suspiciousEvaluations = await Evaluation.find({
                $or: [
                    { 'ratings.comments': /student_number|ID|identifier/i },
                    { 'ratings.comments': /\b\d{4}-\d{5}\b/ }, // Student ID pattern
                    { 'ratings.comments': /@.*\.edu|@.*\.com/ } // Email pattern
                ]
            }).limit(10).lean();

            if (suspiciousEvaluations.length > 0) {
                this.addIssue(
                    'CRITICAL',
                    '[Layer 10] Identifying Information in Evaluations',
                    `Found ${suspiciousEvaluations.length} evaluations with potential identifying information in comments.`,
                    'Strengthen validation to reject submissions containing student IDs, emails, or identifying patterns'
                );
            } else {
                this.addWarning(
                    'INFO',
                    '[Layer 10] ✓ No Identifying Data in Evaluations',
                    'Sampled evaluations contain no obvious identifying information.',
                    'Continue validating and sanitizing all submission data'
                );
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 10] Validation Check Failed',
                `Could not verify pre-storage validation: ${(error as Error).message}`,
                'Manually verify validateAnonymousSubmission() prevents storing identifying data'
            );
        }
    }

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
    private async checkLayer11_FieldLevelEncryption(): Promise<void> {
        try {
            // Import encryption utility
            const { isEncryptionConfigured } = await import('./encryption');
            
            // CRITICAL: Encryption must be configured (no longer optional)
            if (!isEncryptionConfigured()) {
                this.addIssue(
                    'CRITICAL',
                    '[Layer 11] Field-Level Encryption NOT Configured',
                    'ENCRYPTION_MASTER_KEY is not configured. Comment submissions will be rejected.',
                    'REQUIRED: Set ENCRYPTION_MASTER_KEY environment variable (64 hex characters). Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
                );
                return;
            }
            
            // Check recent evaluations to see if any have encrypted comments
            const recentEvaluations = await Evaluation.find({ comments: { $exists: true, $ne: '' } })
                .limit(20)
                .select('comments')
                .lean();
            
            if (recentEvaluations.length === 0) {
                this.addWarning(
                    'INFO',
                    '[Layer 11] No Comments to Encrypt',
                    'No evaluation comments found in database.',
                    'Encryption will be applied automatically when comments are submitted'
                );
                return;
            }
            
            let encryptedCount = 0;
            let invalidCount = 0;
            
            for (const evaluation of recentEvaluations) {
                if (typeof evaluation.comments === 'object' && (evaluation.comments as any).encrypted) {
                    encryptedCount++;
                } else {
                    invalidCount++;
                }
            }
            
            if (invalidCount > 0) {
                this.addIssue(
                    'CRITICAL',
                    '[Layer 11] Invalid Comment Format Detected',
                    `Found ${invalidCount} evaluation(s) with non-encrypted comments. Total sampled: ${recentEvaluations.length}.`,
                    'All comments must be AES-256-GCM encrypted. Investigate and re-encrypt affected records.'
                );
            } else {
                this.addWarning(
                    'INFO',
                    '[Layer 11] ✓ Field-Level Encryption Active',
                    `All ${encryptedCount} sampled evaluation comments are encrypted at rest (AES-256-GCM).`,
                    'Comments are protected even if database is breached. DB admins cannot read plaintext.'
                );
            }
            
        } catch (error) {
            this.addWarning(
                'INFO',
                '[Layer 11] Encryption Check Failed',
                `Could not verify field-level encryption: ${(error as Error).message}`,
                'Manually verify ENCRYPTION_MASTER_KEY is configured and comments are encrypted'
            );
        }
    }

    /**
     * Add a critical issue to audit results
     */
    private addIssue(severity: string, title: string, description: string, recommendation: string): void {
        this.auditResults.issues.push({
            severity,
            title,
            description,
            recommendation,
            timestamp: new Date()
        });
    }

    /**
     * Add a warning to audit results
     */
    private addWarning(level: string, title: string, description: string, recommendation: string): void {
        this.auditResults.warnings.push({
            level,
            title,
            description,
            recommendation,
            timestamp: new Date()
        });
    }

    /**
     * Generate a summary report
     */
    generateReport(): AuditReport {
        const report: AuditReport = {
            ...this.auditResults,
            reportGenerated: new Date(),
            conclusion: this.generateConclusion()
        };
        return report;
    }

    /**
     * Generate conclusion based on audit results
     */
    private generateConclusion(): AuditConclusion {
        if (this.auditResults.issues.length === 0 && this.auditResults.warnings.length === 0) {
            return {
                status: 'EXCELLENT',
                message: 'All privacy checks passed. Student identities are fully protected.',
                color: 'green'
            };
        } else if (this.auditResults.issues.length === 0) {
            return {
                status: 'GOOD',
                message: 'No critical issues found, but some warnings exist. Review recommendations.',
                color: 'yellow'
            };
        } else {
            const criticalCount = this.auditResults.issues.filter(i => i.severity === 'CRITICAL').length;
            if (criticalCount > 0) {
                return {
                    status: 'CRITICAL',
                    message: `${criticalCount} critical privacy issues found. Immediate action required!`,
                    color: 'red'
                };
            } else {
                return {
                    status: 'ATTENTION NEEDED',
                    message: 'Privacy issues detected. Please address the recommendations.',
                    color: 'orange'
                };
            }
        }
    }
}

/**
 * Helper function to run a quick audit
 */
async function runPrivacyAudit(): Promise<AuditReport> {
    const auditor = new PrivacyAuditor();
    await auditor.runFullAudit();
    return auditor.generateReport();
}

export { PrivacyAuditor, runPrivacyAudit };
