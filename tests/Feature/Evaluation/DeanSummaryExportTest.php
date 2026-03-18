<?php

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\Section;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\UploadedFile;

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

function createDocxTemplateUploadWithHeaderImage(string $headerText, string $footerText): UploadedFile
{
    $tempPath = tempnam(sys_get_temp_dir(), 'template-img-');

    if ($tempPath === false) {
        throw new RuntimeException('Failed to create temporary file for DOCX template with image.');
    }

    $docxPath = $tempPath.'.docx';
    rename($tempPath, $docxPath);

    $zip = new ZipArchive();
    $opened = $zip->open($docxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

    if ($opened !== true) {
        throw new RuntimeException('Failed to open DOCX archive for writing image template.');
    }

    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    $zip->addFromString('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:body></w:document>');
    $zip->addFromString('word/header1.xml', '<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImage1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:p><w:r><w:t>'.htmlspecialchars($headerText, ENT_QUOTES).'</w:t></w:r></w:p></w:hdr>');
    $zip->addFromString('word/_rels/header1.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="media/image1.png" Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"/></Relationships>');
    $zip->addFromString('word/media/image1.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Yb9QAAAAASUVORK5CYII=', true) ?: '');
    $zip->addFromString('word/footer1.xml', '<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>'.htmlspecialchars($footerText, ENT_QUOTES).'</w:t></w:r></w:p></w:ftr>');
    $zip->close();

    return new UploadedFile($docxPath, 'template-with-image.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
}

function createDocxTemplateUploadWithDuplicateHeaderParts(string $headerText, string $footerText): UploadedFile
{
    $tempPath = tempnam(sys_get_temp_dir(), 'template-dup-');

    if ($tempPath === false) {
        throw new RuntimeException('Failed to create temporary file for duplicate-header DOCX template.');
    }

    $docxPath = $tempPath.'.docx';
    rename($tempPath, $docxPath);

    $zip = new ZipArchive();
    $opened = $zip->open($docxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

    if ($opened !== true) {
        throw new RuntimeException('Failed to open duplicate-header DOCX archive for writing.');
    }

    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Yb9QAAAAASUVORK5CYII=', true) ?: '';

    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    $zip->addFromString('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:body></w:document>');

    $headerXml = '<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImage1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:p><w:r><w:t>'.htmlspecialchars($headerText, ENT_QUOTES).'</w:t></w:r></w:p></w:hdr>';
    $headerRels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>';

    $zip->addFromString('word/header1.xml', $headerXml);
    $zip->addFromString('word/header2.xml', $headerXml);
    $zip->addFromString('word/_rels/header1.xml.rels', $headerRels);
    $zip->addFromString('word/_rels/header2.xml.rels', $headerRels);
    $zip->addFromString('word/media/image1.png', $png);
    $zip->addFromString('word/footer1.xml', '<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>'.htmlspecialchars($footerText, ENT_QUOTES).'</w:t></w:r></w:p></w:ftr>');
    $zip->close();

    return new UploadedFile($docxPath, 'template-duplicate-headers.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
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
    $uploadResponse->assertSessionHas('status', 'Template imported successfully and set as default for all previews and exports.');

    $docResponse = $this->actingAs($dean)->get(route('dean.summaries.export-class-section', [
        'classSection' => $classSection,
        'format' => 'doc',
    ]));

    $docResponse->assertOk();
    $docResponse->assertHeader('content-type', 'application/msword');
    $docResponse->assertSee('MY CUSTOM HEADER', false);
    $docResponse->assertSee('MY CUSTOM FOOTER', false);
});

test('dean can import docx template header image and it appears in doc export', function () {
    $classSection = createClassSectionWithEvaluation();

    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $templateFile = createDocxTemplateUploadWithHeaderImage('IMAGE HEADER', 'IMAGE FOOTER');

    $uploadResponse = $this->actingAs($dean)->post(route('dean.summaries.template.store'), [
        'template_file' => $templateFile,
    ]);

    $uploadResponse->assertRedirect();
    $uploadResponse->assertSessionHas('status', 'Template imported successfully and set as default for all previews and exports. Imported 1 image(s) from header/footer.');

    $docResponse = $this->actingAs($dean)->get(route('dean.summaries.export-class-section', [
        'classSection' => $classSection,
        'format' => 'doc',
    ]));

    $docResponse->assertOk();
    $docResponse->assertHeader('content-type', 'application/msword');
    $docResponse->assertSee('data:image/png;base64,', false);
    $docResponse->assertSee('IMAGE HEADER', false);
});

test('dean import deduplicates duplicated header image parts', function () {
    $classSection = createClassSectionWithEvaluation();

    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $templateFile = createDocxTemplateUploadWithDuplicateHeaderParts('DEDUP HEADER', 'DEDUP FOOTER');

    $uploadResponse = $this->actingAs($dean)->post(route('dean.summaries.template.store'), [
        'template_file' => $templateFile,
    ]);

    $uploadResponse->assertRedirect();
    $uploadResponse->assertSessionHas('status', 'Template imported successfully and set as default for all previews and exports. Imported 1 image(s) from header/footer.');

    $docResponse = $this->actingAs($dean)->get(route('dean.summaries.export-class-section', [
        'classSection' => $classSection,
        'format' => 'doc',
    ]));

    $docResponse->assertOk();
    $docResponse->assertHeader('content-type', 'application/msword');

    $html = $docResponse->getContent();
    expect(substr_count($html ?: '', 'data:image/png;base64,'))->toBe(1);
    expect(substr_count($html ?: '', 'DEDUP HEADER'))->toBe(1);
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

test('dean can save large header and footer html from preview editor', function () {
    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $largeHtml = '<div class="template-fragment">'.str_repeat('A', 30000).'</div>';

    $saveResponse = $this->actingAs($dean)->postJson(route('dean.summaries.template.manual.store'), [
        'header_html' => $largeHtml,
        'footer_html' => $largeHtml,
        'header_text' => 'Large header',
        'footer_text' => 'Large footer',
    ]);

    $saveResponse->assertOk();
    $saveResponse->assertJson([
        'status' => 'Template header/footer saved from preview editor.',
    ]);
});

test('dean receives validation error when manual template fragments are too large', function () {
    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $tooLargeHtml = '<div class="template-fragment">'.str_repeat('X', 1000001).'</div>';

    $uploadResponse = $this->actingAs($dean)->postJson(route('dean.summaries.template.manual.store'), [
        'header_html' => $tooLargeHtml,
        'footer_html' => $tooLargeHtml,
        'header_text' => 'Header',
        'footer_text' => 'Footer',
    ]);

    $uploadResponse->assertStatus(422);
    $uploadResponse->assertJsonValidationErrors(['header_html', 'footer_html']);
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
