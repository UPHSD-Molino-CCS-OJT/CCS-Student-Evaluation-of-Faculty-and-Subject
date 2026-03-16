<?php

use App\Http\Controllers\DashboardRedirectController;
use App\Http\Controllers\DeanEvaluationSummaryController;
use App\Http\Controllers\FacultyEvaluationReportController;
use App\Http\Controllers\StudentEvaluationController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

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

    Route::middleware('role:dean')->group(function () {
        Route::get('dean/summaries', [DeanEvaluationSummaryController::class, 'index'])
            ->name('dean.summaries.index');
    });
});

require __DIR__.'/settings.php';
