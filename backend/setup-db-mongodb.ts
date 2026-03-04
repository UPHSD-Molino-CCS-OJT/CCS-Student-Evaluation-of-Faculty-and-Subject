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
import Section from './models/Section';

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
      EvaluationPeriod.deleteMany({}),
      Section.deleteMany({})
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
    // BSCS-DS courses (2022-2023 Curriculum)
    // First Year, First Semester
    { name: safeEncrypt('Discrete Structure 1'), code: safeEncrypt('BSCS 1101'), program_id: programs[0]._id },
    { name: safeEncrypt('Introduction to Computing - Lec'), code: safeEncrypt('BSCSIT 1101'), program_id: programs[0]._id },
    { name: safeEncrypt('Introduction to Computing - Lab'), code: safeEncrypt('BSCSIT 1101L'), program_id: programs[0]._id },
    { name: safeEncrypt('Fundamentals of Programming - Lec'), code: safeEncrypt('BSCSIT 1102'), program_id: programs[0]._id },
    { name: safeEncrypt('Fundamentals of Programming - Lab'), code: safeEncrypt('BSCSIT 1102L'), program_id: programs[0]._id },
    // First Year, Second Semester
    { name: safeEncrypt('Discrete Structure 2'), code: safeEncrypt('BSCS 1202'), program_id: programs[0]._id },
    { name: safeEncrypt('Programming 2 - Lec'), code: safeEncrypt('BSCSIT 1203'), program_id: programs[0]._id },
    { name: safeEncrypt('Programming 2 - Lab'), code: safeEncrypt('BSCSIT 1203L'), program_id: programs[0]._id },
    { name: safeEncrypt('Linear Algebra'), code: safeEncrypt('MATH 1100'), program_id: programs[0]._id },
    // Second Year, First Semester
    { name: safeEncrypt('Computer Organization with Assembly Language - Lec'), code: safeEncrypt('BSCS 2103'), program_id: programs[0]._id },
    { name: safeEncrypt('Computer Organization with Assembly Language - Lab'), code: safeEncrypt('BSCS 2103L'), program_id: programs[0]._id },
    { name: safeEncrypt('Data Structures - Lec'), code: safeEncrypt('BSCSIT 2104'), program_id: programs[0]._id },
    { name: safeEncrypt('Data Structures - Lab'), code: safeEncrypt('BSCSIT 2104L'), program_id: programs[0]._id },
    { name: safeEncrypt('Networking and Communication 1 - Lec'), code: safeEncrypt('BSCSIT 2105'), program_id: programs[0]._id },
    { name: safeEncrypt('Networking and Communication 1 - Lab'), code: safeEncrypt('BSCSIT 2105L'), program_id: programs[0]._id },
    { name: safeEncrypt('Social and Professional Issues'), code: safeEncrypt('BSCSIT 2106'), program_id: programs[0]._id },
    // Second Year, Second Semester
    { name: safeEncrypt('Calculus'), code: safeEncrypt('BSCS 2204'), program_id: programs[0]._id },
    { name: safeEncrypt('Introduction to Data Science'), code: safeEncrypt('BSCS 2205'), program_id: programs[0]._id },
    { name: safeEncrypt('Design, Analysis and Algorithm Technologies - Lec'), code: safeEncrypt('BSCS 2206'), program_id: programs[0]._id },
    { name: safeEncrypt('Design, Analysis and Algorithm Technologies - Lab'), code: safeEncrypt('BSCS 2206L'), program_id: programs[0]._id },
    { name: safeEncrypt('Human Computer Interaction 1 - Lec'), code: safeEncrypt('BSCS 2207'), program_id: programs[0]._id },
    { name: safeEncrypt('Human Computer Interaction 1 - Lab'), code: safeEncrypt('BSCS 2207L'), program_id: programs[0]._id },
    { name: safeEncrypt('Database System 1 (Information Management) - Lec'), code: safeEncrypt('BSCSIT 2207'), program_id: programs[0]._id },
    { name: safeEncrypt('Database System 1 (Information Management) - Lab'), code: safeEncrypt('BSCSIT 2207L'), program_id: programs[0]._id },
    // Third Year, First Semester
    { name: safeEncrypt('Automata Theory and Formal Languages'), code: safeEncrypt('BSCS 3108'), program_id: programs[0]._id },
    { name: safeEncrypt('Operating System Configuration and Use - Lec'), code: safeEncrypt('BSCS 3109'), program_id: programs[0]._id },
    { name: safeEncrypt('Operating System Configuration and Use - Lab'), code: safeEncrypt('BSCS 3109L'), program_id: programs[0]._id },
    { name: safeEncrypt('Information Assurance and Security - Lec'), code: safeEncrypt('BSCS 3110'), program_id: programs[0]._id },
    { name: safeEncrypt('Information Assurance and Security - Lab'), code: safeEncrypt('BSCS 3110L'), program_id: programs[0]._id },
    { name: safeEncrypt('Data Mining - Lec'), code: safeEncrypt('BSCS 3111'), program_id: programs[0]._id },
    { name: safeEncrypt('Data Mining - Lab'), code: safeEncrypt('BSCS 3111L'), program_id: programs[0]._id },
    { name: safeEncrypt('Artificial Intelligence'), code: safeEncrypt('BSCS 3112'), program_id: programs[0]._id },
    // Third Year, Second Semester
    { name: safeEncrypt('Software Engineering - Lec'), code: safeEncrypt('BSCS 3213'), program_id: programs[0]._id },
    { name: safeEncrypt('Software Engineering - Lab'), code: safeEncrypt('BSCS 3213L'), program_id: programs[0]._id },
    { name: safeEncrypt('Data Visualization - Lec'), code: safeEncrypt('BSCS 3214'), program_id: programs[0]._id },
    { name: safeEncrypt('Data Visualization - Lab'), code: safeEncrypt('BSCS 3214L'), program_id: programs[0]._id },
    { name: safeEncrypt('Parallel and Distributed Computing'), code: safeEncrypt('BSCS 3215'), program_id: programs[0]._id },
    { name: safeEncrypt('Business Intelligence'), code: safeEncrypt('BSCS 3216'), program_id: programs[0]._id },
    { name: safeEncrypt('Human Computer Interaction 2 - Lec'), code: safeEncrypt('BSCS 3217'), program_id: programs[0]._id },
    { name: safeEncrypt('Human Computer Interaction 2 - Lab'), code: safeEncrypt('BSCS 3217L'), program_id: programs[0]._id },
    // Third Year, Summer
    { name: safeEncrypt('Thesis 1'), code: safeEncrypt('BSCS 3318'), program_id: programs[0]._id },
    { name: safeEncrypt('System Fundamentals - Lec'), code: safeEncrypt('BSCS 3319'), program_id: programs[0]._id },
    { name: safeEncrypt('System Fundamentals - Lab'), code: safeEncrypt('BSCS 3319L'), program_id: programs[0]._id },
    // Fourth Year, First Semester
    { name: safeEncrypt('Thesis 2'), code: safeEncrypt('BSCS 4120'), program_id: programs[0]._id },
    { name: safeEncrypt('Data Warehousing - Lec'), code: safeEncrypt('BSCS 4121'), program_id: programs[0]._id },
    { name: safeEncrypt('Data Warehousing - Lab'), code: safeEncrypt('BSCS 4121L'), program_id: programs[0]._id },
    { name: safeEncrypt('Web Systems and Technologies - Lec'), code: safeEncrypt('BSCS 4122'), program_id: programs[0]._id },
    { name: safeEncrypt('Web Systems and Technologies - Lab'), code: safeEncrypt('BSCS 4122L'), program_id: programs[0]._id },
    // Fourth Year, Second Semester
    { name: safeEncrypt('Practicum'), code: safeEncrypt('BSCS 4223'), program_id: programs[0]._id },
    { name: safeEncrypt('Application Development and Emerging Technologies'), code: safeEncrypt('BSCSIT 4208'), program_id: programs[0]._id },
    // BSIT-GD courses (2022-2023 Curriculum)
    // First Year, First Semester
    { name: safeEncrypt('Introduction to Computing - Lec'), code: safeEncrypt('BSCSIT 1101'), program_id: programs[1]._id },
    { name: safeEncrypt('Introduction to Computing - Lab'), code: safeEncrypt('BSCSIT 1101L'), program_id: programs[1]._id },
    { name: safeEncrypt('Fundamentals of Programming - Lec'), code: safeEncrypt('BSCSIT 1102'), program_id: programs[1]._id },
    { name: safeEncrypt('Fundamentals of Programming - Lab'), code: safeEncrypt('BSCSIT 1102L'), program_id: programs[1]._id },
    { name: safeEncrypt('Information Assurance and Security'), code: safeEncrypt('BSIT 1101'), program_id: programs[1]._id },
    // First Year, Second Semester
    { name: safeEncrypt('Programming 2 - Lec'), code: safeEncrypt('BSCSIT 1203'), program_id: programs[1]._id },
    { name: safeEncrypt('Programming 2 - Lab'), code: safeEncrypt('BSCSIT 1203L'), program_id: programs[1]._id },
    { name: safeEncrypt('Human Computer Interaction 1 - Lec'), code: safeEncrypt('BSIT 1202'), program_id: programs[1]._id },
    { name: safeEncrypt('Human Computer Interaction 1 - Lab'), code: safeEncrypt('BSIT 1202L'), program_id: programs[1]._id },
    { name: safeEncrypt('Scriptwriting and Storyboard Design'), code: safeEncrypt('BSIT 1203'), program_id: programs[1]._id },
    // Second Year, First Semester
    { name: safeEncrypt('Data Structures - Lec'), code: safeEncrypt('BSCSIT 2104'), program_id: programs[1]._id },
    { name: safeEncrypt('Data Structures - Lab'), code: safeEncrypt('BSCSIT 2104L'), program_id: programs[1]._id },
    { name: safeEncrypt('Networking and Communication 1 - Lec'), code: safeEncrypt('BSCSIT 2105'), program_id: programs[1]._id },
    { name: safeEncrypt('Networking and Communication 1 - Lab'), code: safeEncrypt('BSCSIT 2105L'), program_id: programs[1]._id },
    { name: safeEncrypt('Social and Professional Issues'), code: safeEncrypt('BSCSIT 2106'), program_id: programs[1]._id },
    { name: safeEncrypt('Graphics and Visual Computing - Lec'), code: safeEncrypt('BSIT 2104'), program_id: programs[1]._id },
    { name: safeEncrypt('Graphics and Visual Computing - Lab'), code: safeEncrypt('BSIT 2104L'), program_id: programs[1]._id },
    // Second Year, Second Semester
    { name: safeEncrypt('Database System 1 (Information Management) - Lec'), code: safeEncrypt('BSCSIT 2207'), program_id: programs[1]._id },
    { name: safeEncrypt('Database System 1 (Information Management) - Lab'), code: safeEncrypt('BSCSIT 2207L'), program_id: programs[1]._id },
    { name: safeEncrypt('Introduction to Game Design and Development - Lec'), code: safeEncrypt('BSIT 2205'), program_id: programs[1]._id },
    { name: safeEncrypt('Introduction to Game Design and Development - Lab'), code: safeEncrypt('BSIT 2205L'), program_id: programs[1]._id },
    { name: safeEncrypt('Integrated Programming and Technologies - Lec'), code: safeEncrypt('BSIT 2206'), program_id: programs[1]._id },
    { name: safeEncrypt('Integrated Programming and Technologies - Lab'), code: safeEncrypt('BSIT 2206L'), program_id: programs[1]._id },
    { name: safeEncrypt('Web Systems and Technologies - Lec'), code: safeEncrypt('BSIT 2207'), program_id: programs[1]._id },
    { name: safeEncrypt('Web Systems and Technologies - Lab'), code: safeEncrypt('BSIT 2207L'), program_id: programs[1]._id },
    // Third Year, First Semester
    { name: safeEncrypt('Discrete Mathematics'), code: safeEncrypt('BSIT 3108'), program_id: programs[1]._id },
    { name: safeEncrypt('Database System 2 - Lec'), code: safeEncrypt('BSIT 3109'), program_id: programs[1]._id },
    { name: safeEncrypt('Database System 2 - Lab'), code: safeEncrypt('BSIT 3109L'), program_id: programs[1]._id },
    { name: safeEncrypt('System Integration and Architecture - Lec'), code: safeEncrypt('BSIT 3110'), program_id: programs[1]._id },
    { name: safeEncrypt('System Integration and Architecture - Lab'), code: safeEncrypt('BSIT 3110L'), program_id: programs[1]._id },
    { name: safeEncrypt('Advanced Game Design - Lec'), code: safeEncrypt('BSIT 3111'), program_id: programs[1]._id },
    { name: safeEncrypt('Advanced Game Design - Lab'), code: safeEncrypt('BSIT 3111L'), program_id: programs[1]._id },
    { name: safeEncrypt('Computer Graphics Programming - Lec'), code: safeEncrypt('BSIT 3112'), program_id: programs[1]._id },
    { name: safeEncrypt('Computer Graphics Programming - Lab'), code: safeEncrypt('BSIT 3112L'), program_id: programs[1]._id },
    // Third Year, Second Semester
    { name: safeEncrypt('Human Computer Interaction 2 - Lec'), code: safeEncrypt('BSIT 3213'), program_id: programs[1]._id },
    { name: safeEncrypt('Human Computer Interaction 2 - Lab'), code: safeEncrypt('BSIT 3213L'), program_id: programs[1]._id },
    { name: safeEncrypt('System Administration and Maintenance - Lec'), code: safeEncrypt('BSIT 3214'), program_id: programs[1]._id },
    { name: safeEncrypt('System Administration and Maintenance - Lab'), code: safeEncrypt('BSIT 3214L'), program_id: programs[1]._id },
    { name: safeEncrypt('Modelling and Rigging - Lec'), code: safeEncrypt('BSIT 3215'), program_id: programs[1]._id },
    { name: safeEncrypt('Modelling and Rigging - Lab'), code: safeEncrypt('BSIT 3215L'), program_id: programs[1]._id },
    { name: safeEncrypt('Animation Design and Production - Lec'), code: safeEncrypt('BSIT 3216'), program_id: programs[1]._id },
    { name: safeEncrypt('Animation Design and Production - Lab'), code: safeEncrypt('BSIT 3216L'), program_id: programs[1]._id },
    { name: safeEncrypt('Artificial Intelligence in Games'), code: safeEncrypt('BSIT 3217'), program_id: programs[1]._id },
    // Third Year, Summer
    { name: safeEncrypt('Capstone Project 1'), code: safeEncrypt('BSIT 3318'), program_id: programs[1]._id },
    { name: safeEncrypt('System Fundamentals - Lec'), code: safeEncrypt('BSIT 3319'), program_id: programs[1]._id },
    { name: safeEncrypt('System Fundamentals - Lab'), code: safeEncrypt('BSIT 3319L'), program_id: programs[1]._id },
    // Fourth Year, First Semester
    { name: safeEncrypt('Capstone Project 2'), code: safeEncrypt('BSIT 4120'), program_id: programs[1]._id },
    { name: safeEncrypt('Texture and Mapping - Lec'), code: safeEncrypt('BSIT 4121'), program_id: programs[1]._id },
    { name: safeEncrypt('Texture and Mapping - Lab'), code: safeEncrypt('BSIT 4121L'), program_id: programs[1]._id },
    { name: safeEncrypt('Game Networking - Lec'), code: safeEncrypt('BSIT 4122'), program_id: programs[1]._id },
    { name: safeEncrypt('Game Networking - Lab'), code: safeEncrypt('BSIT 4122L'), program_id: programs[1]._id },
    // Fourth Year, Second Semester
    { name: safeEncrypt('Application Development and Emerging Technologies'), code: safeEncrypt('BSCSIT 4208'), program_id: programs[1]._id },
    { name: safeEncrypt('Practicum'), code: safeEncrypt('BSIT 4223'), program_id: programs[1]._id }
  ]);
  console.log(`✓ Created ${courses.length} courses`);

  // Create sample sections (pre-configured course offerings for student enrollment)
  console.log('🗂️  Creating sample sections...');
  const sectionsData = [];
  const schoolYear = '2025-2026';
  const semester = '1st Semester';

  // For each course, create 1-3 sections with varying teachers and section codes
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const isCS = course.program_id.toString() === programs[0]._id.toString();
    const prefix = isCS ? 'CS' : 'IT';
    const courseTeachers = isCS
      ? [teachers[0], teachers[2], teachers[4]] // CS dept teachers
      : [teachers[1], teachers[3], teachers[4]]; // IT dept teachers

    // First course of each program gets 3 sections, others get 2
    const numSections = (i === 0 || i === 5) ? 3 : 2;

    for (let s = 0; s < numSections; s++) {
      const sectionLetter = String.fromCharCode(65 + s); // A, B, C
      const yearDigit = (i % 4) + 1; // 1-4 year level hint
      sectionsData.push({
        course_id: course._id,
        teacher_id: courseTeachers[s % courseTeachers.length]._id,
        section_code: safeEncrypt(`${prefix}-${yearDigit}${sectionLetter}`),
        school_year: safeEncrypt(schoolYear),
        semester: safeEncrypt(semester),
        is_active: true
      });
    }
  }

  const sections = await Section.create(sectionsData);
  console.log(`✓ Created ${sections.length} sections (across ${courses.length} courses)`);

  // Build a lookup: course _id → array of section documents
  const sectionsByCourse: Record<string, typeof sections> = {};
  for (const sec of sections) {
    const key = sec.course_id.toString();
    if (!sectionsByCourse[key]) sectionsByCourse[key] = [];
    sectionsByCourse[key].push(sec);
  }

  // Create sample students (50 students)
  // Guaranteed: 5 students per year level per program (40 students), plus 10 random
  console.log('👨‍🎓 Creating sample students...');
  const yearLevels = ['1st', '2nd', '3rd', '4th'] as const;
  const studentsData = [];
  
  const programCodes = ['BSCS-DS', 'BSIT-GD']; // plaintext codes matching programs array order

  const makeStudentNumber = (idx: number) => {
    const third = String(idx % 1000).padStart(3, '0');
    const second = String(Math.floor(idx / 1000) % 10000).padStart(4, '0');
    const first = String(Math.floor(idx / 10000000) % 100).padStart(2, '0');
    return `${first}-${second}-${third}`;
  };

  const makeStudentEntry = (idx: number, programIndex: number, yearLevel: typeof yearLevels[number]) => {
    const programCode = programCodes[programIndex];
    const sectionLetter = String.fromCharCode(65 + Math.floor(Math.random() * 3)); // A, B, or C
    const sectionPrefix = programCode.startsWith('BSCS') ? 'CS' : 'IT';
    const sectionYear = yearLevel.charAt(0);
    const section = `${sectionPrefix}-${sectionYear}${sectionLetter}`;
    return {
      student_number: safeEncrypt(makeStudentNumber(idx)),
      program_id: programs[programIndex]._id,
      year_level: safeEncrypt(yearLevel),
      section: safeEncrypt(section),
      status: safeEncrypt('Regular')
    };
  };

  // Guarantee at least 5 students per year level per program (40 total)
  let studentIdx = 0;
  for (const yearLevel of yearLevels) {
    for (let p = 0; p < programs.length; p++) {
      for (let k = 0; k < 5; k++) {
        studentsData.push(makeStudentEntry(studentIdx++, p, yearLevel));
      }
    }
  }

  // Add 10 more random students to reach 50
  for (let i = 0; i < 10; i++) {
    const programIndex = Math.floor(Math.random() * programs.length);
    const yearLevel = yearLevels[Math.floor(Math.random() * yearLevels.length)];
    studentsData.push(makeStudentEntry(studentIdx++, programIndex, yearLevel));
  }
  
  const students = await Student.create(studentsData);
  console.log(`✓ Created ${students.length} students`);

  // Create sample enrollments (randomized for all students)
  console.log('📝 Creating sample enrollments...');
  const enrollmentsData = [];
  
  for (const student of students) {
    const studentProgramId = student.program_id;
    
    // Get courses for this program
    const programCourses = courses.filter(c =>
      c.program_id.toString() === studentProgramId.toString()
    );
    
    // Randomly select 2-4 courses for this student
    const numCourses = 2 + Math.floor(Math.random() * 3);
    const shuffledCourses = [...programCourses].sort(() => Math.random() - 0.5);
    const selectedCourses = shuffledCourses.slice(0, Math.min(numCourses, programCourses.length));
    
    for (const course of selectedCourses) {
      // Pick a random pre-configured section for this course
      const courseSections = sectionsByCourse[course._id.toString()] || [];
      if (courseSections.length === 0) continue;
      const sec = courseSections[Math.floor(Math.random() * courseSections.length)];

      enrollmentsData.push({
        student_id: student._id,
        course_id: sec.course_id,
        teacher_id: sec.teacher_id,
        section_code: sec.section_code, // already encrypted
        school_year: sec.school_year,   // already encrypted
        semester: sec.semester,          // already encrypted
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
  console.log(`  • ${sections.length} sections (pre-configured for enrollment)`);
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
