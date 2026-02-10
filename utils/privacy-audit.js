const mongoose = require('mongoose');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');

/**
 * Privacy Audit Utility
 * Ensures no school IDs are exposed in the evaluation pipeline
 */

class PrivacyAuditor {
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
    async runFullAudit() {
        console.log('Starting privacy audit...');
        
        // Reset audit results
        this.resetAudit();

        // Run all audit checks
        await this.checkEvaluationSchema();
        await this.checkEvaluationRecords();
        await this.checkEnrollmentLinkage();
        await this.checkAnonymousTokens();
        await this.checkSessionData();
        await this.checkIpAddressAnonymization();
        await this.checkTimestampPrivacy();
        await this.checkEnrollmentDecoupling();
        
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
    resetAudit() {
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
    async checkEvaluationSchema() {
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
    async checkEvaluationRecords() {
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
                `Error checking evaluation records: ${error.message}`,
                'Check database connection and model definitions'
            );
        }
    }

    /**
     * Check enrollment linkage to ensure evaluation IDs don't expose student info
     */
    async checkEnrollmentLinkage() {
        try {
            // Check if enrollments properly track has_evaluated flag
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

            // Verify enrollments that reference evaluation_id are properly flagged
            const evaluatedEnrollments = await Enrollment.find({
                evaluation_id: { $exists: true, $ne: null }
            }).countDocuments();

            const flaggedEvaluated = await Enrollment.find({
                has_evaluated: true
            }).countDocuments();

            if (evaluatedEnrollments !== flaggedEvaluated) {
                this.addWarning(
                    'MEDIUM',
                    'Enrollment Flag Mismatch',
                    `Found ${evaluatedEnrollments} enrollments with evaluation_id but ${flaggedEvaluated} flagged as evaluated.`,
                    'Ensure has_evaluated flag is properly set when evaluations are submitted'
                );
            }

        } catch (error) {
            this.addIssue(
                'ERROR',
                'Enrollment Check Failed',
                `Error checking enrollment linkage: ${error.message}`,
                'Check database connection and Enrollment model'
            );
        }
    }

    /**
     * Verify anonymous tokens are properly generated and unique
     */
    async checkAnonymousTokens() {
        try {
            const evaluations = await Evaluation.find({ 
                anonymous_token: { $exists: true, $ne: null, $ne: '' } 
            }).select('anonymous_token').lean();

            if (evaluations.length === 0) {
                return; // Already reported in checkEvaluationRecords
            }

            // Check for duplicate tokens (should never happen with proper crypto)
            const tokens = evaluations.map(e => e.anonymous_token);
            const uniqueTokens = new Set(tokens);

            if (tokens.length !== uniqueTokens.size) {
                this.addIssue(
                    'HIGH',
                    'Duplicate Anonymous Tokens Found',
                    `Found ${tokens.length - uniqueTokens.size} duplicate anonymous tokens.`,
                    'Regenerate duplicate tokens with proper cryptographic randomness'
                );
            }

            // Check token format (should be SHA-256 hex = 64 characters)
            const invalidTokens = evaluations.filter(e => {
                const token = e.anonymous_token;
                return !token || token.length !== 64 || !/^[a-f0-9]{64}$/i.test(token);
            });

            if (invalidTokens.length > 0) {
                this.addWarning(
                    'MEDIUM',
                    `${invalidTokens.length} Invalid Token Formats`,
                    'Some anonymous tokens do not match the expected SHA-256 or SHA-512 format.',
                    'Ensure tokens are generated using proper cryptographic hash functions'
                );
            }

        } catch (error) {
            this.addIssue(
                'ERROR',
                'Token Verification Failed',
                `Error checking anonymous tokens: ${error.message}`,
                'Check database query and token generation logic'
            );
        }
    }

    /**
     * Check IP address anonymization
     */
    async checkIpAddressAnonymization() {
        try {
            // Check for non-anonymized IP addresses
            const evaluationsWithIp = await Evaluation.find({
                ip_address: { $exists: true, $ne: null, $ne: '' }
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
                        'HIGH',
                        `${nonAnonymizedIps.length} Non-Anonymized IP Addresses`,
                        'Found evaluation records with non-anonymized IP addresses.',
                        'Update IP anonymization logic to remove last octet/segments'
                    );
                }

                this.addWarning(
                    'INFO',
                    'IP Addresses Stored',
                    `${evaluationsWithIp.length} evaluations contain IP addresses (${evaluationsWithIp.length - nonAnonymizedIps.length} properly anonymized).`,
                    'Consider if IP storage is necessary for your use case'
                );
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                'IP Address Check Failed',
                `Could not check IP addresses: ${error.message}`,
                'Verify IP anonymization manually'
            );
        }
    }

    /**
     * Check timestamp privacy (timestamps should be rounded)
     */
    async checkTimestampPrivacy() {
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
                    this.addWarning(
                        'MEDIUM',
                        'Precise Timestamps Detected',
                        `${percentPrecise}% of sampled evaluations have precise timestamps (not rounded to hour).`,
                        'Consider rounding timestamps to nearest hour to prevent timing correlation attacks'
                    );
                }
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                'Timestamp Check Failed',
                `Could not check timestamp precision: ${error.message}`,
                'Verify timestamp handling manually'
            );
        }
    }

    /**
     * Check enrollment decoupling
     */
    async checkEnrollmentDecoupling() {
        try {
            const totalEvaluatedEnrollments = await Enrollment.countDocuments({
                has_evaluated: true
            });

            const enrollmentsWithLink = await Enrollment.countDocuments({
                has_evaluated: true,
                evaluation_id: { $exists: true, $ne: null }
            });

            const decoupledEnrollments = await Enrollment.countDocuments({
                has_evaluated: true,
                decoupled_at: { $exists: true, $ne: null }
            });

            if (totalEvaluatedEnrollments > 0) {
                const percentLinked = Math.round((enrollmentsWithLink / totalEvaluatedEnrollments) * 100);
                const percentDecoupled = Math.round((decoupledEnrollments / totalEvaluatedEnrollments) * 100);

                this.addWarning(
                    'INFO',
                    'Enrollment-Evaluation Linkage Status',
                    `${percentLinked}% of evaluated enrollments still linked, ${percentDecoupled}% decoupled.`,
                    'Links are automatically removed after 24 hours for privacy protection'
                );

                // Check if any links are older than grace period
                const gracePeriodHours = 24;
                const cutoffTime = new Date();
                cutoffTime.setHours(cutoffTime.getHours() - gracePeriodHours);

                const oldLinks = await Enrollment.countDocuments({
                    has_evaluated: true,
                    evaluation_id: { $exists: true, $ne: null },
                    updatedAt: { $lt: cutoffTime }
                });

                if (oldLinks > 0) {
                    this.addWarning(
                        'MEDIUM',
                        `${oldLinks} Old Enrollment Links`,
                        'Found enrollment-evaluation links older than 24 hours that should be decoupled.',
                        'Run manual decoupling or verify privacy scheduler is running'
                    );
                }
            }

        } catch (error) {
            this.addWarning(
                'INFO',
                'Enrollment Decoupling Check Failed',
                `Could not check decoupling status: ${error.message}`,
                'Verify enrollment decoupling manually'
            );
        }
    }

    /**
     * Check for session data leakage
     * This checks the source code for session variable usage
     */
    async checkSessionData() {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const serverJsPath = path.join(__dirname, '..', 'server.js');
            const serverContent = fs.readFileSync(serverJsPath, 'utf-8');
            
            // Check for student_number in session
            if (serverContent.includes('req.session.studentNumber') || 
                serverContent.includes('session.student_number') ||
                serverContent.includes('req.session.student_number')) {
                this.addIssue(
                    'CRITICAL',
                    'Session Contains student_number',
                    'The server.js file stores student_number in session data. This violates zero-knowledge privacy.',
                    'Remove all instances of storing student_number in req.session. Only store studentId (ObjectId).'
                );
            }
            
            // Verify only studentId is stored
            const sessionStudentIdPattern = /req\.session\.studentId\s*=/;
            if (!sessionStudentIdPattern.test(serverContent)) {
                this.addWarning(
                    'MEDIUM',
                    'Session StudentId Not Found',
                    'Could not verify that studentId is being stored in session properly.',
                    'Ensure req.session.studentId = student._id is used in login routes'
                );
            }
            
            // Check for console.log statements that might leak student data
            const consoleLogPattern = /console\.log.*student_number|console\.log.*studentNumber/i;
            if (consoleLogPattern.test(serverContent)) {
                this.addWarning(
                    'MEDIUM',
                    'Potential Console Logging of Student IDs',
                    'Found console.log statements that might be logging student numbers.',
                    'Remove or sanitize all console.log statements containing student identifiers'
                );
            }
            
        } catch (error) {
            this.addWarning(
                'INFO',
                'Session Code Review',
                'Could not automatically scan source code. Manual review recommended.',
                'Manually verify that req.session only stores studentId (ObjectId), never student_number'
            );
        }
    }

    /**
     * Add a critical issue to audit results
     */
    addIssue(severity, title, description, recommendation) {
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
    addWarning(level, title, description, recommendation) {
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
    generateReport() {
        const report = {
            ...this.auditResults,
            reportGenerated: new Date(),
            conclusion: this.generateConclusion()
        };
        return report;
    }

    /**
     * Generate conclusion based on audit results
     */
    generateConclusion() {
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
async function runPrivacyAudit() {
    const auditor = new PrivacyAuditor();
    const results = await auditor.runFullAudit();
    return auditor.generateReport();
}

module.exports = {
    PrivacyAuditor,
    runPrivacyAudit
};
