<?php

use App\Http\Controllers\DashboardRedirectController;
use App\Http\Controllers\DeanEvaluationSummaryController;
use App\Http\Controllers\DeanProgramCoursesController;
use App\Http\Controllers\EvaluationSettingController;
use App\Http\Controllers\FacultyEvaluationReportController;
use App\Http\Controllers\SubjectImportController;
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
    });

    Route::middleware('role:dean,system_admin,staff')->group(function () {
        Route::get('dean/summaries', [DeanEvaluationSummaryController::class, 'index'])
            ->name('dean.summaries.index');

        Route::get('dean/program-courses', [DeanProgramCoursesController::class, 'index'])
            ->name('dean.program-courses.index');

        Route::get('dean/subjects/import-template', [SubjectImportController::class, 'downloadTemplate'])
            ->name('dean.subjects.import-template');

        Route::post('dean/subjects/import', [SubjectImportController::class, 'store'])
            ->name('dean.subjects.import');

        Route::patch('evaluation-settings', [EvaluationSettingController::class, 'update'])
            ->name('evaluation-settings.update');
    });
});

require __DIR__.'/settings.php';
