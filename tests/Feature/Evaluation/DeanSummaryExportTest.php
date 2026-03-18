<?php

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\Section;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use ZipArchive;

function createClassSectionWithEvaluation(): ClassSection
{
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-1234-567',
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS320',
        'title' => 'Database Systems',
    ]);

    $section = Section::query()->create([
        'code' => 'BSCS-3A',
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
        'comments' => 'Great course',
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

function createDocxTemplateUpload(string $headerText, string $footerText): UploadedFile
{
    $tempPath = tempnam(sys_get_temp_dir(), 'template-');

    if ($tempPath === false) {
        throw new RuntimeException('Failed to create temporary file for DOCX template.');
    }

    $docxPath = $tempPath.'.docx';
    rename($tempPath, $docxPath);

    $zip = new ZipArchive();
    $opened = $zip->open($docxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

    if ($opened !== true) {
        throw new RuntimeException('Failed to open DOCX archive for writing.');
    }

    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    $zip->addFromString('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:body></w:document>');
    $zip->addFromString('word/header1.xml', '<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>'.htmlspecialchars($headerText, ENT_QUOTES).'</w:t></w:r></w:p></w:hdr>');
    $zip->addFromString('word/footer1.xml', '<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>'.htmlspecialchars($footerText, ENT_QUOTES).'</w:t></w:r></w:p></w:ftr>');
    $zip->close();

    return new UploadedFile($docxPath, 'template.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
}

test('dean staff and system admin can export overall summary', function (string $role) {
    createClassSectionWithEvaluation();

    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.summaries.export-overall'));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $response->assertHeader('content-disposition');

    $content = $response->streamedContent();
    expect(substr($content, 0, 2))->toBe('PK');
})->with(['dean', 'staff', 'system_admin']);

test('dean staff and system admin can preview overall summary', function (string $role) {
    createClassSectionWithEvaluation();

    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.summaries.preview-overall'));

    $response->assertOk();
    $response->assertHeader('content-type', 'text/html; charset=UTF-8');
    $response->assertSee('Overall Evaluation Summary', false);
})->with(['dean', 'staff', 'system_admin']);

test('dean staff and system admin can export class section summary', function (string $role) {
    $classSection = createClassSectionWithEvaluation();

    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.summaries.export-class-section', $classSection));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $response->assertHeader('content-disposition');

    $content = $response->streamedContent();
    expect(substr($content, 0, 2))->toBe('PK');
})->with(['dean', 'staff', 'system_admin']);

test('dean staff and system admin can preview class section summary', function (string $role) {
    $classSection = createClassSectionWithEvaluation();

    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.summaries.preview-class-section', $classSection));

    $response->assertOk();
    $response->assertHeader('content-type', 'text/html; charset=UTF-8');
    $response->assertSee('STUDENT EVALUATION', false);
})->with(['dean', 'staff', 'system_admin']);

test('dean can export overall and class section as doc', function () {
    $classSection = createClassSectionWithEvaluation();

    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $overallResponse = $this->actingAs($dean)->get(route('dean.summaries.export-overall', ['format' => 'doc']));
    $overallResponse->assertOk();
    $overallResponse->assertHeader('content-type', 'application/msword');

    $classResponse = $this->actingAs($dean)->get(route('dean.summaries.export-class-section', [
        'classSection' => $classSection,
        'format' => 'doc',
    ]));
    $classResponse->assertOk();
    $classResponse->assertHeader('content-type', 'application/msword');
});

test('dean can import docx template header and footer and they appear in doc export', function () {
    $classSection = createClassSectionWithEvaluation();

    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $templateFile = createDocxTemplateUpload('MY CUSTOM HEADER', 'MY CUSTOM FOOTER');

    $uploadResponse = $this->actingAs($dean)->post(route('dean.summaries.template.store'), [
        'template_file' => $templateFile,
    ]);

    $uploadResponse->assertRedirect();
    $uploadResponse->assertSessionHas('status', 'Document header/footer template imported successfully.');

    $docResponse = $this->actingAs($dean)->get(route('dean.summaries.export-class-section', [
        'classSection' => $classSection,
        'format' => 'doc',
    ]));

    $docResponse->assertOk();
    $docResponse->assertHeader('content-type', 'application/msword');
    $docResponse->assertSee('MY CUSTOM HEADER', false);
    $docResponse->assertSee('MY CUSTOM FOOTER', false);
});

test('dean can save header and footer from preview editor and they appear in doc export', function () {
    $classSection = createClassSectionWithEvaluation();

    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $saveResponse = $this->actingAs($dean)->postJson(route('dean.summaries.template.manual.store'), [
        'header_html' => '<div class="template-fragment"><div>MANUAL HEADER</div></div>',
        'footer_html' => '<div class="template-fragment"><div>MANUAL FOOTER</div></div>',
        'header_text' => 'MANUAL HEADER',
        'footer_text' => 'MANUAL FOOTER',
    ]);

    $saveResponse->assertOk();
    $saveResponse->assertJson([
        'status' => 'Template header/footer saved from preview editor.',
    ]);

    $docResponse = $this->actingAs($dean)->get(route('dean.summaries.export-class-section', [
        'classSection' => $classSection,
        'format' => 'doc',
    ]));

    $docResponse->assertOk();
    $docResponse->assertHeader('content-type', 'application/msword');
    $docResponse->assertSee('MANUAL HEADER', false);
    $docResponse->assertSee('MANUAL FOOTER', false);
});

test('faculty cannot export dean summaries', function () {
    $classSection = createClassSectionWithEvaluation();

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $overallResponse = $this->actingAs($faculty)->get(route('dean.summaries.export-overall'));
    $overallResponse->assertForbidden();

    $classResponse = $this->actingAs($faculty)->get(route('dean.summaries.export-class-section', $classSection));
    $classResponse->assertForbidden();

    $overallPreviewResponse = $this->actingAs($faculty)->get(route('dean.summaries.preview-overall'));
    $overallPreviewResponse->assertForbidden();

    $classPreviewResponse = $this->actingAs($faculty)->get(route('dean.summaries.preview-class-section', $classSection));
    $classPreviewResponse->assertForbidden();
});
