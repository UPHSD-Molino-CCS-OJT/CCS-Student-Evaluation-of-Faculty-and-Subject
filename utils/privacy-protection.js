const crypto = require('crypto');

/**
 * Enhanced Privacy Protection Utility
 * Implements systematic privacy safeguards to prevent student identity linkage
 */

class PrivacyProtection {
    
    /**
     * Generate a cryptographically secure anonymous token
     * Uses multiple entropy sources to ensure complete unlinkability
     * 
     * @param {Object} enrollment - Enrollment document
     * @returns {String} - Secure anonymous token
     */
    static generateAnonymousToken(enrollment) {
        // Use multiple sources of entropy
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(32).toString('hex');
        const enrollmentHash = crypto.createHash('sha256')
            .update(enrollment._id.toString())
            .digest('hex');
        
        // Create the final token using multiple hash rounds
        const combinedInput = `${enrollmentHash}-${timestamp}-${randomBytes}`;
        const token = crypto.createHash('sha512')
            .update(combinedInput)
            .digest('hex');
        
        return token;
    }

    /**
     * Anonymize IP address to prevent tracking
     * Removes the last octet for IPv4, last 80 bits for IPv6
     * 
     * @param {String} ipAddress - Original IP address
     * @returns {String} - Anonymized IP address
     */
    static anonymizeIpAddress(ipAddress) {
        if (!ipAddress) return null;
        
        // Remove common proxy headers format
        const cleanIp = ipAddress.split(',')[0].trim();
        
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
     * @param {Number} minSeconds - Minimum delay in seconds
     * @param {Number} maxSeconds - Maximum delay in seconds
     * @returns {Number} - Delay in milliseconds
     */
    static calculateSubmissionDelay(minSeconds = 2, maxSeconds = 8) {
        const delaySeconds = minSeconds + Math.random() * (maxSeconds - minSeconds);
        return Math.floor(delaySeconds * 1000);
    }

    /**
     * Add differential privacy noise to numeric values
     * Uses Laplace mechanism for epsilon-differential privacy
     * 
     * @param {Number} value - Original value
     * @param {Number} epsilon - Privacy parameter (smaller = more private)
     * @param {Number} sensitivity - Sensitivity of the query (default 1)
     * @returns {Number} - Noised value
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
     * @param {Number} groupSize - Number of students in the group
     * @param {Number} k - Minimum group size for anonymity (default 5)
     * @returns {Boolean} - True if k-anonymity is satisfied
     */
    static checkKAnonymity(groupSize, k = 5) {
        return groupSize >= k;
    }

    /**
     * Get privacy-safe submission timestamp
     * Rounds timestamp to nearest hour to prevent correlation
     * 
     * @param {Date} timestamp - Original timestamp
     * @returns {Date} - Rounded timestamp
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
     * @returns {String} - Hex-encoded encryption key
     */
    static generateSessionKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Encrypt sensitive data temporarily during submission
     * 
     * @param {String} data - Data to encrypt
     * @param {String} key - Encryption key
     * @returns {Object} - Encrypted data with IV
     */
    static encryptTemporaryData(data, key) {
        const iv = crypto.randomBytes(16);
        const keyBuffer = Buffer.from(key, 'hex');
        const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
        
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
     * @param {String} encryptedData - Encrypted data
     * @param {String} ivHex - Initialization vector
     * @param {String} key - Decryption key
     * @returns {String} - Decrypted data
     */
    static decryptTemporaryData(encryptedData, ivHex, key) {
        const keyBuffer = Buffer.from(key, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
        
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    /**
     * Schedule evaluation-enrollment link removal
     * After a grace period, remove the link to prevent tracing
     * 
     * @param {Object} enrollment - Enrollment document
     * @param {Number} gracePeriodHours - Hours before link removal (default 24)
     * @returns {Date} - Scheduled removal time
     */
    static scheduleEnrollmentDecoupling(enrollment, gracePeriodHours = 24) {
        const removalTime = new Date();
        removalTime.setHours(removalTime.getHours() + gracePeriodHours);
        return removalTime;
    }

    /**
     * Create privacy-safe audit log entry
     * Logs actions without exposing student identities
     * 
     * @param {String} action - Action performed
     * @param {String} category - Category of action
     * @param {Object} metadata - Non-identifying metadata
     * @returns {Object} - Audit log entry
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
            audit_token: crypto.randomBytes(16).toString('hex')
        };
    }

    /**
     * Validate that evaluation data contains no identifying information
     * 
     * @param {Object} evaluationData - Evaluation data to validate
     * @returns {Object} - Validation result
     */
    static validateAnonymousSubmission(evaluationData) {
        const forbiddenFields = [
            'student_id', 'student_number', 'student_name', 
            'full_name', 'email', 'student_email'
        ];
        
        const issues = [];
        
        // Check for forbidden fields
        for (const field of forbiddenFields) {
            if (evaluationData.hasOwnProperty(field)) {
                issues.push(`Forbidden field detected: ${field}`);
            }
        }
        
        // Check for anonymous token
        if (!evaluationData.anonymous_token) {
            issues.push('Missing anonymous token');
        }
        
        // Check if IP is anonymized (should not contain specific host)
        if (evaluationData.ip_address && !evaluationData.ip_address.endsWith('.0')) {
            if (!evaluationData.ip_address.includes('::0')) {
                issues.push('IP address not properly anonymized');
            }
        }
        
        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Generate statistical noise for aggregate reporting
     * Prevents inference of individual responses from aggregates
     * 
     * @param {Array} values - Array of values to aggregate
     * @param {Number} epsilon - Privacy parameter
     * @returns {Object} - Noised statistics
     */
    static generateNoisedStatistics(values, epsilon = 0.1) {
        if (!values || values.length === 0) {
            return { error: 'No data provided' };
        }
        
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const count = values.length;
        
        // Add noise to protect individual contributions
        const noisedCount = Math.round(
            this.addDifferentialPrivacyNoise(count, epsilon, 1)
        );
        const noisedMean = 
            this.addDifferentialPrivacyNoise(mean, epsilon, 1);
        
        return {
            count: Math.max(1, noisedCount),
            mean: Math.max(1, Math.min(5, noisedMean)), // Clamp to rating range
            note: 'Statistics include differential privacy noise for protection'
        };
    }

    /**
     * Clear sensitive session data after submission
     * 
     * @param {Object} session - Express session object
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
     * @param {Date} timestamp - Submission timestamp
     * @param {Number} windowMinutes - Time window in minutes (default 15)
     * @returns {String} - Mixing pool ID
     */
    static getMixingPoolId(timestamp = new Date(), windowMinutes = 15) {
        const date = new Date(timestamp);
        const minutes = Math.floor(date.getMinutes() / windowMinutes) * windowMinutes;
        date.setMinutes(minutes, 0, 0);
        
        return crypto.createHash('sha256')
            .update(date.toISOString())
            .digest('hex');
    }

    /**
     * Check if sufficient evaluations exist to prevent statistical inference
     * 
     * @param {Number} totalEvaluations - Total evaluations in scope
     * @param {Number} minRequired - Minimum required (default 10)
     * @returns {Object} - Safety check result
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

module.exports = PrivacyProtection;
