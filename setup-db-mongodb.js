require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import Models
const Admin = require('./models/Admin');
const Program = require('./models/Program');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

console.log('🔧 Setting up MongoDB database...\n');

async function setupDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(mongoURI);
        console.log('✓ Connected to MongoDB');
        
        // Clear existing data (optional - comment out if you want to preserve data)
        console.log('\n📦 Clearing existing collections...');
        await Admin.deleteMany({});
        await Program.deleteMany({});
        await Teacher.deleteMany({});
        await Course.deleteMany({});
        console.log('✓ Collections cleared');
        
        // Create default admin (password: admin123)
        console.log('\n👤 Creating default admin...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await Admin.create({
            username: 'admin',
            password: hashedPassword,
            full_name: 'System Administrator',
            email: 'admin@uphsd.edu.ph'
        });
        console.log('✓ Default admin created');
        console.log('  Username: admin');
        console.log('  Password: admin123');
        
        // Create default programs
        console.log('\n📚 Creating default programs...');
        const programs = await Program.create([
            {
                name: 'BS Computer Science - Data Science',
                code: 'BSCS-DS'
            },
            {
                name: 'BS Information Technology - Game Development',
                code: 'BSIT-GD'
            }
        ]);
        console.log('✓ Created ' + programs.length + ' programs');
        
        // Create sample teachers
        console.log('\n👨‍🏫 Creating sample teachers...');
        const teachers = await Teacher.create([
            {
                full_name: 'Prof. Juan Dela Cruz',
                employee_id: 'EMP001',
                email: 'jdelacruz@uphsd.edu.ph',
                department: 'Computer Science',
                status: 'active'
            },
            {
                full_name: 'Prof. Maria Santos',
                employee_id: 'EMP002',
                email: 'msantos@uphsd.edu.ph',
                department: 'Information Technology',
                status: 'active'
            },
            {
                full_name: 'Prof. Jose Garcia',
                employee_id: 'EMP003',
                email: 'jgarcia@uphsd.edu.ph',
                department: 'Computer Science',
                status: 'active'
            },
            {
                full_name: 'Prof. Ana Reyes',
                employee_id: 'EMP004',
                email: 'areyes@uphsd.edu.ph',
                department: 'Information Technology',
                status: 'active'
            },
            {
                full_name: 'Prof. Pedro Martinez',
                employee_id: 'EMP005',
                email: 'pmartinez@uphsd.edu.ph',
                department: 'Computer Science',
                status: 'active'
            }
        ]);
        console.log('✓ Created ' + teachers.length + ' teachers');
        
        // Create sample courses
        console.log('\n📖 Creating sample courses...');
        const courses = await Course.create([
            // BSCS-DS courses
            {
                name: 'Data Structures and Algorithms',
                code: 'CS201',
                program_id: programs[0]._id
            },
            {
                name: 'Database Management Systems',
                code: 'CS202',
                program_id: programs[0]._id
            },
            {
                name: 'Machine Learning',
                code: 'CS301',
                program_id: programs[0]._id
            },
            {
                name: 'Statistical Analysis',
                code: 'CS302',
                program_id: programs[0]._id
            },
            {
                name: 'Big Data Analytics',
                code: 'CS401',
                program_id: programs[0]._id
            },
            // BSIT-GD courses
            {
                name: 'Game Design Fundamentals',
                code: 'IT201',
                program_id: programs[1]._id
            },
            {
                name: 'Game Programming',
                code: 'IT202',
                program_id: programs[1]._id
            },
            {
                name: '3D Modeling and Animation',
                code: 'IT301',
                program_id: programs[1]._id
            },
            {
                name: 'Game Engine Architecture',
                code: 'IT302',
                program_id: programs[1]._id
            },
            {
                name: 'Mobile Game Development',
                code: 'IT401',
                program_id: programs[1]._id
            }
        ]);
        console.log('✓ Created ' + courses.length + ' courses');
        
        console.log('\n✅ Database setup completed successfully!\n');
        console.log('📊 Summary:');
        console.log('  • 1 admin account');
        console.log('  • ' + programs.length + ' programs');
        console.log('  • ' + teachers.length + ' teachers');
        console.log('  • ' + courses.length + ' courses');
        console.log('\n🚀 You can now run: npm start\n');
        
    } catch (error) {
        console.error('\n❌ Error setting up database:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('✓ Database connection closed');
        process.exit(0);
    }
}

setupDatabase();
