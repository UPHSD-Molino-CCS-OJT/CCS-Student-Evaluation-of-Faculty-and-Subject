require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const Admin = require('./models/Admin');
const Program = require('./models/Program');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';

// Connection options
const options = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    w: 'majority'
};

console.log('🔧 Setting up MongoDB database...\n');

// Connect to MongoDB
mongoose.connect(mongoURI, options)
    .then(async () => {
        console.log('✓ Connected to MongoDB\n');
        
        try {
            // Clear existing collections
            console.log('📦 Clearing existing collections...');
            await Admin.deleteMany({});
            await Program.deleteMany({});
            await Teacher.deleteMany({});
            await Course.deleteMany({});
            console.log('✓ Collections cleared\n');

            // Create default admin
            console.log('👤 Creating default admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = await Admin.create({
                username: 'admin',
                password: hashedPassword,
                full_name: 'System Administrator',
                email: 'admin@uphsd.edu.ph'
            });
            console.log('✓ Default admin created');
            console.log('  Username: admin');
            console.log('  Password: admin123\n');

            // Create default programs
            console.log('📚 Creating default programs...');
            const programs = await Program.insertMany([
                {
                    name: 'BS Computer Science - Data Science',
                    code: 'BSCS-DS'
                },
                {
                    name: 'BS Information Technology - Game Development',
                    code: 'BSIT-GD'
                }
            ]);
            console.log(`✓ Created ${programs.length} programs\n`);

            // Create sample teachers
            console.log('👨‍🏫 Creating sample teachers...');
            const teachers = await Teacher.insertMany([
                {
                    full_name: 'Prof. Juan Dela Cruz',
                    employee_id: 'EMP-001',
                    email: 'juan.delacruz@uphsd.edu.ph',
                    department: 'Computer Science',
                    status: 'active'
                },
                {
                    full_name: 'Prof. Maria Santos',
                    employee_id: 'EMP-002',
                    email: 'maria.santos@uphsd.edu.ph',
                    department: 'Information Technology',
                    status: 'active'
                },
                {
                    full_name: 'Prof. Jose Garcia',
                    employee_id: 'EMP-003',
                    email: 'jose.garcia@uphsd.edu.ph',
                    department: 'Computer Science',
                    status: 'active'
                },
                {
                    full_name: 'Prof. Ana Reyes',
                    employee_id: 'EMP-004',
                    email: 'ana.reyes@uphsd.edu.ph',
                    department: 'Information Technology',
                    status: 'active'
                },
                {
                    full_name: 'Prof. Pedro Martinez',
                    employee_id: 'EMP-005',
                    email: 'pedro.martinez@uphsd.edu.ph',
                    department: 'Computer Science',
                    status: 'active'
                }
            ]);
            console.log(`✓ Created ${teachers.length} teachers\n`);

            // Get program IDs for course creation
            const bscsProgram = programs.find(p => p.code === 'BSCS-DS');
            const bsitProgram = programs.find(p => p.code === 'BSIT-GD');

            // Create sample courses
            console.log('📖 Creating sample courses...');
            const courses = await Course.insertMany([
                // BSCS-DS Courses
                {
                    name: 'Data Structures and Algorithms',
                    code: 'CS-201',
                    program_id: bscsProgram._id
                },
                {
                    name: 'Database Management Systems',
                    code: 'CS-301',
                    program_id: bscsProgram._id
                },
                {
                    name: 'Machine Learning Fundamentals',
                    code: 'CS-401',
                    program_id: bscsProgram._id
                },
                {
                    name: 'Statistical Analysis for Data Science',
                    code: 'CS-402',
                    program_id: bscsProgram._id
                },
                {
                    name: 'Big Data Analytics',
                    code: 'CS-403',
                    program_id: bscsProgram._id
                },
                // BSIT-GD Courses
                {
                    name: 'Game Design Principles',
                    code: 'IT-201',
                    program_id: bsitProgram._id
                },
                {
                    name: '3D Modeling and Animation',
                    code: 'IT-301',
                    program_id: bsitProgram._id
                },
                {
                    name: 'Game Engine Development',
                    code: 'IT-401',
                    program_id: bsitProgram._id
                },
                {
                    name: 'Mobile Game Programming',
                    code: 'IT-402',
                    program_id: bsitProgram._id
                },
                {
                    name: 'Virtual Reality Development',
                    code: 'IT-403',
                    program_id: bsitProgram._id
                }
            ]);
            console.log(`✓ Created ${courses.length} courses\n`);

            // Summary
            console.log('✅ Database setup completed successfully!\n');
            console.log('📊 Summary:');
            console.log(`  • 1 admin account`);
            console.log(`  • ${programs.length} programs`);
            console.log(`  • ${teachers.length} teachers`);
            console.log(`  • ${courses.length} courses\n`);
            console.log('🚀 You can now run: npm start');

        } catch (error) {
            console.error('❌ Error during setup:', error.message);
            console.error('Full error:', error);
        } finally {
            // Close connection
            await mongoose.connection.close();
            console.log('\n✓ Database connection closed');
            process.exit(0);
        }
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('\n💡 Troubleshooting tips:');
        console.error('  1. Check your MONGODB_URI in .env file');
        console.error('  2. Verify your MongoDB Atlas IP whitelist');
        console.error('  3. Ensure your database user credentials are correct');
        console.error('  4. Try using a local MongoDB installation');
        console.error('\nSee MONGODB-SETUP-GUIDE.md for detailed help.\n');
        process.exit(1);
    });
