import { IEnrollment } from '../types';
import { Types } from 'mongoose';
/**
 * Enhanced Privacy Protection Utility
 * Implements systematic privacy safeguards to prevent student identity linkage
 */
interface EncryptedData {
    encrypted: string;
    iv: string;
}
interface AuditLogEntry {
    timestamp: Date;
    action: string;
    category: string;
    metadata: Record<string, any>;
    audit_token: string;
}
interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
interface NoisedStatistics {
    count: number;
    mean: number;
    note: string;
}
interface StatisticalSafetyResult {
    isSafe: boolean;
    count: number;
    minRequired: number;
    message: string;
}
declare class PrivacyProtection {
    /**
     * Generate a cryptographically secure anonymous token
     * Uses multiple entropy sources to ensure complete unlinkability
     *
     * @param enrollment - Enrollment document
     * @returns Secure anonymous token
     */
    static generateAnonymousToken(enrollment: IEnrollment | {
        _id: Types.ObjectId | string;
    }): string;
    /**
     * Anonymize IP address to prevent tracking
     * Removes the last octet for IPv4, last 80 bits for IPv6
     *
     * @param ipAddress - Original IP address
     * @returns Anonymized IP address
     */
    static anonymizeIpAddress(ipAddress: string | string[] | undefined): string | null;
    /**
     * Calculate submission delay to prevent timing correlation attacks
     * Returns a random delay between min and max seconds
     *
     * @param minSeconds - Minimum delay in seconds
     * @param maxSeconds - Maximum delay in seconds
     * @returns Delay in milliseconds
     */
    static calculateSubmissionDelay(minSeconds?: number, maxSeconds?: number): number;
    /**
     * Add differential privacy noise to numeric values
     * Uses Laplace mechanism for epsilon-differential privacy
     *
     * @param value - Original value
     * @param epsilon - Privacy parameter (smaller = more private)
     * @param sensitivity - Sensitivity of the query (default 1)
     * @returns Noised value
     */
    static addDifferentialPrivacyNoise(value: number, epsilon?: number, sensitivity?: number): number;
    /**
     * Check if a group satisfies k-anonymity
     * Ensures at least k students in a group before revealing statistics
     *
     * @param groupSize - Number of students in the group
     * @param k - Minimum group size for anonymity (default 5)
     * @returns True if k-anonymity is satisfied
     */
    static checkKAnonymity(groupSize: number, k?: number): boolean;
    /**
     * Get privacy-safe submission timestamp
     * Rounds timestamp to nearest hour to prevent correlation
     *
     * @param timestamp - Original timestamp
     * @returns Rounded timestamp
     */
    static getSafeSubmissionTimestamp(timestamp?: Date): Date;
    /**
     * Generate a session-specific encryption key
     * Used for temporary data encryption during submission process
     *
     * @returns Hex-encoded encryption key
     */
    static generateSessionKey(): string;
    /**
     * Encrypt sensitive data temporarily during submission
     *
     * @param data - Data to encrypt
     * @param key - Encryption key
     * @returns Encrypted data with IV
     */
    static encryptTemporaryData(data: string, key: string): EncryptedData;
    /**
     * Decrypt temporarily encrypted data
     *
     * @param encryptedData - Encrypted data
     * @param ivHex - Initialization vector
     * @param key - Decryption key
     * @returns Decrypted data
     */
    static decryptTemporaryData(encryptedData: string, ivHex: string, key: string): string;
    /**
     * Generate one-time submission token for enrollment
     * Used to prevent duplicate submissions without linking to evaluation
     *
     * @param enrollmentId - Enrollment ObjectId
     * @returns One-time submission token (SHA-256)
     */
    static generateSubmissionToken(enrollmentId: string | Types.ObjectId): string;
    /**
     * Generate verification receipt for student
     * Student can use this to verify their submission without revealing identity
     *
     * @param anonymousToken - Evaluation's anonymous token
     * @param timestamp - Submission timestamp
     * @returns Receipt hash that student can save
     */
    static generateReceiptHash(anonymousToken: string, timestamp: Date): string;
    /**
     * Verify submission receipt (if needed for support)
     * Allows verification without revealing student identity
     *
     * @param receipt - Receipt hash provided by student
     * @param anonymousToken - Anonymous token from evaluation
     * @param timestamp - Submission timestamp
     * @returns True if receipt matches
     */
    static verifyReceipt(receipt: string, anonymousToken: string, timestamp: Date): boolean;
    /**
     * Create privacy-safe audit log entry
     * Logs actions without exposing student identities
     *
     * @param action - Action performed
     * @param category - Category of action
     * @param metadata - Non-identifying metadata
     * @returns Audit log entry
     */
    static createPrivacySafeAuditLog(action: string, category: string, metadata?: Record<string, any>): AuditLogEntry;
    /**
     * Validate that evaluation data contains no identifying information (Layer 10 + Layer 12)
     *
     * @param evaluationData - Evaluation data to validate
     * @returns Validation result
     */
    static validateAnonymousSubmission(evaluationData: Record<string, any>): ValidationResult;
    /**
     * Generate statistical noise for aggregate reporting
     * Prevents inference of individual responses from aggregates
     *
     * @param values - Array of values to aggregate
     * @param epsilon - Privacy parameter
     * @returns Noised statistics
     */
    static generateNoisedStatistics(values: number[], epsilon?: number): NoisedStatistics | {
        error: string;
    };
    /**
     * Clear sensitive session data after submission
     *
     * @param session - Express session object
     */
    static clearSensitiveSessionData(session: Record<string, any>): void;
    /**
     * Generate a mixing pool ID for batch submission
     * Groups evaluations by time window for submission mixing
     *
     * @param timestamp - Submission timestamp
     * @param windowMinutes - Time window in minutes (default 15)
     * @returns Mixing pool ID
     */
    static getMixingPoolId(timestamp?: Date, windowMinutes?: number): string;
    /**
     * Check if sufficient evaluations exist to prevent statistical inference
     *
     * @param totalEvaluations - Total evaluations in scope
     * @param minRequired - Minimum required (default 10)
     * @returns Safety check result
     */
    static checkStatisticalSafety(totalEvaluations: number, minRequired?: number): StatisticalSafetyResult;
    /**
     * LAYER 12: Stylometric Attack Protection
     *
     * Sanitize comment text to reduce stylometric fingerprinting risk.
     * Threat Model: Teacher/admin knows student writing patterns
     *
     * Protections Applied:
     * - Normalize excessive punctuation (!!!, ???, ..., etc.)
     * - Strip excessive whitespace/newlines
     * - Enforce length constraints (20-500 chars)
     * - Preserve semantic content while reducing style markers
     *
     * Note: This is NOT perfect — human writing style is hard to fully anonymize.
     * Primary defense: User warning to avoid identifying language.
     *
     * @param comment - Raw comment text
     * @returns Sanitized comment or validation error
     */
    static sanitizeCommentForAnonymity(comment: string): {
        sanitized: string;
        valid: boolean;
        error?: string;
    };
}
export default PrivacyProtection;
//# sourceMappingURL=privacy-protection.d.ts.map