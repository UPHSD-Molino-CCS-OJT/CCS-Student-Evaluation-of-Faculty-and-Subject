"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.createSampleData = createSampleData;
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
// Import models
const Admin_1 = __importDefault(require("./models/Admin"));
const Program_1 = __importDefault(require("./models/Program"));
const Teacher_1 = __importDefault(require("./models/Teacher"));
const Course_1 = __importDefault(require("./models/Course"));
const Student_1 = __importDefault(require("./models/Student"));
const Enrollment_1 = __importDefault(require("./models/Enrollment"));
const Evaluation_1 = __importDefault(require("./models/Evaluation"));
// Load environment variables
dotenv_1.default.config();
/**
 * Auto-initialize database with sample data if empty
 * Used by server.ts on first request
 * @returns {Promise<boolean>} - Success status
 */
let initPromise = null;
async function initializeDatabase() {
    // Return existing promise if initialization is in progress
    if (initPromise) {
        return initPromise;
    }
    initPromise = (async () => {
        try {
            // Check if admin exists
            const adminCount = await Admin_1.default.countDocuments();
            if (adminCount === 0) {
                console.log('📦 No data found. Initializing database with sample data...\n');
                await createSampleData();
                return true;
            }
            else {
                console.log('✓ Database already initialized with data');
                return true;
            }
        }
        catch (error) {
            const err = error;
            console.error('❌ Error initializing database:', err.message);
            console.error('Full error:', err);
            initPromise = null; // Reset on error so it can retry
            return false;
        }
    })();
    return initPromise;
}
/**
 * Create sample data for database
 * Used by both auto-initialization and manual setup script
 * @param {boolean} clearExistingData - Whether to clear existing data first (default: true)
 */
async function createSampleData(clearExistingData = true) {
    // Clear existing collections if requested
    if (clearExistingData) {
        console.log('📦 Clearing existing collections...');
        await Promise.all([
            Admin_1.default.deleteMany({}),
            Program_1.default.deleteMany({}),
            Teacher_1.default.deleteMany({}),
            Course_1.default.deleteMany({}),
            Student_1.default.deleteMany({}),
            Enrollment_1.default.deleteMany({}),
            Evaluation_1.default.deleteMany({})
        ]);
        console.log('✓ Collections cleared\n');
    }
    // Create default admin
    console.log('👤 Creating default admin...');
    const hashedPassword = await bcrypt_1.default.hash('admin123', 10);
    await Admin_1.default.create({
        username: 'admin',
        password: hashedPassword,
        full_name: 'System Administrator',
        email: 'admin@uphsd.edu.ph'
    });
    console.log('✓ Admin created (username: admin, password: admin123)');
    // Create default programs
    console.log('📚 Creating default programs...');
    const programs = await Program_1.default.create([
        {
            name: 'BS Computer Science - Data Science',
            code: 'BSCS-DS'
        },
        {
            name: 'BS Information Technology - Game Development',
            code: 'BSIT-GD'
        }
    ]);
    console.log(`✓ Created ${programs.length} programs`);
    // Create sample teachers
    console.log('👨‍🏫 Creating sample teachers...');
    const teachers = await Teacher_1.default.create([
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
    console.log(`✓ Created ${teachers.length} teachers`);
    // Create sample courses
    console.log('📖 Creating sample courses...');
    const courses = await Course_1.default.create([
        // BSCS-DS courses
        { name: 'Data Structures and Algorithms', code: 'CS201', program_id: programs[0]._id },
        { name: 'Database Management Systems', code: 'CS202', program_id: programs[0]._id },
        { name: 'Machine Learning', code: 'CS301', program_id: programs[0]._id },
        { name: 'Statistical Analysis', code: 'CS302', program_id: programs[0]._id },
        { name: 'Big Data Analytics', code: 'CS401', program_id: programs[0]._id },
        // BSIT-GD courses
        { name: 'Game Design Fundamentals', code: 'IT201', program_id: programs[1]._id },
        { name: 'Game Programming', code: 'IT202', program_id: programs[1]._id },
        { name: '3D Modeling and Animation', code: 'IT301', program_id: programs[1]._id },
        { name: 'Game Engine Architecture', code: 'IT302', program_id: programs[1]._id },
        { name: 'Mobile Game Development', code: 'IT401', program_id: programs[1]._id }
    ]);
    console.log(`✓ Created ${courses.length} courses`);
    // Create sample students (50 students with randomized data)
    console.log('👨‍🎓 Creating sample students...');
    const yearLevels = ['1st', '2nd', '3rd', '4th'];
    const studentsData = [];
    for (let i = 1; i <= 50; i++) {
        // Generate random student number in format 00-0000-000
        const batch = 20 + Math.floor(Math.random() * 5); // 20-24
        const sequence1 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const sequence2 = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const studentNumber = `${batch}-${sequence1}-${sequence2}`;
        // Randomly assign to a program
        const programIndex = Math.floor(Math.random() * programs.length);
        const programCode = programs[programIndex].get('code');
        const yearLevel = yearLevels[Math.floor(Math.random() * yearLevels.length)];
        // Generate section based on program
        const sectionLetter = String.fromCharCode(65 + Math.floor(Math.random() * 3)); // A, B, or C
        const sectionPrefix = programCode.startsWith('BSCS') ? 'CS' : 'IT';
        const sectionYear = yearLevel.charAt(0);
        const section = `${sectionPrefix}-${sectionYear}${sectionLetter}`;
        studentsData.push({
            student_number: studentNumber,
            program_id: programs[programIndex]._id,
            year_level: yearLevel,
            section: section,
            status: 'Regular'
        });
    }
    const students = await Student_1.default.create(studentsData);
    console.log(`✓ Created ${students.length} students`);
    // Create sample enrollments (randomized for all students)
    console.log('📝 Creating sample enrollments...');
    const enrollmentsData = [];
    for (const student of students) {
        // Get student's program ID as ObjectId
        const studentProgramId = student.program_id;
        // Get courses for this program
        const programCourses = courses.filter(c => {
            const courseProgramId = c.program_id;
            return courseProgramId.toString() === studentProgramId.toString();
        });
        // Randomly select 2-4 courses for this student
        const numCourses = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
        const shuffledCourses = programCourses.sort(() => Math.random() - 0.5);
        const selectedCourses = shuffledCourses.slice(0, Math.min(numCourses, programCourses.length));
        // Create enrollment for each selected course
        for (const course of selectedCourses) {
            // Randomly assign a teacher
            const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];
            enrollmentsData.push({
                student_id: student._id,
                course_id: course._id,
                teacher_id: randomTeacher._id,
                section_code: student.section,
                school_year: '2025-2026',
                semester: '1st Semester',
                has_evaluated: false
            });
        }
    }
    const enrollments = await Enrollment_1.default.create(enrollmentsData);
    console.log(`✓ Created ${enrollments.length} enrollments`);
    // Summary
    console.log('\n✅ Database initialized successfully!');
    console.log('📊 Summary:');
    console.log(`  • 1 admin account`);
    console.log(`  • ${programs.length} programs`);
    console.log(`  • ${teachers.length} teachers`);
    console.log(`  • ${courses.length} courses`);
    console.log(`  • ${students.length} students`);
    console.log(`  • ${enrollments.length} enrollments\n`);
}
// ==================== STANDALONE SCRIPT MODE ====================
// Run as standalone script when executed directly: ts-node setup-db-mongodb.ts
if (require.main === module) {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';
    const options = {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
        retryWrites: true
    };
    console.log('🔧 Setting up MongoDB database...\n');
    // Connect to MongoDB
    mongoose_1.default.connect(mongoURI, options)
        .then(async () => {
        console.log('✓ Connected to MongoDB\n');
        try {
            // Create sample data (will clear existing data by default)
            await createSampleData();
            console.log('🚀 You can now run: npm start');
            console.log('\n📝 Sample Student Logins (first 5 students):');
            // Fetch and display first 5 students as examples
            const sampleStudents = await Student_1.default.find({}).limit(5).select('student_number');
            sampleStudents.forEach((student, index) => {
                console.log(`  ${index + 1}. ${student.get('student_number')}`);
            });
            console.log(`  ... and 45 more students\n`);
            console.log('💡 Use any student number above to test the system\n');
        }
        catch (error) {
            const err = error;
            console.error('❌ Error during setup:', err.message);
            console.error('Full error:', err);
        }
        finally {
            // Close connection
            await mongoose_1.default.connection.close();
            console.log('\n✓ Database connection closed');
            process.exit(0);
        }
    })
        .catch((err) => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('\n💡 Troubleshooting tips:');
        console.error('  1. Check your MONGODB_URI in .env file');
        console.error('  2. Verify your MongoDB Atlas IP whitelist');
        console.error('  3. Ensure your database user credentials are correct');
        console.error('  4. Try using a local MongoDB installation');
        console.error('\nSee docs/MONGODB-SETUP-TROUBLESHOOTING.md for detailed help.\n');
        process.exit(1);
    });
}
//# sourceMappingURL=setup-db-mongodb.js.map