/**
 * Privacy-Preserving Scheduled Tasks
 * Handles automatic privacy protection operations
 */
interface DecouplingResult {
    success: boolean;
    decoupled?: number;
    message?: string;
    error?: string;
}
declare class PrivacyScheduler {
    /**
     * Initialize all privacy-related scheduled tasks
     */
    static initializeScheduledTasks(): void;
    /**
     * Schedule automatic decoupling of enrollment-evaluation links
     * Runs every hour to remove evaluation_id from enrollments older than 24 hours
     */
    static scheduleEnrollmentDecoupling(): void;
    /**
     * Schedule cleanup of old session data
     * Removes session data older than 7 days
     */
    static scheduleSessionCleanup(): void;
    /**
     * Manual trigger for enrollment decoupling (for admin use)
     */
    static manualDecoupling(): Promise<DecouplingResult>;
}
export default PrivacyScheduler;
//# sourceMappingURL=privacy-scheduler.d.ts.map