require('dotenv').config();
const db = require('./config/database');

async function cleanupCourseDuplicates() {
    console.log('🔍 Checking for duplicate courses...\n');
    
    try {
        // Find duplicate courses (same name and program_id)
        const [duplicates] = await db.query(`
            SELECT name, program_id, COUNT(*) as count 
            FROM courses 
            GROUP BY name, program_id 
            HAVING count > 1
        `);
        
        if (duplicates.length === 0) {
            console.log('✓ No duplicate courses found!');
        } else {
            console.log(`⚠️  Found ${duplicates.length} duplicate course(s)\n`);
            
            for (const dup of duplicates) {
                console.log(`  Cleaning up: "${dup.name}" in Program ID ${dup.program_id} (${dup.count} entries)`);
                
                // Get all IDs for this course
                const [courses] = await db.query(
                    'SELECT id FROM courses WHERE name = ? AND program_id = ? ORDER BY id ASC',
                    [dup.name, dup.program_id]
                );
                
                // Keep the first one, delete the rest
                const keepId = courses[0].id;
                const deleteIds = courses.slice(1).map(c => c.id);
                
                if (deleteIds.length > 0) {
                    // Update evaluations to reference the kept course
                    await db.query(
                        'UPDATE evaluations SET course_id = ? WHERE course_id IN (?)',
                        [keepId, deleteIds]
                    );
                    
                    // Delete duplicate courses
                    await db.query(
                        'DELETE FROM courses WHERE id IN (?)',
                        [deleteIds]
                    );
                    
                    console.log(`    ✓ Kept ID ${keepId}, deleted ${deleteIds.length} duplicate(s)`);
                }
            }
        }
        
        // Show final course list
        const [courses] = await db.query(`
            SELECT c.id, c.name, c.code, p.name as program_name 
            FROM courses c 
            LEFT JOIN programs p ON c.program_id = p.id 
            ORDER BY p.name, c.name
        `);
        
        console.log(`\n📋 Current Courses (${courses.length} total):`);
        let currentProgram = null;
        courses.forEach(c => {
            if (c.program_name !== currentProgram) {
                currentProgram = c.program_name;
                console.log(`\n  ${c.program_name}:`);
            }
            console.log(`    #${c.id}: ${c.name} (${c.code})`);
        });
        
        console.log('\n✓ Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupCourseDuplicates();
