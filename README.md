# CCS Student Evaluation of Faculty and Subject

A Laravel 12 + Inertia React web application for student evaluation of faculty and subjects.

Last updated: 2026-03-19

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
  - Question-level averages, overall average, and e-sign submission
- Dean view:
  - Summary per subject, faculty, and section with signoff tracking
  - Question-level averages, respondent counts, and template-based exports
  - Export actions: Preview, Download DOCX, Download PDF
- Role-based routing and dashboard redirection
- E-sign management:
  - Upload/update/remove e-sign in Settings (`PNG/JPG/JPEG/WebP`, up to 2 MB)
  - E-sign is stored and reused for report signoff snapshots

## Latest Updates

- Dean preview now uses short-lived signed DOCX source URLs and Office Web Viewer (`op/embed`) when HTTPS is available.
- PDF download is available through Office Viewer (`op/view`) with local fallback to server-rendered PDF.
- Export format resolver now supports `docx` and `pdf` (default: `docx`).
- Template workflow supports both DOCX import and manual header/footer save from the preview editor.
- Signature persistence is DB-backed (`users.esign_image_data_uri` and signoff snapshot data URI columns), and signatures are rendered in report signoff tables.
- Required PHP extensions are declared in `composer.json`: `ext-gd` and `ext-zip`.

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

Optional one-command bootstrap:

```bash
composer run setup
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

4. Link storage for uploaded assets (e-sign files and other public uploads)

```bash
php artisan storage:link
```

5. Generate Wayfinder files (routes/actions TS helpers)

```bash
php artisan wayfinder:generate
```

6. Start development servers

```bash
composer run dev
```

Then open `http://127.0.0.1:8000`.

## Railway Deployment

Use two Railway services for production:

- `web` service (serves HTTP traffic)
- `worker` service (processes queued jobs)

### 1) Create the `web` service

- Source: this repository
- Build command:

```bash
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-interaction --prefer-dist --optimize-autoloader --no-scripts && (rm -rf node_modules/.cache || true) && npm install --include=dev --no-audit --no-fund && npm run build
```

- Start command:

```bash
php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
```

### 2) Add required environment variables

Set these in Railway service variables:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_KEY` (generate once using `php artisan key:generate --show`)
- `APP_URL` (your Railway public URL, must start with `https://`)
- `ASSET_URL` (optional; set to the same `https://` public URL if you still see mixed-content assets)
- `DB_CONNECTION=mysql`
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` (from Railway MySQL)
- `SESSION_DRIVER=cookie` (recommended on Railway to avoid DB-backed session disconnect issues)
- `CACHE_STORE=database`
- `QUEUE_CONNECTION=database` (or `sync` if you do not run a worker service)
- `SESSION_SECURE_COOKIE=true`
- `LOG_CHANNEL=stack`

### 3) Create the `worker` service (recommended)

- Same repo and build command as `web`
- Start command:

```bash
php artisan queue:work --tries=1 --timeout=0
```

### 4) First deploy notes

- `npm run build` generates Wayfinder route files before Vite build, so deploys do not depend on generated files being committed.
- If Railway build fails with `EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'`, use `npm install` (not `npm ci`) in the build command.
- If deployment cache is stale, trigger a clear rebuild in Railway and redeploy.
- If you see `Vite manifest not found at /app/public/build/manifest.json`, your deploy skipped frontend build. This repo includes `railway.toml` to force `npm run build` during Railway builds.
- Railway config-as-code files are `railway.toml` or `railway.json` (not `railpack.toml`).
- DOCX template import and DOCX media cloning require PHP `zip` (`ZipArchive`) at runtime.
- DOCX signature image conversion and spreadsheet drawing paths require PHP `gd`.

## Seeded Demo Accounts

See `database/seeders/DatabaseSeeder.php` for current values. Default accounts include:

- Student:
  - Student ID: `1-2345-678`
  - Email: `cantara.michaelangelo@gmail.com`
  - Password: same as student ID (`1-2345-678`)
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
- Dean export preview/docx-source endpoints are signed routes and expire automatically.
- Dean summary export supports only `docx` and `pdf` formats (default: `docx`).
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
- `phpoffice/phpspreadsheet` also expects PHP `zip` for full XLSX support.
- DOCX header/footer template import also requires PHP `zip` (`ZipArchive`) at runtime. Without it, template import fails.
- On Railpack/Nixpacks (Railway PHP runtime), declare required extensions in `composer.json` (`ext-gd`, `ext-zip`) so they are provisioned during build.
- For build daemons, use:

```bash
COMPOSER_ALLOW_SUPERUSER=1 composer install --optimize-autoloader --no-scripts --no-interaction
```

- If you encounter `SQLSTATE[HY000] [2006] MySQL server has gone away` on session reads (for example during logout), switch to `SESSION_DRIVER=cookie` and redeploy.

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
