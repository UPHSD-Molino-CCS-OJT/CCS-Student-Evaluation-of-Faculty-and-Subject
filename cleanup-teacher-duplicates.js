require('dotenv').config();
const db = require('./config/database');

async function cleanupTeacherDuplicates() {
    console.log('🔍 Checking for duplicate teachers...\n');
    
    try {
        // Find duplicate employee IDs
        const [duplicates] = await db.query(`
            SELECT employee_id, COUNT(*) as count 
            FROM teachers 
            WHERE employee_id IS NOT NULL AND employee_id != ''
            GROUP BY employee_id 
            HAVING count > 1
        `);
        
        if (duplicates.length === 0) {
            console.log('✓ No duplicate employee IDs found!');
        } else {
            console.log(`⚠️  Found ${duplicates.length} duplicate employee ID(s)\n`);
            
            for (const dup of duplicates) {
                console.log(`  Cleaning up Employee ID: "${dup.employee_id}" (${dup.count} entries)`);
                
                // Get all teachers with this employee ID
                const [teachers] = await db.query(
                    'SELECT id, full_name FROM teachers WHERE employee_id = ? ORDER BY id ASC',
                    [dup.employee_id]
                );
                
                // Keep the first one, delete the rest
                const keepId = teachers[0].id;
                const deleteIds = teachers.slice(1).map(t => t.id);
                
                if (deleteIds.length > 0) {
                    // Update evaluations to reference the kept teacher
                    await db.query(
                        'UPDATE evaluations SET teacher_id = ? WHERE teacher_id IN (?)',
                        [keepId, deleteIds]
                    );
                    
                    // Delete duplicate teachers
                    await db.query(
                        'DELETE FROM teachers WHERE id IN (?)',
                        [deleteIds]
                    );
                    
                    console.log(`    ✓ Kept ID ${keepId} (${teachers[0].full_name}), deleted ${deleteIds.length} duplicate(s)`);
                }
            }
        }
        
        // Show final teacher list
        const [teachers] = await db.query(`
            SELECT id, full_name, employee_id, department, status 
            FROM teachers 
            ORDER BY id
        `);
        
        console.log(`\n📋 Current Teachers (${teachers.length} total):`);
        teachers.forEach(t => {
            console.log(`  #${t.id}: ${t.full_name} (${t.employee_id || 'No ID'}) - ${t.department} [${t.status}]`);
        });
        
        console.log('\n✓ Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupTeacherDuplicates();
