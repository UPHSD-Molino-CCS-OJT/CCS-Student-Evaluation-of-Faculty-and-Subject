require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

console.log('🔍 Checking for duplicate teachers...\n');

async function cleanupDuplicates() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✓ Connected to MongoDB\n');
        
        // Find all teachers with employee IDs
        const teachers = await Teacher.find({ employee_id: { $ne: null, $ne: '' } }).sort({ employee_id: 1, createdAt: 1 });
        const teachersByEmpId = {};
        
        teachers.forEach(teacher => {
            if (!teachersByEmpId[teacher.employee_id]) {
                teachersByEmpId[teacher.employee_id] = [];
            }
            teachersByEmpId[teacher.employee_id].push(teacher);
        });
        
        let duplicatesFound = 0;
        let duplicatesRemoved = 0;
        
        // Check for duplicates
        for (const [empId, tchrs] of Object.entries(teachersByEmpId)) {
            if (tchrs.length > 1) {
                duplicatesFound++;
                console.log(`\n📌 Duplicate found: Employee ID "${empId}"`);
                console.log(`   Found ${tchrs.length} copies`);
                
                tchrs.forEach(t => {
                    console.log(`   - ${t.full_name} (${t._id}) - created: ${t.createdAt}`);
                });
                
                // Keep the oldest one, delete the rest
                const toKeep = tchrs[0];
                const toDelete = tchrs.slice(1);
                
                console.log(`   ✓ Keeping: ${toKeep.full_name} (${toKeep._id})`);
                
                for (const dup of toDelete) {
                    console.log(`   ✗ Removing: ${dup.full_name} (${dup._id})`);
                    await Teacher.findByIdAndDelete(dup._id);
                    duplicatesRemoved++;
                }
            }
        }
        
        if (duplicatesFound === 0) {
            console.log('✅ No duplicate teachers found!');
        } else {
            console.log(`\n✅ Cleanup complete!`);
            console.log(`   • ${duplicatesFound} duplicate employee IDs found`);
            console.log(`   • ${duplicatesRemoved} duplicate entries removed`);
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    }
}

cleanupDuplicates();
