# Automated Student Evaluation Testing Guide

## Overview

This guide explains how to use the automated testing script to simulate students evaluating teachers without manual intervention. This is useful for:

- **Testing** the evaluation system with realistic data
- **Demo purposes** to show the system with populated evaluations
- **Load testing** to see how the system handles multiple evaluations
- **Development** to quickly populate the database with sample data

## Prerequisites

1. **Server must be running**
   ```powershell
   npm run dev
   ```

2. **Client must be running** (in another terminal)
   ```powershell
   npm run client
   ```

3. **Database must be initialized** with sample students
   ```powershell
   npm run setup-db
   ```

## Quick Start

### Basic Usage

Run the automation with default settings (student `21-1234-567`):

```powershell
npm run test:evaluate
```

This will:
1. Open a Chrome browser window
2. Login as the default student (`21-1234-567`)
3. Navigate to the subjects page
4. Find all unevaluated subjects
5. Fill out and submit evaluations for each subject with random ratings
6. Display a summary of completed evaluations

### Headless Mode (No Browser Window)

For faster testing without seeing the browser:

```powershell
npm run test:evaluate:headless
```

## Advanced Usage

### Test with Different Students

```powershell
npm run test:evaluate -- --student 21-1234-568
```

### Custom Server URL

If your server is running on a different port:

```powershell
npm run test:evaluate -- --url http://localhost:5000
```

### Combined Options

```powershell
npm run test:evaluate -- --student 21-5678-901 --url http://localhost:3000 --headless
```

### Slow Motion (For Debugging)

Watch the automation in slow motion (500ms delay between actions):

```powershell
npm run test:evaluate -- --slow 500
```

## Available Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--student <number>` | Student number to login with | `--student 21-1234-567` |
| `--url <url>` | Base URL of the application | `--url http://localhost:3000` |
| `--headless` | Run without showing browser window | `--headless` |
| `--slow <milliseconds>` | Slow motion delay between actions | `--slow 500` |

## Default Test Students

From the database setup, these students are available:

1. **21-1234-567** - Juan Dela Cruz (BSCS-DS, 3rd Year)
2. **21-1234-568** - Maria Garcia (BSCS-DS, 3rd Year)
3. **21-5678-901** - Pedro Santos (BSIT-GD, 2nd Year)

## What the Script Does

### 1. Login Process
- Navigates to `/student/login`
- Enters the student number
- Submits the login form
- Waits for redirect to subjects page

### 2. Finding Subjects
- Scans the subjects page for unevaluated courses
- Extracts enrollment IDs, course names, and teacher names
- Displays a list of subjects to evaluate

### 3. Filling Evaluations
For each unevaluated subject:
- Navigates to the evaluation form
- Fills all 25 rating questions with random ratings (biased towards higher scores)
- Optionally adds a random comment
- Submits the evaluation
- Confirms the submission in the dialog

### 4. Rating Distribution
The script generates realistic ratings with the following distribution:
- **5 (Outstanding)**: 40% probability
- **4 (High Satisfactory)**: 30% probability
- **3 (Satisfactory)**: 20% probability
- **2 (Less Satisfactory)**: 8% probability
- **1 (Poor)**: 2% probability

### 5. Comments
Random comments are added to ~37.5% of evaluations:
- "Great teacher! Very knowledgeable and helpful."
- "Effective teaching methods and clear explanations."
- "Engaging lectures and fair grading."
- "Approachable and always willing to help students."
- "Well-organized class and good use of examples."

## Example Output

```
╔═══════════════════════════════════════════════════════════╗
║   STUDENT EVALUATION AUTOMATION SCRIPT                   ║
║   Automated Testing for CCS Faculty Evaluation System    ║
╚═══════════════════════════════════════════════════════════╝

Configuration:
  Student Number: 21-1234-567
  Base URL: http://localhost:3000
  Headless: false
  Slow Motion: 100ms

🚀 Starting browser automation...

📝 Logging in as student: 21-1234-567
✓ Successfully logged in

📚 Fetching unevaluated subjects...
✓ Found 2 unevaluated subjects

🎯 Starting evaluation of 2 subjects...

📊 Evaluating: Data Structures and Algorithms
   Teacher: Prof. Juan Dela Cruz
   Enrollment ID: 65a1c2d3e4f5g6h7i8j9k0l1
  📝 Filling evaluation form...
  ✓ Found 25 rating questions
  ✓ Added comment: "Great teacher! Very knowledgeable and helpful."
  ✓ Form filled successfully
  ⚠️  Confirmation dialog: Are you sure you want to submit this evaluation?
  ✓ Evaluation submitted successfully!

📊 Evaluating: Database Management Systems
   Teacher: Prof. Jose Garcia
   Enrollment ID: 65a1c2d3e4f5g6h7i8j9k0l2
  📝 Filling evaluation form...
  ✓ Found 25 rating questions
  ✓ Form filled successfully
  ⚠️  Confirmation dialog: Are you sure you want to submit this evaluation?
  ✓ Evaluation submitted successfully!

============================================================
EVALUATION AUTOMATION COMPLETE
============================================================
✓ Successfully evaluated: 2 subjects
============================================================

🧹 Cleaning up...
✓ Browser closed

✅ Automation completed successfully!
```

## Testing Multiple Students

To populate the database with evaluations from all sample students:

```powershell
# Student 1
npm run test:evaluate -- --student 21-1234-567 --headless

# Student 2
npm run test:evaluate -- --student 21-1234-568 --headless

# Student 3
npm run test:evaluate -- --student 21-5678-901 --headless
```

Or create a batch script:

```powershell
# test-all-students.ps1
$students = @('21-1234-567', '21-1234-568', '21-5678-901')

foreach ($student in $students) {
    Write-Host "`nTesting student: $student" -ForegroundColor Cyan
    npm run test:evaluate -- --student $student --headless
    Start-Sleep -Seconds 2
}

Write-Host "`n✅ All students evaluated!" -ForegroundColor Green
```

## Troubleshooting

### Browser doesn't open
**Solution**: Install Playwright browsers:
```powershell
npx playwright install chromium
```

### Login fails
**Possible causes**:
- Server not running → Start with `npm run dev`
- Client not running → Start with `npm run client`
- Student doesn't exist → Run `npm run setup-db` first

### "Cannot find module 'playwright'"
**Solution**: Install dependencies:
```powershell
npm install
```

### Evaluations already submitted
**Expected behavior**: The script will show "No subjects to evaluate" if all subjects are already evaluated.

**To reset**: Delete and recreate the database:
```powershell
# Delete all data and start fresh
npm run setup-db
```

### Slow performance
**Solutions**:
- Use `--headless` mode (faster)
- Reduce `--slow` value or omit it (default 100ms)
- Check server performance

## Privacy & Security Notes

The automation script:
- ✅ Uses the **same privacy protections** as manual submissions
- ✅ Generates **anonymous tokens** (SHA-512)
- ✅ Applies **submission delays** (2-8 seconds)
- ✅ Anonymizes **IP addresses**
- ✅ Rounds **timestamps** to nearest hour
- ✅ Creates **realistic evaluation data**

All privacy layers remain active during automated testing!

## Integration with CI/CD

For continuous integration:

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Install Playwright
        run: npx playwright install chromium
      
      - name: Start server
        run: npm run dev &
        
      - name: Start client
        run: npm run client &
        
      - name: Wait for services
        run: sleep 10
        
      - name: Run automated tests
        run: npm run test:evaluate:headless
```

## Next Steps

After running the automation:
1. Check the **Admin Dashboard** to see evaluation statistics
2. View **Teacher Reports** to see aggregated ratings
3. Run the **Privacy Audit** to verify data protection
4. Test the **Student Portal** to confirm evaluations are marked as completed

## Support

For issues or questions:
- Check the [Installation Guide](INSTALLATION-GUIDE.md)
- Review the [Features Guide](FEATURES-GUIDE.md)
- Run privacy audit: Admin Dashboard → Privacy Audit
