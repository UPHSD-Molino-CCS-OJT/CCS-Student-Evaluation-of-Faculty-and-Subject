<?php

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationReportSignoff;
use App\Models\EvaluationResponse;
use App\Models\Section;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function createClassSectionWithSignedDataForEsign(): ClassSection
{
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-9876-543',
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS420',
        'title' => 'Advanced Databases',
    ]);

    $section = Section::query()->create([
        'code' => 'BSCS-4A',
    ]);

    $classSection = ClassSection::query()->create([
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'section_id' => $section->id,
        'school_year' => '2025-2026',
        'term' => '2nd Semester',
    ]);

    $evaluation = Evaluation::query()->create([
        'student_id' => $student->id,
        'class_section_id' => $classSection->id,
        'comments' => 'Good teaching flow',
        'submitted_at' => now(),
    ]);

    foreach (range(1, 25) as $questionNumber) {
        EvaluationResponse::query()->create([
            'evaluation_id' => $evaluation->id,
            'question_number' => $questionNumber,
            'rating' => 4,
        ]);
    }

    return $classSection;
}

test('faculty can upload esign and sign report in one click', function () {
    Storage::fake('public');

    $classSection = createClassSectionWithSignedDataForEsign();
    $faculty = $classSection->faculty;

    $this->actingAs($faculty)->patch(route('profile.esign.update'), [
        'esign_image' => UploadedFile::fake()->image('faculty-signature.png', 320, 120),
    ]);

    $faculty->refresh();

    expect($faculty->esign_image_path)->not->toBeNull();

    $response = $this->actingAs($faculty)
        ->post(route('faculty.reports.sign', $classSection));

    $response->assertRedirect();

    $this->assertDatabaseHas('evaluation_report_signoffs', [
        'class_section_id' => $classSection->id,
        'faculty_user_id' => $faculty->id,
        'faculty_signature_path' => $faculty->esign_image_path,
    ]);
});

test('dean can sign after faculty submits and signatures appear in preview document', function () {
    Storage::fake('public');

    $classSection = createClassSectionWithSignedDataForEsign();
    $faculty = $classSection->faculty;

    $this->actingAs($faculty)->patch(route('profile.esign.update'), [
        'esign_image' => UploadedFile::fake()->image('faculty-signature.png', 320, 120),
    ]);

    $this->actingAs($faculty)->post(route('faculty.reports.sign', $classSection));

    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $this->actingAs($dean)->patch(route('profile.esign.update'), [
        'esign_image' => UploadedFile::fake()->image('dean-signature.png', 320, 120),
    ]);

    $signResponse = $this->actingAs($dean)->post(route('dean.summaries.sign-class-section', $classSection));
    $signResponse->assertRedirect();

    $signoff = EvaluationReportSignoff::query()->where('class_section_id', $classSection->id)->first();

    expect($signoff)->not->toBeNull();
    expect($signoff?->dean_user_id)->toBe($dean->id);
    expect($signoff?->dean_signed_at)->not->toBeNull();

    $previewResponse = $this->actingAs($dean)->get(route('dean.summaries.preview-class-section', $classSection));
    $previewResponse->assertOk();
    $previewResponse->assertSee('E-Signatures', false);
    $previewResponse->assertSee($faculty->name, false);
    $previewResponse->assertSee($dean->name, false);
});

test('dean cannot sign report before faculty submits signed report', function () {
    Storage::fake('public');

    $classSection = createClassSectionWithSignedDataForEsign();

    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $this->actingAs($dean)->patch(route('profile.esign.update'), [
        'esign_image' => UploadedFile::fake()->image('dean-signature.png', 320, 120),
    ]);

    $response = $this->actingAs($dean)->from(route('dean.summaries.index'))
        ->post(route('dean.summaries.sign-class-section', $classSection));

    $response->assertRedirect(route('dean.summaries.index'));
    $response->assertSessionHasErrors('esign');
});
