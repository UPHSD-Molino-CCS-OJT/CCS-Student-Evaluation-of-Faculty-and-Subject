import dotenv from 'dotenv';
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

// Load environment variables
dotenv.config();

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
      Evaluation.deleteMany({})
    ]);
    console.log('✓ Collections cleared\n');
  }

  // Create default admin
  console.log('👤 Creating default admin...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await Admin.create({
    username: 'admin',
    password: hashedPassword,
    full_name: 'System Administrator',
    email: 'admin@uphsd.edu.ph'
  });
  console.log('✓ Admin created (username: admin, password: admin123)');

  // Create default programs
  console.log('📚 Creating default programs...');
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
  console.log(`✓ Created ${programs.length} programs`);

  // Create sample teachers
  console.log('👨‍🏫 Creating sample teachers...');
  const teachers = await Teacher.create([
    {
      full_name: 'Prof. Juan Dela Cruz',
      employee_id: 'EMP001',
      email: 'jdelacruz@uphsd.edu.ph',
      department: 'Computer Science',
      status: 'active' as const
    },
    {
      full_name: 'Prof. Maria Santos',
      employee_id: 'EMP002',
      email: 'msantos@uphsd.edu.ph',
      department: 'Information Technology',
      status: 'active' as const
    },
    {
      full_name: 'Prof. Jose Garcia',
      employee_id: 'EMP003',
      email: 'jgarcia@uphsd.edu.ph',
      department: 'Computer Science',
      status: 'active' as const
    },
    {
      full_name: 'Prof. Ana Reyes',
      employee_id: 'EMP004',
      email: 'areyes@uphsd.edu.ph',
      department: 'Information Technology',
      status: 'active' as const
    },
    {
      full_name: 'Prof. Pedro Martinez',
      employee_id: 'EMP005',
      email: 'pmartinez@uphsd.edu.ph',
      department: 'Computer Science',
      status: 'active' as const
    }
  ]);
  console.log(`✓ Created ${teachers.length} teachers`);

  // Create sample courses
  console.log('📖 Creating sample courses...');
  const courses = await Course.create([
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

  // Create sample students
  console.log('👨‍🎓 Creating sample students...');
  const students = await Student.create([
    {
      student_number: '21-1234-567',
      full_name: 'Juan Dela Cruz',
      email: 'juan.delacruz@student.uphsd.edu.ph',
      program_id: programs[0]._id,
      year_level: '3rd' as const,
      section: 'CS-3A',
      status: 'Regular' as const
    },
    {
      student_number: '21-1234-568',
      full_name: 'Maria Garcia',
      email: 'maria.garcia@student.uphsd.edu.ph',
      program_id: programs[0]._id,
      year_level: '3rd' as const,
      section: 'CS-3A',
      status: 'Regular' as const
    },
    {
      student_number: '21-5678-901',
      full_name: 'Pedro Santos',
      email: 'pedro.santos@student.uphsd.edu.ph',
      program_id: programs[1]._id,
      year_level: '2nd' as const,
      section: 'IT-2A',
      status: 'Regular' as const
    }
  ]);
  console.log(`✓ Created ${students.length} students`);

  // Create sample enrollments
  console.log('📝 Creating sample enrollments...');
  const enrollments = await Enrollment.create([
    // Student 1 (Juan) - BSCS-DS enrollments
    {
      student_id: students[0]._id,
      course_id: courses[0]._id,
      teacher_id: teachers[0]._id,
      section_code: 'CS-3A',
      school_year: '2025-2026',
      semester: '1st Semester' as const,
      has_evaluated: false
    },
    {
      student_id: students[0]._id,
      course_id: courses[1]._id,
      teacher_id: teachers[2]._id,
      section_code: 'CS-3A',
      school_year: '2025-2026',
      semester: '1st Semester' as const,
      has_evaluated: false
    },
    {
      student_id: students[0]._id,
      course_id: courses[2]._id,
      teacher_id: teachers[4]._id,
      section_code: 'CS-3A',
      school_year: '2025-2026',
      semester: '1st Semester' as const,
      has_evaluated: false
    },
    // Student 2 (Maria) - BSCS-DS enrollments
    {
      student_id: students[1]._id,
      course_id: courses[0]._id,
      teacher_id: teachers[0]._id,
      section_code: 'CS-3A',
      school_year: '2025-2026',
      semester: '1st Semester' as const,
      has_evaluated: false
    },
    {
      student_id: students[1]._id,
      course_id: courses[1]._id,
      teacher_id: teachers[2]._id,
      section_code: 'CS-3A',
      school_year: '2025-2026',
      semester: '1st Semester' as const,
      has_evaluated: false
    },
    // Student 3 (Pedro) -BSIT-GD enrollments
    {
      student_id: students[2]._id,
      course_id: courses[5]._id,
      teacher_id: teachers[1]._id,
      section_code: 'IT-2A',
      school_year: '2025-2026',
      semester: '1st Semester' as const,
      has_evaluated: false
    },
    {
      student_id: students[2]._id,
      course_id: courses[7]._id,
      teacher_id: teachers[3]._id,
      section_code: 'IT-2A',
      school_year: '2025-2026',
      semester: '1st Semester' as const,
      has_evaluated: false
    }
  ]);
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
        console.log('\n📝 Sample Student Logins:');
        console.log('  • 21-1234-567 (Juan Dela Cruz - BSCS-DS)');
        console.log('  • 21-1234-568 (Maria Garcia - BSCS-DS)');
        console.log('  • 21-5678-901 (Pedro Santos - BSIT-GD)\n');
        
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
