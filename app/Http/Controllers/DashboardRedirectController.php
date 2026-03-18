<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;

class DashboardRedirectController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        $user = request()->user();

        if (! $user) {
            abort(403);
        }

        return match ($user->role) {
            'faculty' => redirect()->route('faculty.reports.index'),
            'dean' => redirect()->route('dean.summaries.index'),
            'staff' => redirect()->route('dean.summaries.index'),
            'system_admin' => redirect()->route('dean.summaries.index'),
            default => redirect()->route('student.evaluations.index'),
        };
    }
}
