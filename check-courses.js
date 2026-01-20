require('dotenv').config();
const db = require('./config/database');

async function checkCourses() {
    console.log('🔍 Checking courses in database...\n');
    
    try {
        // Get all programs
        const [programs] = await db.query('SELECT * FROM programs ORDER BY id');
        console.log('📚 Programs:');
        programs.forEach(p => {
            console.log(`  #${p.id}: ${p.name} (${p.code || 'No code'})`);
        });
        
        // Get all courses
        const [courses] = await db.query(`
            SELECT c.id, c.name, c.code, c.program_id, p.name as program_name 
            FROM courses c 
            LEFT JOIN programs p ON c.program_id = p.id 
            ORDER BY c.program_id, c.name
        `);
        
        console.log(`\n📖 Courses (${courses.length} total):`);
        if (courses.length === 0) {
            console.log('  ⚠️  No courses found in database!');
        } else {
            let currentProgram = null;
            courses.forEach(c => {
                if (c.program_id !== currentProgram) {
                    currentProgram = c.program_id;
                    console.log(`\n  Program: ${c.program_name || 'No Program'} (ID: ${c.program_id || 'NULL'})`);
                }
                console.log(`    #${c.id}: ${c.name} (${c.code || 'No code'})`);
            });
        }
        
        // Test API endpoint simulation
        console.log('\n🧪 Testing course queries:');
        for (const program of programs) {
            const [programCourses] = await db.query(
                'SELECT * FROM courses WHERE program_id = ? ORDER BY name',
                [program.id]
            );
            console.log(`  Program ID ${program.id}: ${programCourses.length} course(s)`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkCourses();
