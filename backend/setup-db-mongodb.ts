import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Import models
import Admin from './models/Admin';
import Program from './models/Program';
import Teacher from './models/Teacher';
import Course from './models/Course';
import Student from './models/Student';
import Enrollment from './models/Enrollment';
import Evaluation from './models/Evaluation';
import EvaluationPeriod from './models/EvaluationPeriod';

// Import encryption helpers
import { safeEncrypt, safeDecrypt } from './utils/encryption-helpers';

// Load environment variables from backend/.env regardless of CWD
dotenv.config({ path: path.join(__dirname, '.env') });

/**
 * Auto-initialize database with sample data if empty
 * Used by server.ts on first request
 * @returns {Promise<boolean>} - Success status
 */
let initPromise: Promise<boolean> | null = null;

export async function initializeDatabase(): Promise<boolean> {
  // Return existing promise if initialization is in progress
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async (): Promise<boolean> => {
    try {
      // Check if admin exists
      const adminCount = await Admin.countDocuments();
    
      if (adminCount === 0) {
        console.log('📦 No data found. Initializing database with sample data...\n');
        
        await createSampleData();
        
        return true;
      } else {
        console.log('✓ Database already initialized with data');
        return true;
      }
    } catch (error) {
      const err = error as Error;
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
export async function createSampleData(clearExistingData: boolean = true): Promise<void> {
  // Clear existing collections if requested
  if (clearExistingData) {
    console.log('📦 Clearing existing collections...');
    await Promise.all([
      Admin.deleteMany({}),
      Program.deleteMany({}),
      Teacher.deleteMany({}),
      Course.deleteMany({}),
      Student.deleteMany({}),
      Enrollment.deleteMany({}),
      Evaluation.deleteMany({}),
      EvaluationPeriod.deleteMany({})
    ]);
    console.log('✓ Collections cleared\n');
  }

  // Create default admin
  console.log('👤 Creating default admin...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await Admin.create({
    username: safeEncrypt('admin'),
    password: hashedPassword,
    full_name: safeEncrypt('System Administrator'),
    email: safeEncrypt('admin@uphsd.edu.ph')
  });
  console.log('✓ Admin created (username: admin, password: admin123)');

  // Create default programs
  console.log('📚 Creating default programs...');
  const programs = await Program.create([
    {
      name: safeEncrypt('BS Computer Science - Data Science'),
      code: safeEncrypt('BSCS-DS')
    },
    {
      name: safeEncrypt('BS Information Technology - Game Development'),
      code: safeEncrypt('BSIT-GD')
    }
  ]);
  console.log(`✓ Created ${programs.length} programs`);

  // Create sample teachers with username and password
  console.log('👨‍🏫 Creating sample teachers...');
  const teacherPassword = await bcrypt.hash('teacher123', 10); // Default password for all teachers
  const teachers = await Teacher.create([
    {
      full_name: safeEncrypt('Prof. Juan Dela Cruz'),
      employee_id: safeEncrypt('EMP001'),
      username: safeEncrypt('jdelacruz'),
      password: teacherPassword,
      email: safeEncrypt('jdelacruz@uphsd.edu.ph'),
      department: safeEncrypt('Computer Science'),
      status: safeEncrypt('active')
    },
    {
      full_name: safeEncrypt('Prof. Maria Santos'),
      employee_id: safeEncrypt('EMP002'),
      username: safeEncrypt('msantos'),
      password: teacherPassword,
      email: safeEncrypt('msantos@uphsd.edu.ph'),
      department: safeEncrypt('Information Technology'),
      status: safeEncrypt('active')
    },
    {
      full_name: safeEncrypt('Prof. Jose Garcia'),
      employee_id: safeEncrypt('EMP003'),
      username: safeEncrypt('jgarcia'),
      password: teacherPassword,
      email: safeEncrypt('jgarcia@uphsd.edu.ph'),
      department: safeEncrypt('Computer Science'),
      status: safeEncrypt('active')
    },
    {
      full_name: safeEncrypt('Prof. Ana Reyes'),
      employee_id: safeEncrypt('EMP004'),
      username: safeEncrypt('areyes'),
      password: teacherPassword,
      email: safeEncrypt('areyes@uphsd.edu.ph'),
      department: safeEncrypt('Information Technology'),
      status: safeEncrypt('active')
    },
    {
      full_name: safeEncrypt('Prof. Pedro Martinez'),
      employee_id: safeEncrypt('EMP005'),
      username: safeEncrypt('pmartinez'),
      password: teacherPassword,
      email: safeEncrypt('pmartinez@uphsd.edu.ph'),
      department: safeEncrypt('Computer Science'),
      status: safeEncrypt('active')
    }
  ]);
  console.log(`✓ Created ${teachers.length} teachers`);
  console.log('  Default teacher password: teacher123');

  // Create sample courses
  console.log('📖 Creating sample courses...');
  const courses = await Course.create([
    // BSCS-DS courses
    { name: safeEncrypt('Data Structures and Algorithms'), code: safeEncrypt('CS201'), program_id: programs[0]._id },
    { name: safeEncrypt('Database Management Systems'), code: safeEncrypt('CS202'), program_id: programs[0]._id },
    { name: safeEncrypt('Machine Learning'), code: safeEncrypt('CS301'), program_id: programs[0]._id },
    { name: safeEncrypt('Statistical Analysis'), code: safeEncrypt('CS302'), program_id: programs[0]._id },
    { name: safeEncrypt('Big Data Analytics'), code: safeEncrypt('CS401'), program_id: programs[0]._id },
    // BSIT-GD courses
    { name: safeEncrypt('Game Design Fundamentals'), code: safeEncrypt('IT201'), program_id: programs[1]._id },
    { name: safeEncrypt('Game Programming'), code: safeEncrypt('IT202'), program_id: programs[1]._id },
    { name: safeEncrypt('3D Modeling and Animation'), code: safeEncrypt('IT301'), program_id: programs[1]._id },
    { name: safeEncrypt('Game Engine Architecture'), code: safeEncrypt('IT302'), program_id: programs[1]._id },
    { name: safeEncrypt('Mobile Game Development'), code: safeEncrypt('IT401'), program_id: programs[1]._id }
  ]);
  console.log(`✓ Created ${courses.length} courses`);

  // Create sample students (50 students with randomized data)
  console.log('👨‍🎓 Creating sample students...');
  const yearLevels = ['1st', '2nd', '3rd', '4th'] as const;
  const studentsData = [];
  
  const programCodes = ['BSCS-DS', 'BSIT-GD']; // plaintext codes matching programs array order

  for (let i = 1; i <= 50; i++) {
    // Generate random student number in format 00-0000-000
    const batch = 20 + Math.floor(Math.random() * 5); // 20-24
    const sequence1 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const sequence2 = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const studentNumber = `${batch}-${sequence1}-${sequence2}`;
    
    // Randomly assign to a program
    const programIndex = Math.floor(Math.random() * programs.length);
    const programCode = programCodes[programIndex]; // use plaintext code for logic
    const yearLevel = yearLevels[Math.floor(Math.random() * yearLevels.length)];
    
    // Generate section based on program
    const sectionLetter = String.fromCharCode(65 + Math.floor(Math.random() * 3)); // A, B, or C
    const sectionPrefix = programCode.startsWith('BSCS') ? 'CS' : 'IT';
    const sectionYear = yearLevel.charAt(0);
    const section = `${sectionPrefix}-${sectionYear}${sectionLetter}`;
    
    studentsData.push({
      student_number: safeEncrypt(studentNumber),
      program_id: programs[programIndex]._id,
      year_level: safeEncrypt(yearLevel),
      section: safeEncrypt(section),
      status: safeEncrypt('Regular')
    });
  }
  
  const students = await Student.create(studentsData);
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
        section_code: student.section, // already encrypted from student creation
        school_year: safeEncrypt('2025-2026'),
        semester: safeEncrypt('1st Semester'),
        has_evaluated: false
      });
    }
  }
  
  const enrollments = await Enrollment.create(enrollmentsData);
  console.log(`✓ Created ${enrollments.length} enrollments`);

  // Create default evaluation period
  console.log('📅 Creating default evaluation period...');
  await EvaluationPeriod.create({
    academic_year: '2025-2026',
    semester: '1st Semester',
    is_active: true,
    description: 'First semester evaluation period for AY 2025-2026'
  });
  console.log('✓ Evaluation period created (2025-2026, 1st Semester - Active)');

  // Summary
  console.log('\n✅ Database initialized successfully!');
  console.log('📊 Summary:');
  console.log(`  • 1 admin account (username: admin, password: admin123)`);
  console.log(`  • ${programs.length} programs`);
  console.log(`  • ${teachers.length} teachers (password: teacher123 for all)`);
  console.log(`  • ${courses.length} courses`);
  console.log(`  • ${students.length} students`);
  console.log(`  • ${enrollments.length} enrollments`);
  console.log(`  • 1 evaluation period (2025-2026, 1st Semester - Active)\n`);
}

// ==================== STANDALONE SCRIPT MODE ====================
// Run as standalone script when executed directly: ts-node setup-db-mongodb.ts
if (require.main === module) {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_evaluation';
  
  const options: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true
  };
  
  console.log('🔧 Setting up MongoDB database...\n');
  
  // Connect to MongoDB
  mongoose.connect(mongoURI, options)
    .then(async () => {
      console.log('✓ Connected to MongoDB\n');
      
      try {
        // Create sample data (will clear existing data by default)
        await createSampleData();
        
        console.log('🚀 You can now run: npm start');
        
        console.log('\n👨‍🏫 Staff Login Credentials:');
        console.log('  Admin:');
        console.log('    Username: admin');
        console.log('    Password: admin123');
        console.log('\n  Teachers (username/password):');
        const sampleTeachers = await Teacher.find({}).limit(5).select('username employee_id');
        sampleTeachers.forEach((teacher, index) => {
          const username = safeDecrypt(teacher.get('username'));
          const employeeId = safeDecrypt(teacher.get('employee_id'));
          console.log(`    ${index + 1}. ${username} / teacher123 (${employeeId})`);
        });
        
        console.log('\n📝 Sample Student Logins (first 5 students):');
        // Fetch and display first 5 students as examples
        const sampleStudents = await Student.find({}).limit(5).select('student_number');
        sampleStudents.forEach((student, index) => {
          console.log(`  ${index + 1}. ${safeDecrypt(student.get('student_number'))}`);
        });
        console.log(`  ... and 45 more students\n`);
        
      } catch (error) {
        const err = error as Error;
        console.error('❌ Error during setup:', err.message);
        console.error('Full error:', err);
      } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
      }
    })
    .catch((err: Error) => {
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
