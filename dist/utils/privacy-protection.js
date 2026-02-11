"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
class PrivacyProtection {
    /**
     * Generate a cryptographically secure anonymous token
     * Uses multiple entropy sources to ensure complete unlinkability
     *
     * @param enrollment - Enrollment document
     * @returns Secure anonymous token
     */
    static generateAnonymousToken(enrollment) {
        // Use multiple sources of entropy
        const timestamp = Date.now();
        const randomBytes = crypto_1.default.randomBytes(32).toString('hex');
        const enrollmentHash = crypto_1.default.createHash('sha256')
            .update(enrollment._id.toString())
            .digest('hex');
        // Create the final token using multiple hash rounds
        const combinedInput = `${enrollmentHash}-${timestamp}-${randomBytes}`;
        const token = crypto_1.default.createHash('sha512')
            .update(combinedInput)
            .digest('hex');
        return token;
    }
    /**
     * Anonymize IP address to prevent tracking
     * Removes the last octet for IPv4, last 80 bits for IPv6
     *
     * @param ipAddress - Original IP address
     * @returns Anonymized IP address
     */
    static anonymizeIpAddress(ipAddress) {
        if (!ipAddress)
            return null;
        // Remove common proxy headers format
        const cleanIp = (Array.isArray(ipAddress) ? ipAddress[0] : ipAddress).split(',')[0].trim();
        // IPv4 anonymization - remove last octet
        if (cleanIp.includes('.')) {
            const parts = cleanIp.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
            }
        }
        // IPv6 anonymization - remove last 80 bits (5 groups)
        if (cleanIp.includes(':')) {
            const parts = cleanIp.split(':');
            if (parts.length >= 3) {
                return `${parts.slice(0, 3).join(':')}::0`;
            }
        }
        // If format unknown, return null for safety
        return null;
    }
    /**
     * Calculate submission delay to prevent timing correlation attacks
     * Returns a random delay between min and max seconds
     *
     * @param minSeconds - Minimum delay in seconds
     * @param maxSeconds - Maximum delay in seconds
     * @returns Delay in milliseconds
     */
    static calculateSubmissionDelay(minSeconds = 2, maxSeconds = 8) {
        const delaySeconds = minSeconds + Math.random() * (maxSeconds - minSeconds);
        return Math.floor(delaySeconds * 1000);
    }
    /**
     * Add differential privacy noise to numeric values
     * Uses Laplace mechanism for epsilon-differential privacy
     *
     * @param value - Original value
     * @param epsilon - Privacy parameter (smaller = more private)
     * @param sensitivity - Sensitivity of the query (default 1)
     * @returns Noised value
     */
    static addDifferentialPrivacyNoise(value, epsilon = 0.1, sensitivity = 1) {
        const scale = sensitivity / epsilon;
        // Generate Laplace noise
        const u = Math.random() - 0.5;
        const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
        return Math.max(0, value + noise); // Ensure non-negative
    }
    /**
     * Check if a group satisfies k-anonymity
     * Ensures at least k students in a group before revealing statistics
     *
     * @param groupSize - Number of students in the group
     * @param k - Minimum group size for anonymity (default 5)
     * @returns True if k-anonymity is satisfied
     */
    static checkKAnonymity(groupSize, k = 5) {
        return groupSize >= k;
    }
    /**
     * Get privacy-safe submission timestamp
     * Rounds timestamp to nearest hour to prevent correlation
     *
     * @param timestamp - Original timestamp
     * @returns Rounded timestamp
     */
    static getSafeSubmissionTimestamp(timestamp = new Date()) {
        const date = new Date(timestamp);
        date.setMinutes(0, 0, 0); // Round to nearest hour
        return date;
    }
    /**
     * Generate a session-specific encryption key
     * Used for temporary data encryption during submission process
     *
     * @returns Hex-encoded encryption key
     */
    static generateSessionKey() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Encrypt sensitive data temporarily during submission
     *
     * @param data - Data to encrypt
     * @param key - Encryption key
     * @returns Encrypted data with IV
     */
    static encryptTemporaryData(data, key) {
        const iv = crypto_1.default.randomBytes(16);
        const keyBuffer = Buffer.from(key, 'hex');
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', keyBuffer, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            encrypted,
            iv: iv.toString('hex')
        };
    }
    /**
     * Decrypt temporarily encrypted data
     *
     * @param encryptedData - Encrypted data
     * @param ivHex - Initialization vector
     * @param key - Decryption key
     * @returns Decrypted data
     */
    static decryptTemporaryData(encryptedData, ivHex, key) {
        const keyBuffer = Buffer.from(key, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', keyBuffer, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    /**
     * Generate one-time submission token for enrollment
     * Used to prevent duplicate submissions without linking to evaluation
     *
     * @param enrollmentId - Enrollment ObjectId
     * @returns One-time submission token (SHA-256)
     */
    static generateSubmissionToken(enrollmentId) {
        const timestamp = Date.now();
        const randomBytes = crypto_1.default.randomBytes(32).toString('hex');
        const enrollmentHash = crypto_1.default.createHash('sha256')
            .update(enrollmentId.toString())
            .digest('hex');
        const combinedInput = `${enrollmentHash}-${timestamp}-${randomBytes}`;
        const token = crypto_1.default.createHash('sha256')
            .update(combinedInput)
            .digest('hex');
        return token;
    }
    /**
     * Generate verification receipt for student
     * Student can use this to verify their submission without revealing identity
     *
     * @param anonymousToken - Evaluation's anonymous token
     * @param timestamp - Submission timestamp
     * @returns Receipt hash that student can save
     */
    static generateReceiptHash(anonymousToken, timestamp) {
        const receiptData = `${anonymousToken}-${timestamp.toISOString()}`;
        const receipt = crypto_1.default.createHash('sha256')
            .update(receiptData)
            .digest('hex');
        return receipt.substring(0, 16); // Return first 16 chars for user-friendly receipt
    }
    /**
     * Verify submission receipt (if needed for support)
     * Allows verification without revealing student identity
     *
     * @param receipt - Receipt hash provided by student
     * @param anonymousToken - Anonymous token from evaluation
     * @param timestamp - Submission timestamp
     * @returns True if receipt matches
     */
    static verifyReceipt(receipt, anonymousToken, timestamp) {
        const expectedReceipt = this.generateReceiptHash(anonymousToken, timestamp);
        return receipt === expectedReceipt;
    }
    /**
     * Create privacy-safe audit log entry
     * Logs actions without exposing student identities
     *
     * @param action - Action performed
     * @param category - Category of action
     * @param metadata - Non-identifying metadata
     * @returns Audit log entry
     */
    static createPrivacySafeAuditLog(action, category, metadata = {}) {
        return {
            timestamp: new Date(),
            action,
            category,
            metadata: {
                ...metadata,
                // Never include: student_id, student_number, student names
                // Only include aggregate or non-identifying info
            },
            audit_token: crypto_1.default.randomBytes(16).toString('hex')
        };
    }
    /**
     * Validate that evaluation data contains no identifying information
     *
     * @param evaluationData - Evaluation data to validate
     * @returns Validation result
     */
    static validateAnonymousSubmission(evaluationData) {
        const forbiddenFields = [
            'student_id', 'student_number', 'student_name',
            'full_name', 'email', 'student_email'
        ];
        const errors = [];
        // Check for forbidden fields
        for (const field of forbiddenFields) {
            if (evaluationData.hasOwnProperty(field)) {
                errors.push(`Forbidden field detected: ${field}. This violates privacy protection.`);
            }
        }
        // Check comments for identifying patterns
        if (evaluationData.comments && typeof evaluationData.comments === 'string') {
            const comments = evaluationData.comments;
            // Pattern: Student ID format (XX-XXXX-XXX or similar)
            if (/\b\d{2,4}[-\s]\d{4,5}[-\s]\d{3,5}\b/.test(comments)) {
                errors.push('Comments contain potential student ID pattern');
            }
            // Pattern: Email addresses
            if (/@[\w\.-]+\.(edu|com|org|net)/i.test(comments)) {
                errors.push('Comments contain email address');
            }
            // Pattern: Phone numbers
            if (/\b\d{3}[-\s.]?\d{3}[-\s.]?\d{4}\b/.test(comments)) {
                errors.push('Comments contain potential phone number');
            }
            // Keywords that might identify students
            const identifyingKeywords = [
                /\bmy\s+student\s+(number|id)\b/i,
                /\bi\s+am\s+[A-Z][a-z]+\s+[A-Z][a-z]+/, // "I am FirstName LastName"
                /\bthis\s+is\s+[A-Z][a-z]+\s+[A-Z][a-z]+/, // "This is FirstName LastName"
                /\bstudent\s+number:\s*\d+/i,
                /\bemail:\s*\S+@/i
            ];
            for (const pattern of identifyingKeywords) {
                if (pattern.test(comments)) {
                    errors.push('Comments contain self-identifying information');
                    break; // Only add this error once
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Generate statistical noise for aggregate reporting
     * Prevents inference of individual responses from aggregates
     *
     * @param values - Array of values to aggregate
     * @param epsilon - Privacy parameter
     * @returns Noised statistics
     */
    static generateNoisedStatistics(values, epsilon = 0.1) {
        if (!values || values.length === 0) {
            return { error: 'No data provided' };
        }
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const count = values.length;
        // Add noise to protect individual contributions
        const noisedCount = Math.round(this.addDifferentialPrivacyNoise(count, epsilon, 1));
        const noisedMean = this.addDifferentialPrivacyNoise(mean, epsilon, 1);
        return {
            count: Math.max(1, noisedCount),
            mean: Math.max(1, Math.min(5, noisedMean)), // Clamp to rating range
            note: 'Statistics include differential privacy noise for protection'
        };
    }
    /**
     * Clear sensitive session data after submission
     *
     * @param session - Express session object
     */
    static clearSensitiveSessionData(session) {
        // Keep only the studentId for authentication
        // Remove any other potentially identifying data
        const studentId = session.studentId;
        // Clear all session data
        Object.keys(session).forEach(key => {
            if (key !== 'cookie' && key !== 'studentId') {
                delete session[key];
            }
        });
        // Restore only essential data
        session.studentId = studentId;
        session.lastActivity = Date.now();
    }
    /**
     * Generate a mixing pool ID for batch submission
     * Groups evaluations by time window for submission mixing
     *
     * @param timestamp - Submission timestamp
     * @param windowMinutes - Time window in minutes (default 15)
     * @returns Mixing pool ID
     */
    static getMixingPoolId(timestamp = new Date(), windowMinutes = 15) {
        const date = new Date(timestamp);
        const minutes = Math.floor(date.getMinutes() / windowMinutes) * windowMinutes;
        date.setMinutes(minutes, 0, 0);
        return crypto_1.default.createHash('sha256')
            .update(date.toISOString())
            .digest('hex');
    }
    /**
     * Check if sufficient evaluations exist to prevent statistical inference
     *
     * @param totalEvaluations - Total evaluations in scope
     * @param minRequired - Minimum required (default 10)
     * @returns Safety check result
     */
    static checkStatisticalSafety(totalEvaluations, minRequired = 10) {
        const isSafe = totalEvaluations >= minRequired;
        return {
            isSafe,
            count: totalEvaluations,
            minRequired,
            message: isSafe
                ? 'Safe to display statistics'
                : `Insufficient data (${totalEvaluations}/${minRequired}). Statistics hidden for privacy.`
        };
    }
}
exports.default = PrivacyProtection;
//# sourceMappingURL=privacy-protection.js.map