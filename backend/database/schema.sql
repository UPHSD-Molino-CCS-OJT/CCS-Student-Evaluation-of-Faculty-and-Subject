-- Create Database
CREATE DATABASE IF NOT EXISTS faculty_evaluation;
USE faculty_evaluation;

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Programs Table
CREATE TABLE IF NOT EXISTS programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50),
    email VARCHAR(100),
    department VARCHAR(100),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses/Subjects Table
CREATE TABLE IF NOT EXISTS courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    program_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL
);

-- Evaluations Table
CREATE TABLE IF NOT EXISTS evaluations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_year VARCHAR(20) NOT NULL,
    student_number VARCHAR(20) NOT NULL,
    program_id INT,
    year_level ENUM('1st', '2nd', '3rd', '4th') NOT NULL,
    status ENUM('Regular', 'Irregular') NOT NULL,
    course_id INT,
    teacher_id INT,
    
    -- The Teacher ratings
    teacher_diction INT NOT NULL,
    teacher_grammar INT NOT NULL,
    teacher_personality INT NOT NULL,
    teacher_disposition INT NOT NULL,
    teacher_dynamic INT NOT NULL,
    teacher_fairness INT NOT NULL,
    
    -- Learning Process ratings
    learning_motivation INT NOT NULL,
    learning_critical_thinking INT NOT NULL,
    learning_organization INT NOT NULL,
    learning_interest INT NOT NULL,
    learning_explanation INT NOT NULL,
    learning_clarity INT NOT NULL,
    learning_integration INT NOT NULL,
    learning_mastery INT NOT NULL,
    learning_methodology INT NOT NULL,
    learning_values INT NOT NULL,
    learning_grading INT NOT NULL,
    learning_synthesis INT NOT NULL,
    learning_reasonableness INT NOT NULL,
    
    -- Classroom Management ratings
    classroom_attendance INT NOT NULL,
    classroom_policies INT NOT NULL,
    classroom_discipline INT NOT NULL,
    classroom_authority INT NOT NULL,
    classroom_prayers INT NOT NULL,
    classroom_punctuality INT NOT NULL,
    
    -- Comments
    comments TEXT,
    
    -- Metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- Insert default admin (password: admin123)
INSERT INTO admins (username, password, full_name, email) 
VALUES ('admin', '$2b$10$rQZ5YJ0YqGxXkQ7fF7sYruXhYkGz8oZrZf5rPqKwH0hN/2vXxjwOy', 'System Administrator', 'admin@uphsd.edu.ph')
ON DUPLICATE KEY UPDATE username=username;

-- Insert default programs
INSERT INTO programs (name, code) VALUES
('BS Computer Science - Data Science', 'BSCS-DS'),
('BS Information Technology - Game Development', 'BSIT-GD')
ON DUPLICATE KEY UPDATE name=name;

-- Insert sample teachers
INSERT INTO teachers (full_name, employee_id, email, department) VALUES
('Prof. Juan Dela Cruz', 'EMP001', 'jdelacruz@uphsd.edu.ph', 'Computer Science'),
('Prof. Maria Santos', 'EMP002', 'msantos@uphsd.edu.ph', 'Information Technology'),
('Prof. Jose Garcia', 'EMP003', 'jgarcia@uphsd.edu.ph', 'Computer Science'),
('Prof. Ana Reyes', 'EMP004', 'areyes@uphsd.edu.ph', 'Information Technology'),
('Prof. Pedro Martinez', 'EMP005', 'pmartinez@uphsd.edu.ph', 'Computer Science')
ON DUPLICATE KEY UPDATE full_name=full_name;

-- Insert sample courses
INSERT INTO courses (name, code, program_id) VALUES
('Data Structures and Algorithms', 'CS201', 1),
('Database Management Systems', 'CS202', 1),
('Machine Learning', 'CS301', 1),
('Statistical Analysis', 'CS302', 1),
('Big Data Analytics', 'CS401', 1),
('Game Design Fundamentals', 'IT201', 2),
('Game Programming', 'IT202', 2),
('3D Modeling and Animation', 'IT301', 2),
('Game Engine Architecture', 'IT302', 2),
('Mobile Game Development', 'IT401', 2)
ON DUPLICATE KEY UPDATE name=name;

-- Create indexes for better performance
CREATE INDEX idx_student_number ON evaluations(student_number);
CREATE INDEX idx_teacher_id ON evaluations(teacher_id);
CREATE INDEX idx_school_year ON evaluations(school_year);
CREATE INDEX idx_submitted_at ON evaluations(submitted_at);
