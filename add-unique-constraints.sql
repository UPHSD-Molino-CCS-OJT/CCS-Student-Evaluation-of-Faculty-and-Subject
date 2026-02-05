-- Add unique constraints to prevent duplicates
USE faculty_evaluation;

-- Add unique constraint for programs (name should be unique)
ALTER TABLE programs 
ADD UNIQUE KEY unique_program_name (name);

-- Add unique constraint for teachers (employee_id should be unique)
ALTER TABLE teachers 
ADD UNIQUE KEY unique_employee_id (employee_id);

-- Add unique constraint for courses (same course name can't exist twice in the same program)
ALTER TABLE courses 
ADD UNIQUE KEY unique_course_per_program (name, program_id);

-- Show the constraints
SHOW INDEX FROM programs;
SHOW INDEX FROM teachers;
SHOW INDEX FROM courses;
