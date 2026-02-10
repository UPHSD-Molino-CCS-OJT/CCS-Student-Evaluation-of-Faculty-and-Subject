require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const Admin = require('./models/Admin');
const Program = require('./models/Program');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');
const Student = require('./models/Student');
const Enrollment = require('./models/Enrollment');

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
            await Student.deleteMany({});
            await Enrollment.deleteMany({});
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

            // Create sample students
            console.log('👨‍🎓 Creating sample students...');
            const students = await Student.insertMany([
                {
                    student_number: '21-1234-567',
                    full_name: 'Juan Dela Cruz',
                    email: 'juan.delacruz@student.uphsd.edu.ph',
                    program_id: bscsProgram._id,
                    year_level: '3rd Year',
                    section: 'CS-3A',
                    status: 'Regular'
                },
                {
                    student_number: '21-1234-568',
                    full_name: 'Maria Garcia',
                    email: 'maria.garcia@student.uphsd.edu.ph',
                    program_id: bscsProgram._id,
                    year_level: '3rd Year',
                    section: 'CS-3A',
                    status: 'Regular'
                },
                {
                    student_number: '21-5678-901',
                    full_name: 'Pedro Santos',
                    email: 'pedro.santos@student.uphsd.edu.ph',
                    program_id: bsitProgram._id,
                    year_level: '2nd Year',
                    section: 'IT-2A',
                    status: 'Regular'
                }
            ]);
            console.log(`✓ Created ${students.length} students\n`);

            // Create sample enrollments
            console.log('📝 Creating sample enrollments...');
            const enrollments = await Enrollment.insertMany([
                // Student 1 (Juan) - BSCS-DS enrollments
                {
                    student_id: students[0]._id,
                    course_id: courses[0]._id, // Data Structures
                    teacher_id: teachers[0]._id, // Prof. Juan Dela Cruz
                    section_code: 'CS-3A',
                    school_year: '2025-2026',
                    semester: '1st Semester',
                    has_evaluated: false
                },
                {
                    student_id: students[0]._id,
                    course_id: courses[1]._id, // DBMS
                    teacher_id: teachers[2]._id, // Prof. Jose Garcia
                    section_code: 'CS-3A',
                    school_year: '2025-2026',
                    semester: '1st Semester',
                    has_evaluated: false
                },
                {
                    student_id: students[0]._id,
                    course_id: courses[2]._id, // Machine Learning
                    teacher_id: teachers[4]._id, // Prof. Pedro Martinez
                    section_code: 'CS-3A',
                    school_year: '2025-2026',
                    semester: '1st Semester',
                    has_evaluated: false
                },
                // Student 2 (Maria) - BSCS-DS enrollments
                {
                    student_id: students[1]._id,
                    course_id: courses[0]._id,
                    teacher_id: teachers[0]._id,
                    section_code: 'CS-3A',
                    school_year: '2025-2026',
                    semester: '1st Semester',
                    has_evaluated: false
                },
                {
                    student_id: students[1]._id,
                    course_id: courses[1]._id,
                    teacher_id: teachers[2]._id,
                    section_code: 'CS-3A',
                    school_year: '2025-2026',
                    semester: '1st Semester',
                    has_evaluated: false
                },
                // Student 3 (Pedro) - BSIT-GD enrollments
                {
                    student_id: students[2]._id,
                    course_id: courses[5]._id, // Game Design
                    teacher_id: teachers[1]._id, // Prof. Maria Santos
                    section_code: 'IT-2A',
                    school_year: '2025-2026',
                    semester: '1st Semester',
                    has_evaluated: false
                },
                {
                    student_id: students[2]._id,
                    course_id: courses[7]._id, // Game Engine
                    teacher_id: teachers[3]._id, // Prof. Ana Reyes
                    section_code: 'IT-2A',
                    school_year: '2025-2026',
                    semester: '1st Semester',
                    has_evaluated: false
                }
            ]);
            console.log(`✓ Created ${enrollments.length} enrollments\n`);

            // Summary
            console.log('✅ Database setup completed successfully!\n');
            console.log('📊 Summary:');
            console.log(`  • 1 admin account`);
            console.log(`  • ${programs.length} programs`);
            console.log(`  • ${teachers.length} teachers`);
            console.log(`  • ${courses.length} courses`);
            console.log(`  • ${students.length} students`);
            console.log(`  • ${enrollments.length} enrollments\n`);
            console.log('🚀 You can now run: npm start');
            console.log('\n📝 Sample Student Logins:');
            console.log('  • 21-1234-567 (Juan Dela Cruz - BSCS-DS)');
            console.log('  • 21-1234-568 (Maria Garcia - BSCS-DS)');
            console.log('  • 21-5678-901 (Pedro Santos - BSIT-GD)\n');

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
