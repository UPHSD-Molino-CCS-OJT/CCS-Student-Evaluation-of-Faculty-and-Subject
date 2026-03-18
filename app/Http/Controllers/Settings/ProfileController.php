<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
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
            'esignImageUrl' => $canManageEsign ? $this->resolveUserEsignDataUri($user) : null,
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

        if ($removeEsign && ($user->esign_image_path !== null || $user->esign_image_data_uri !== null)) {
            if ($user->esign_image_path !== null) {
                Storage::disk('public')->delete($user->esign_image_path);
            }

            $user->esign_image_path = null;
            $user->esign_image_data_uri = null;
            $user->esign_image_hash = null;
            $user->save();

            return back()->with('status', 'E-sign removed successfully.');
        }

        if ($request->hasFile('esign_image')) {
            if ($user->esign_image_path !== null) {
                Storage::disk('public')->delete($user->esign_image_path);
            }

            $file = $request->file('esign_image');
            $hash = $this->uploadedFileHash($file);

            if ($hash !== null) {
                $duplicateExists = User::query()
                    ->where('id', '!=', $user->id)
                    ->where('role', (string) $user->role)
                    ->where('esign_image_hash', $hash)
                    ->exists();

                if ($duplicateExists) {
                    return back()->withErrors([
                        'esign_image' => 'This e-sign is already used by another '.(string) $user->role.' account. Please upload a unique signature image.',
                    ]);
                }
            }

            $path = $file->store('esignatures/'.$user->id, 'public');
            $user->esign_image_path = $path;
            $user->esign_image_data_uri = $this->uploadedFileToDataUri($file);
            $user->esign_image_hash = $hash;
            $user->save();

            return back()->with('status', 'E-sign uploaded successfully.');
        }

        return back()->withErrors([
            'esign_image' => 'Please select an image to upload.',
        ]);
    }

    private function resolveUserEsignDataUri(object $user): ?string
    {
        if (is_string($user->esign_image_data_uri ?? null) && $user->esign_image_data_uri !== '') {
            return $user->esign_image_data_uri;
        }

        if (! is_string($user->esign_image_path ?? null) || $user->esign_image_path === '') {
            return null;
        }

        if (! Storage::disk('public')->exists($user->esign_image_path)) {
            return null;
        }

        $bytes = Storage::disk('public')->get($user->esign_image_path);

        if ($bytes === '') {
            return null;
        }

        $mimeType = Storage::disk('public')->mimeType($user->esign_image_path) ?: 'image/png';

        return 'data:'.$mimeType.';base64,'.base64_encode($bytes);
    }

    private function uploadedFileToDataUri(UploadedFile $file): ?string
    {
        $path = $file->getRealPath();

        if ($path === false) {
            return null;
        }

        $bytes = @file_get_contents($path);

        if (! is_string($bytes) || $bytes === '') {
            return null;
        }

        $mimeType = $file->getMimeType() ?: 'image/png';

        return 'data:'.$mimeType.';base64,'.base64_encode($bytes);
    }

    private function uploadedFileHash(UploadedFile $file): ?string
    {
        $path = $file->getRealPath();

        if ($path === false) {
            return null;
        }

        $hash = @hash_file('sha256', $path);

        return is_string($hash) ? $hash : null;
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
