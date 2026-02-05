require('dotenv').config();
const db = require('./config/database');

async function addUniqueConstraints() {
    console.log('🔧 Adding unique constraints to prevent duplicates...\n');
    
    try {
        // Add unique constraint for programs
        try {
            await db.query('ALTER TABLE programs ADD UNIQUE KEY unique_program_name (name)');
            console.log('✓ Added unique constraint for program names');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️  Unique constraint for program names already exists');
            } else {
                throw error;
            }
        }
        
        // Add unique constraint for teachers
        try {
            await db.query('ALTER TABLE teachers ADD UNIQUE KEY unique_employee_id (employee_id)');
            console.log('✓ Added unique constraint for teacher employee IDs');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️  Unique constraint for employee IDs already exists');
            } else {
                throw error;
            }
        }
        
        // Add unique constraint for courses
        try {
            await db.query('ALTER TABLE courses ADD UNIQUE KEY unique_course_per_program (name, program_id)');
            console.log('✓ Added unique constraint for courses per program');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️  Unique constraint for courses already exists');
            } else {
                throw error;
            }
        }
        
        console.log('\n✅ All unique constraints are in place!');
        console.log('\nThis prevents:');
        console.log('  • Duplicate program names');
        console.log('  • Duplicate teacher employee IDs');
        console.log('  • Duplicate course names within the same program\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding constraints:', error.message);
        process.exit(1);
    }
}

addUniqueConstraints();
