require('dotenv').config();
const db = require('./config/database');

async function cleanupDuplicates() {
    console.log('🔍 Checking for duplicate programs...');
    
    try {
        // Find duplicate programs
        const [duplicates] = await db.query(`
            SELECT name, COUNT(*) as count 
            FROM programs 
            GROUP BY name 
            HAVING count > 1
        `);
        
        if (duplicates.length === 0) {
            console.log('✓ No duplicate programs found!');
        } else {
            console.log(`⚠️  Found ${duplicates.length} duplicate program name(s)`);
            
            for (const dup of duplicates) {
                console.log(`\n  Cleaning up: "${dup.name}" (${dup.count} entries)`);
                
                // Get all IDs for this program name
                const [programs] = await db.query(
                    'SELECT id FROM programs WHERE name = ? ORDER BY id ASC',
                    [dup.name]
                );
                
                // Keep the first one, delete the rest
                const keepId = programs[0].id;
                const deleteIds = programs.slice(1).map(p => p.id);
                
                if (deleteIds.length > 0) {
                    // Update courses to reference the kept program
                    await db.query(
                        'UPDATE courses SET program_id = ? WHERE program_id IN (?)',
                        [keepId, deleteIds]
                    );
                    
                    // Update evaluations to reference the kept program
                    await db.query(
                        'UPDATE evaluations SET program_id = ? WHERE program_id IN (?)',
                        [keepId, deleteIds]
                    );
                    
                    // Delete duplicate programs
                    await db.query(
                        'DELETE FROM programs WHERE id IN (?)',
                        [deleteIds]
                    );
                    
                    console.log(`  ✓ Kept ID ${keepId}, deleted ${deleteIds.length} duplicate(s)`);
                }
            }
        }
        
        // Show final program list
        const [programs] = await db.query('SELECT id, name, code FROM programs ORDER BY id');
        console.log('\n📋 Current Programs:');
        programs.forEach(p => {
            console.log(`  #${p.id}: ${p.name} (${p.code || 'No code'})`);
        });
        
        console.log('\n✓ Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupDuplicates();
