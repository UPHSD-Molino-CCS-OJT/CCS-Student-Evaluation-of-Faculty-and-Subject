# Quick Start: Automated Student Evaluation Testing

## 1. Install Dependencies (One-time setup)

```powershell
# Install Playwright for browser automation
npm install --save-dev playwright @playwright/test

# Install Playwright browsers (Chromium)
npx playwright install chromium
```

## 2. Ensure Server and Client are Running

**Terminal 1 - Server:**
```powershell
npm run dev
```

**Terminal 2 - Client:**
```powershell
npm run client
```

## 3. Run Automated Testing

**All Students (Default - Browser Visible):**
```powershell
npm run test:evaluate
```
This will automatically test all 3 students from the database setup with browser visible.

**All Students (Headless Mode - Faster):**
```powershell
npm run test:evaluate -- --headless
```

**Single Student (with browser visible):**
```powershell
npm run test:evaluate -- --student 21-1234-567
```

**Single Student (headless mode):**
```powershell
npm run test:evaluate -- --student 21-1234-567 --headless
```

**Batch Script (Alternative):**
```powershell
.\test-all-students.ps1
```

**Custom Student:**
```powershell
npm run test:evaluate -- --student 21-1234-568
```

## What It Does

✅ **Tests all students by default** - Automatically runs evaluations for all 3 sample students  
✅ **Browser visible** - Watch the automation in action (use `--headless` for faster testing)  
✅ Automatically logs in as each student  
✅ Finds all unevaluated subjects  
✅ Fills evaluation forms with random ratings  
✅ Submits evaluations  
✅ Respects all privacy protections (SHA-512 tokens, IP anonymization, timestamp rounding)  
✅ Shows detailed progress for each student

## Output Example

```
╔═══════════════════════════════════════════════════════════╗
║   STUDENT EVALUATION AUTOMATION SCRIPT                   ║
║   Automated Testing for CCS Faculty Evaluation System    ║
╚═══════════════════════════════════════════════════════════╝

Configuration:
  Testing Mode: ALL STUDENTS (3 students)
  Base URL: http://localhost:3000 (default)
  Headless: false
  Slow Motion: 100ms

Students to test:
  1. Juan Dela Cruz (21-1234-567)
  2. Maria Garcia (21-1234-568)
  3. Pedro Santos (21-5678-901)

============================================================
[1/3] Testing: Juan Dela Cruz (21-1234-567)
============================================================

🚀 Starting browser automation...
📝 Logging in as student: 21-1234-567
✓ Successfully logged in
📚 Fetching unevaluated subjects...
✓ Found 2 unevaluated subjects
📊 Evaluating: Data Structures and Algorithms
  ✓ Evaluation submitted successfully!
✓ Successfully completed evaluations for Juan Dela Cruz

============================================================
[2/3] Testing: Maria Garcia (21-1234-568)
============================================================
...

============================================================
BATCH AUTOMATION COMPLETE
============================================================
✓ Successful: 3 students
============================================================

✅ All automation tests completed successfully!
```

## Troubleshooting

**"Cannot find module 'playwright'"**
```powershell
npm install --save-dev playwright @playwright/test
npx playwright install chromium
```

**Login fails**
- Make sure server is running: `npm run dev`
- Make sure client is running: `npm run client`
- Make sure database has students: `npm run setup-db`

**No subjects to evaluate**
- Already evaluated! Reset database: `npm run setup-db`

## Available Students

- `21-1234-567` - Juan Dela Cruz (BSCS-DS)
- `21-1234-568` - Maria Garcia (BSCS-DS)
- `21-5678-901` - Pedro Santos (BSIT-GD)

For full documentation, see [AUTOMATED-TESTING-GUIDE.md](AUTOMATED-TESTING-GUIDE.md)
