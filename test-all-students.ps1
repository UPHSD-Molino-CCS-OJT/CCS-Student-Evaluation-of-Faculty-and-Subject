# Test All Students (Batch Automation)
# This script runs automated evaluations for all students in the database
# Students are fetched dynamically from the database via API

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   BATCH EVALUATION AUTOMATION                             ║" -ForegroundColor Cyan
Write-Host "║   Testing all students from database                      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Parse command line arguments
$headless = $false
$limit = $null
$baseUrl = "http://localhost:3000"

for ($i = 0; $i -lt $args.Count; $i++) {
    if ($args[$i] -eq "--headless") {
        $headless = $true
    }
    elseif ($args[$i] -eq "--limit" -and $i + 1 -lt $args.Count) {
        $limit = $args[$i + 1]
        $i++
    }
    elseif ($args[$i] -eq "--url" -and $i + 1 -lt $args.Count) {
        $baseUrl = $args[$i + 1]
        $i++
    }
}

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Base URL: $baseUrl"
Write-Host "  Headless Mode: $headless"
if ($limit) {
    Write-Host "  Student Limit: $limit"
}
Write-Host ""

# Build the command
$command = "npm run test:evaluate --"
if ($headless) {
    $command += " --headless"
}
if ($limit) {
    $command += " --limit $limit"
}
if ($baseUrl -ne "http://localhost:3000") {
    $command += " --url $baseUrl"
}

Write-Host "🚀 Running command: $command`n" -ForegroundColor Cyan

try {
    # Run the test automation command
    Invoke-Expression $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ All automation tests completed successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n⚠️  Some automation tests failed!" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "`n❌ Error running automation: $_" -ForegroundColor Red
    Write-Host "`nPlease ensure:" -ForegroundColor Yellow
    Write-Host "  1. The server is running (npm start)" -ForegroundColor Yellow
    Write-Host "  2. The database has been set up (npm run setup-db)" -ForegroundColor Yellow
    Write-Host "  3. Dependencies are installed (npm install)" -ForegroundColor Yellow
    exit 1
}
