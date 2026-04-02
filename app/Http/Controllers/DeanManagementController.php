<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DeanManagementController extends Controller
{
    public function index(): Response
    {
        $deans = User::query()
            ->where('role', 'dean')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $dean): array => [
                'id' => $dean->id,
                'name' => $dean->name,
                'email' => $dean->email,
            ])
            ->values();

        return Inertia::render('dean/dean-management/index', [
            'deans' => $deans,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        User::query()->create([
            'name' => $data['name'],
            'email' => mb_strtolower(trim($data['email'])),
            'role' => 'dean',
            'password' => $data['password'] !== null && $data['password'] !== ''
                ? $data['password']
                : 'password',
        ]);

        return back()->with('status', 'Dean account created successfully.');
    }

    public function update(Request $request, User $dean): RedirectResponse
    {
        if ($dean->role !== 'dean') {
            abort(404);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($dean->id)],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $payload = [
            'name' => $data['name'],
            'email' => mb_strtolower(trim($data['email'])),
        ];

        if (($data['password'] ?? null) !== null && $data['password'] !== '') {
            $payload['password'] = $data['password'];
        }

        $dean->update($payload);

        return back()->with('status', 'Dean account updated successfully.');
    }

    public function destroy(User $dean): RedirectResponse
    {
        if ($dean->role !== 'dean') {
            abort(404);
        }

        $dean->delete();

        return back()->with('status', 'Dean account removed successfully.');
    }
}
