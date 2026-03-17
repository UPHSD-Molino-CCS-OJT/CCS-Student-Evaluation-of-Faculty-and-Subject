# CCS Student Evaluation of Faculty and Subject

A Laravel 12 + Inertia React web application for student evaluation of faculty and subjects.

## Tech Stack

- Backend: Laravel 12, PHP 8.2+
- Frontend: React 19, Vite 7, Tailwind CSS 4
- Auth: Laravel Fortify (custom login via student ID or email)
- Database: SQLite (default), MySQL-compatible schema
- Testing: Pest

## Core Features

- Student authentication using:
  - Student ID format: `1-2345-678` or `00-0000-000`
  - Email login also supported
- Student dashboard for assigned subject-faculty evaluations
- 25-question evaluation form with 1 to 5 rating legend
- Faculty view:
  - Evaluation results per subject and section
  - Question-level averages and overall average
- Dean view:
  - Summary per subject, faculty, and section
  - Question-level averages and respondent counts
- Role-based routing and dashboard redirection

## Roles

- `student`
- `faculty`
- `dean`
- `staff`
- `system_admin`

## Local Setup

1. Install dependencies

```bash
composer install
npm install
```

2. Create environment file and app key

```bash
cp .env.example .env
php artisan key:generate
```

3. Prepare database and seed data

```bash
php artisan migrate:fresh --seed
```

4. Generate Wayfinder files (routes/actions TS helpers)

```bash
php artisan wayfinder:generate
```

5. Start development servers

```bash
composer run dev
```

Then open `http://127.0.0.1:8000`.

## Seeded Demo Accounts

See `database/seeders/DatabaseSeeder.php` for current values. Default accounts include:

- Student:
  - Login: seeded `student_id` value
  - Password: same as seeded `student_id`
- Faculty:
  - Emails: `ada.faculty@example.com`, `alan.faculty@example.com`
  - Password: `password`
- Dean:
  - Email: `dean@example.com`
  - Password: `password`
- Staff:
  - Email: `staff@example.com`
  - Password: `password`
- System Admin:
  - Email: `sysadmin@example.com`
  - Password: `password`

## Important Notes

- The root path `/` redirects to login for guests and dashboard for authenticated users.
- If you see frontend import errors like `Cannot find module '@/routes'`, run:

```bash
php artisan wayfinder:generate
```

- If `composer run dev` fails with `vendor/autoload.php` missing, run:

```bash
composer install
```

- In non-interactive root/container environments, set `COMPOSER_ALLOW_SUPERUSER=1` when running Composer commands.
- `phpoffice/phpspreadsheet` expects PHP `gd`. Install/enable `ext-gd` for production-like environments.
- This repository includes a Composer platform override for `ext-gd` so locked dependencies can still install in constrained CI images.

## Useful Commands

```bash
# Frontend type-check
npm run types:check

# Lint JS/TS
npm run lint:check

# Run PHP tests
php artisan test

# Run a focused test file
php artisan test tests/Feature
```

## Project Structure (High-Level)

- `app/Http/Controllers/` - module controllers and settings controllers
- `app/Models/` - domain models (`ClassSection`, `Evaluation`, `Subject`, etc.)
- `database/migrations/` - schema for users, sections, assignments, evaluations
- `database/seeders/DatabaseSeeder.php` - demo data
- `resources/js/pages/` - Inertia pages for auth, student, faculty, dean
- `routes/web.php` - role-based web routes

## License

This project follows the repository's existing licensing terms.
