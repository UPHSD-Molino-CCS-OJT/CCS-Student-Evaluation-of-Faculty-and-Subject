/**
 * Privacy-Preserving Scheduled Tasks
 * Handles automatic privacy protection operations
 */
declare class PrivacyScheduler {
    /**
     * Initialize all privacy-related scheduled tasks
     */
    static initializeScheduledTasks(): void;
    /**
     * Schedule cleanup of old session data
     * Removes session data older than 7 days
     */
    static scheduleSessionCleanup(): void;
}
export default PrivacyScheduler;
//# sourceMappingURL=privacy-scheduler.d.ts.map