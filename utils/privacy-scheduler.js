const cron = require('node-cron');
const Enrollment = require('../models/Enrollment');

/**
 * Privacy-Preserving Scheduled Tasks
 * Handles automatic privacy protection operations
 */

class PrivacyScheduler {
    
    /**
     * Initialize all privacy-related scheduled tasks
     */
    static initializeScheduledTasks() {
        console.log('🔒 Initializing privacy protection scheduled tasks...');
        
        // Decouple evaluation-enrollment links after grace period (runs every hour)
        this.scheduleEnrollmentDecoupling();
        
        // Clean up old session data (runs every 6 hours)
        this.scheduleSessionCleanup();
        
        console.log('✓ Privacy protection tasks scheduled');
    }

    /**
     * Schedule automatic decoupling of enrollment-evaluation links
     * Runs every hour to remove evaluation_id from enrollments older than 24 hours
     */
    static scheduleEnrollmentDecoupling() {
        // Run every hour at minute 0
        cron.schedule('0 * * * *', async () => {
            try {
                console.log('🔄 Running enrollment-evaluation decoupling...');
                
                const gracePeriodHours = 24;
                const cutoffTime = new Date();
                cutoffTime.setHours(cutoffTime.getHours() - gracePeriodHours);
                
                // Find enrollments that have been evaluated and are past grace period
                const result = await Enrollment.updateMany(
                    {
                        has_evaluated: true,
                        evaluation_id: { $ne: null },
                        updatedAt: { $lt: cutoffTime }
                    },
                    {
                        $unset: { evaluation_id: "" },
                        $set: { decoupled_at: new Date() }
                    }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`✓ Decoupled ${result.modifiedCount} enrollment(s)`);
                }
                
            } catch (error) {
                console.error('❌ Error during enrollment decoupling:', error);
            }
        });
    }

    /**
     * Schedule cleanup of old session data
     * Removes session data older than 7 days
     */
    static scheduleSessionCleanup() {
        // Run every 6 hours
        cron.schedule('0 */6 * * *', async () => {
            try {
                console.log('🧹 Running session cleanup...');
                
                const mongoose = require('mongoose');
                const sessionCollection = mongoose.connection.collection('sessions');
                
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                
                const result = await sessionCollection.deleteMany({
                    expires: { $lt: weekAgo }
                });
                
                if (result.deletedCount > 0) {
                    console.log(`✓ Cleaned up ${result.deletedCount} old session(s)`);
                }
                
            } catch (error) {
                console.error('❌ Error during session cleanup:', error);
            }
        });
    }

    /**
     * Manual trigger for enrollment decoupling (for admin use)
     */
    static async manualDecoupling() {
        try {
            const gracePeriodHours = 24;
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - gracePeriodHours);
            
            const result = await Enrollment.updateMany(
                {
                    has_evaluated: true,
                    evaluation_id: { $ne: null },
                    updatedAt: { $lt: cutoffTime }
                },
                {
                    $unset: { evaluation_id: "" },
                    $set: { decoupled_at: new Date() }
                }
            );
            
            return {
                success: true,
                decoupled: result.modifiedCount,
                message: `Successfully decoupled ${result.modifiedCount} enrollment(s)`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = PrivacyScheduler;
