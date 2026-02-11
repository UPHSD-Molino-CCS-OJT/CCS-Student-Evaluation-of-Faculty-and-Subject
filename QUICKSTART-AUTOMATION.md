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

**Single Student (with browser visible):**
```powershell
npm run test:evaluate
```

**Single Student (headless mode):**
```powershell
npm run test:evaluate:headless
```

**All Students at Once:**
```powershell
.\test-all-students.ps1
```

**Custom Student:**
```powershell
npm run test:evaluate -- --student 21-1234-568
```

## What It Does

✅ Automatically logs in as a student  
✅ Finds all unevaluated subjects  
✅ Fills evaluation forms with random ratings  
✅ Submits evaluations  
✅ Respects all privacy protections (SHA-512 tokens, IP anonymization, timestamp rounding)

## Output Example

```
🚀 Starting browser automation...
📝 Logging in as student: 21-1234-567
✓ Successfully logged in
📚 Fetching unevaluated subjects...
✓ Found 2 unevaluated subjects
📊 Evaluating: Data Structures and Algorithms
  ✓ Evaluation submitted successfully!
============================================================
✓ Successfully evaluated: 2 subjects
============================================================
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
