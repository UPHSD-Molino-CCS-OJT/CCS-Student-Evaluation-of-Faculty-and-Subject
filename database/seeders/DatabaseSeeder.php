<?php

namespace Database\Seeders;

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\Section;
use App\Models\StudentSectionEnrollment;
use App\Models\Subject;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $sampleStudentId = '1-2345-678';

        $student = User::factory()->create([
            'name' => 'Sample Student',
            'email' => 'cantara.michaelangelo@gmail.com',
            'student_id' => $sampleStudentId,
            'role' => 'student',
            'password' => Hash::make($sampleStudentId),
        ]);

        $facultyOne = User::factory()->create([
            'name' => 'Prof. Ada Lovelace',
            'email' => 'ada.faculty@example.com',
            'student_id' => null,
            'role' => 'faculty',
            'password' => Hash::make('password'),
        ]);

        $facultyTwo = User::factory()->create([
            'name' => 'Prof. Alan Turing',
            'email' => 'alan.faculty@example.com',
            'student_id' => null,
            'role' => 'faculty',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'name' => 'CCS Dean',
            'email' => 'dean@example.com',
            'student_id' => null,
            'role' => 'dean',
            'password' => Hash::make('password'),
        ]);

        $subjectOne = Subject::create([
            'code' => 'CCS101',
            'title' => 'Introduction to Computing',
        ]);

        $subjectTwo = Subject::create([
            'code' => 'CCS210',
            'title' => 'Data Structures and Algorithms',
        ]);

        $sectionOne = Section::create(['code' => 'BSCS-2A']);
        $sectionTwo = Section::create(['code' => 'BSCS-2B']);

        $classOne = ClassSection::create([
            'subject_id' => $subjectOne->id,
            'faculty_id' => $facultyOne->id,
            'section_id' => $sectionOne->id,
            'school_year' => '2025-2026',
            'term' => '2nd Semester',
        ]);

        $classTwo = ClassSection::create([
            'subject_id' => $subjectTwo->id,
            'faculty_id' => $facultyTwo->id,
            'section_id' => $sectionTwo->id,
            'school_year' => '2025-2026',
            'term' => '2nd Semester',
        ]);

        StudentSectionEnrollment::create([
            'student_id' => $student->id,
            'class_section_id' => $classOne->id,
        ]);

        StudentSectionEnrollment::create([
            'student_id' => $student->id,
            'class_section_id' => $classTwo->id,
        ]);

        $evaluation = Evaluation::create([
            'student_id' => $student->id,
            'class_section_id' => $classOne->id,
            'comments' => 'Well-organized class and clear teaching approach.',
            'submitted_at' => now(),
        ]);

        foreach (range(1, 25) as $number) {
            EvaluationResponse::create([
                'evaluation_id' => $evaluation->id,
                'question_number' => $number,
                'rating' => 4,
            ]);
        }

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'student_id' => null,
            'role' => 'student',
        ]);
    }
}
