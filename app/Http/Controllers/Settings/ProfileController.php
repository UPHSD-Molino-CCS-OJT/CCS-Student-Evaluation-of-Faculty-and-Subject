<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $canManageEsign = in_array((string) $user->role, ['faculty', 'dean'], true);

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'canManageEsign' => $canManageEsign,
            'esignImageUrl' => $canManageEsign && $user->esign_image_path !== null
                ? Storage::disk('public')->url($user->esign_image_path)
                : null,
        ]);
    }

    /**
     * Upload or remove e-sign image for faculty/dean.
     */
    public function updateEsign(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! in_array((string) $user->role, ['faculty', 'dean'], true)) {
            abort(403);
        }

        $payload = $request->validate([
            'esign_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'remove_esign' => ['nullable', 'boolean'],
        ]);

        $removeEsign = (bool) ($payload['remove_esign'] ?? false);

        if ($removeEsign && $user->esign_image_path !== null) {
            Storage::disk('public')->delete($user->esign_image_path);
            $user->esign_image_path = null;
            $user->save();

            return back()->with('status', 'E-sign removed successfully.');
        }

        if ($request->hasFile('esign_image')) {
            if ($user->esign_image_path !== null) {
                Storage::disk('public')->delete($user->esign_image_path);
            }

            $path = $request->file('esign_image')->store('esignatures/'.$user->id, 'public');
            $user->esign_image_path = $path;
            $user->save();

            return back()->with('status', 'E-sign uploaded successfully.');
        }

        return back()->withErrors([
            'esign_image' => 'Please select an image to upload.',
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
