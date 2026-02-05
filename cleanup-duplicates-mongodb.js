require('dotenv').config();
const mongoose = require('mongoose');
const Program = require('./models/Program');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

console.log('🔍 Checking for duplicate programs...\n');

async function cleanupDuplicates() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✓ Connected to MongoDB\n');
        
        // Find all programs and group by name
        const programs = await Program.find().sort({ name: 1, createdAt: 1 });
        const programsByName = {};
        
        programs.forEach(program => {
            if (!programsByName[program.name]) {
                programsByName[program.name] = [];
            }
            programsByName[program.name].push(program);
        });
        
        let duplicatesFound = 0;
        let duplicatesRemoved = 0;
        
        // Check for duplicates
        for (const [name, progs] of Object.entries(programsByName)) {
            if (progs.length > 1) {
                duplicatesFound++;
                console.log(`\n📌 Duplicate found: "${name}"`);
                console.log(`   Found ${progs.length} copies`);
                
                // Keep the oldest one, delete the rest
                const toKeep = progs[0];
                const toDelete = progs.slice(1);
                
                console.log(`   ✓ Keeping: ${toKeep._id} (created: ${toKeep.createdAt})`);
                
                for (const dup of toDelete) {
                    console.log(`   ✗ Removing: ${dup._id} (created: ${dup.createdAt})`);
                    await Program.findByIdAndDelete(dup._id);
                    duplicatesRemoved++;
                }
            }
        }
        
        if (duplicatesFound === 0) {
            console.log('✅ No duplicate programs found!');
        } else {
            console.log(`\n✅ Cleanup complete!`);
            console.log(`   • ${duplicatesFound} duplicate program names found`);
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
