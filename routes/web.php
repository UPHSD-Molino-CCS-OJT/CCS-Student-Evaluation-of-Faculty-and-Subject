<?php

use App\Http\Controllers\DashboardRedirectController;
use App\Http\Controllers\DeanEvaluationSummaryController;
use App\Http\Controllers\DeanEnrollmentController;
use App\Http\Controllers\DeanManagementController;
use App\Http\Controllers\DeanProgramCoursesController;
use App\Http\Controllers\DeanStudentsController;
use App\Http\Controllers\DeanFacultyManagementController;
use App\Http\Controllers\EvaluationSettingController;
use App\Http\Controllers\FacultyEvaluationReportController;
use App\Http\Controllers\SubjectImportController;
use App\Http\Controllers\Auth\StudentRegisteredUserController;
use App\Http\Controllers\StudentEvaluationController;
use App\Http\Controllers\Auth\StudentAuthenticatedSessionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Request $request) {
    return $request->user()
        ? redirect()->route('dashboard')
        : redirect()->route('student.login');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('student/login', [StudentAuthenticatedSessionController::class, 'create'])
        ->name('student.login');

    Route::post('student/login', [StudentAuthenticatedSessionController::class, 'store'])
        ->name('student.login.store');

    Route::get('student/register', [StudentRegisteredUserController::class, 'create'])
        ->name('student.register');

    Route::post('student/register', [StudentRegisteredUserController::class, 'store'])
        ->name('student.register.store');
});

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardRedirectController::class)->name('dashboard');

    Route::middleware('role:student')->group(function () {
        Route::get('student/evaluations', [StudentEvaluationController::class, 'index'])
            ->name('student.evaluations.index');

        Route::get('student/evaluations/{classSection}', [StudentEvaluationController::class, 'create'])
            ->name('student.evaluations.create');

        Route::post('student/evaluations/{classSection}', [StudentEvaluationController::class, 'store'])
            ->name('student.evaluations.store');
    });

    Route::middleware('role:faculty')->group(function () {
        Route::get('faculty/reports', [FacultyEvaluationReportController::class, 'index'])
            ->name('faculty.reports.index');

        Route::post('faculty/reports/{classSection}/sign', [FacultyEvaluationReportController::class, 'signAndSubmit'])
            ->name('faculty.reports.sign');
    });

    Route::middleware('role:dean,system_admin,staff,faculty')->group(function () {
        Route::get('dean/program-courses', [DeanProgramCoursesController::class, 'index'])
            ->name('dean.program-courses.index');

        Route::post('dean/program-courses', [DeanProgramCoursesController::class, 'store'])
            ->name('dean.program-courses.store');

        Route::patch('dean/program-courses', [DeanProgramCoursesController::class, 'store'])
            ->name('dean.program-courses.update');

        Route::delete('dean/program-courses/{subject}', [DeanProgramCoursesController::class, 'destroy'])
            ->name('dean.program-courses.destroy');

        Route::delete('dean/program-courses/program/remove', [DeanProgramCoursesController::class, 'destroyProgram'])
            ->name('dean.program-courses.destroy-program');
    });

    Route::middleware('role:dean,system_admin,staff')->group(function () {
        Route::get('dean/summaries', [DeanEvaluationSummaryController::class, 'index'])
            ->name('dean.summaries.index');

        Route::post('dean/summaries/template', [DeanEvaluationSummaryController::class, 'storeTemplate'])
            ->name('dean.summaries.template.store');

        Route::post('dean/summaries/template/preview', [DeanEvaluationSummaryController::class, 'previewTemplateImport'])
            ->name('dean.summaries.template.preview');

        Route::post('dean/summaries/template/manual', [DeanEvaluationSummaryController::class, 'storeTemplateManual'])
            ->name('dean.summaries.template.manual.store');

        Route::get('dean/summaries/preview', [DeanEvaluationSummaryController::class, 'previewOverall'])
            ->name('dean.summaries.preview-overall');

        Route::get('dean/summaries/export', [DeanEvaluationSummaryController::class, 'exportOverall'])
            ->name('dean.summaries.export-overall');

        Route::get('dean/summaries/export/pdf-office', [DeanEvaluationSummaryController::class, 'downloadOverallPdfOffice'])
            ->name('dean.summaries.export-overall-pdf-office');

        Route::get('dean/summaries/class-sections/{classSection}/export', [DeanEvaluationSummaryController::class, 'exportClassSection'])
            ->name('dean.summaries.export-class-section');

        Route::get('dean/summaries/sections/{section}/export', [DeanEvaluationSummaryController::class, 'exportSection'])
            ->name('dean.summaries.export-section');

        Route::get('dean/summaries/class-sections/{classSection}/export/pdf-office', [DeanEvaluationSummaryController::class, 'downloadClassSectionPdfOffice'])
            ->name('dean.summaries.export-class-section-pdf-office');

        Route::get('dean/summaries/class-sections/{classSection}/preview', [DeanEvaluationSummaryController::class, 'previewClassSection'])
            ->name('dean.summaries.preview-class-section');

        Route::post('dean/summaries/class-sections/{classSection}/sign', [DeanEvaluationSummaryController::class, 'signClassSection'])
            ->name('dean.summaries.sign-class-section');

        Route::get('dean/students', [DeanStudentsController::class, 'index'])
            ->name('dean.students.index');

        Route::patch('dean/students/{student}', [DeanStudentsController::class, 'update'])
            ->name('dean.students.update');

        Route::get('dean/enrollments', [DeanEnrollmentController::class, 'index'])
            ->name('dean.enrollments.index');

        Route::post('dean/enrollments', [DeanEnrollmentController::class, 'store'])
            ->name('dean.enrollments.store');

        Route::patch('dean/enrollments/{enrollment}', [DeanEnrollmentController::class, 'update'])
            ->name('dean.enrollments.update');

        Route::delete('dean/enrollments/{enrollment}', [DeanEnrollmentController::class, 'destroy'])
            ->name('dean.enrollments.destroy');

        Route::get('dean/faculty-management', [DeanFacultyManagementController::class, 'index'])
            ->name('dean.faculty-management.index');

        Route::post('dean/faculty-management/faculty', [DeanFacultyManagementController::class, 'storeFaculty'])
            ->name('dean.faculty-management.faculty.store');

        Route::patch('dean/faculty-management/faculty/{faculty}', [DeanFacultyManagementController::class, 'updateFaculty'])
            ->name('dean.faculty-management.faculty.update');

        Route::delete('dean/faculty-management/faculty/{faculty}', [DeanFacultyManagementController::class, 'destroyFaculty'])
            ->name('dean.faculty-management.faculty.destroy');

        Route::post('dean/faculty-management', [DeanFacultyManagementController::class, 'store'])
            ->name('dean.faculty-management.store');

        Route::patch('dean/faculty-management/{classSection}', [DeanFacultyManagementController::class, 'update'])
            ->name('dean.faculty-management.update');

        Route::delete('dean/faculty-management/{classSection}', [DeanFacultyManagementController::class, 'destroy'])
            ->name('dean.faculty-management.destroy');

        Route::get('dean/subjects/import-template', [SubjectImportController::class, 'downloadTemplate'])
            ->name('dean.subjects.import-template');

        Route::post('dean/subjects/import', [SubjectImportController::class, 'store'])
            ->name('dean.subjects.import');

        Route::patch('evaluation-settings', [EvaluationSettingController::class, 'update'])
            ->name('evaluation-settings.update');
    });

    Route::middleware('role:system_admin,staff')->group(function () {
        Route::get('dean/dean-management', [DeanManagementController::class, 'index'])
            ->name('dean.dean-management.index');

        Route::post('dean/dean-management', [DeanManagementController::class, 'store'])
            ->name('dean.dean-management.store');

        Route::patch('dean/dean-management/{dean}', [DeanManagementController::class, 'update'])
            ->name('dean.dean-management.update');

        Route::delete('dean/dean-management/{dean}', [DeanManagementController::class, 'destroy'])
            ->name('dean.dean-management.destroy');
    });
});

Route::get('dean/summaries/export/preview-docx-source', [DeanEvaluationSummaryController::class, 'previewOverallDocxSource'])
    ->middleware('signed')
    ->name('dean.summaries.preview-overall.docx-source');

Route::get('dean/summaries/class-sections/{classSection}/export/preview-docx-source', [DeanEvaluationSummaryController::class, 'previewClassSectionDocxSource'])
    ->middleware('signed')
    ->name('dean.summaries.preview-class-section.docx-source');

require __DIR__.'/settings.php';
