require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

console.log('🔍 Checking for duplicate courses...\n');

async function cleanupDuplicates() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✓ Connected to MongoDB\n');
        
        // Find all courses
        const courses = await Course.find().populate('program_id', 'name').sort({ name: 1, createdAt: 1 });
        const coursesByKey = {};
        
        courses.forEach(course => {
            const key = `${course.name}|${course.program_id ? course.program_id._id : 'null'}`;
            if (!coursesByKey[key]) {
                coursesByKey[key] = [];
            }
            coursesByKey[key].push(course);
        });
        
        let duplicatesFound = 0;
        let duplicatesRemoved = 0;
        
        // Check for duplicates
        for (const [key, crss] of Object.entries(coursesByKey)) {
            if (crss.length > 1) {
                duplicatesFound++;
                const programName = crss[0].program_id ? crss[0].program_id.name : 'No Program';
                console.log(`\n📌 Duplicate found: "${crss[0].name}" in ${programName}`);
                console.log(`   Found ${crss.length} copies`);
                
                // Keep the oldest one, delete the rest
                const toKeep = crss[0];
                const toDelete = crss.slice(1);
                
                console.log(`   ✓ Keeping: ${toKeep._id} (created: ${toKeep.createdAt})`);
                
                for (const dup of toDelete) {
                    console.log(`   ✗ Removing: ${dup._id} (created: ${dup.createdAt})`);
                    await Course.findByIdAndDelete(dup._id);
                    duplicatesRemoved++;
                }
            }
        }
        
        if (duplicatesFound === 0) {
            console.log('✅ No duplicate courses found!');
        } else {
            console.log(`\n✅ Cleanup complete!`);
            console.log(`   • ${duplicatesFound} duplicate courses found`);
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
