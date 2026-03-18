<?php

namespace App\Http\Controllers;

use App\Models\EvaluationSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EvaluationSettingController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'is_open' => ['required', 'boolean'],
        ]);

        $setting = EvaluationSetting::current();
        $setting->is_open = (bool) $payload['is_open'];
        $setting->updated_by = $request->user()?->id;

        if ($setting->is_open) {
            $setting->opened_at = now();
        } else {
            $setting->closed_at = now();
        }

        $setting->save();

        return back()->with('status', $setting->is_open ? 'Evaluation has been started.' : 'Evaluation has been stopped.');
    }
}
