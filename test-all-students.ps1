# Test All Sample Students
# This script runs automated evaluations for all sample students

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   BATCH EVALUATION AUTOMATION                             ║" -ForegroundColor Cyan
Write-Host "║   Testing all sample students                             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$students = @(
    @{Number='21-1234-567'; Name='Juan Dela Cruz'},
    @{Number='21-1234-568'; Name='Maria Garcia'},
    @{Number='21-5678-901'; Name='Pedro Santos'}
)

$successCount = 0
$failCount = 0

foreach ($student in $students) {
    Write-Host "`n[$($students.IndexOf($student) + 1)/$($students.Count)] Testing student: $($student.Name) ($($student.Number))" -ForegroundColor Yellow
    Write-Host "═" * 60 -ForegroundColor Gray
    
    try {
        npm run test:evaluate -- --student $student.Number --headless
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Successfully completed evaluations for $($student.Name)`n" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "✗ Failed to complete evaluations for $($student.Name)`n" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "✗ Error testing $($student.Name): $_`n" -ForegroundColor Red
        $failCount++
    }
    
    # Small delay between students
    Start-Sleep -Seconds 2
}

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   BATCH AUTOMATION COMPLETE                               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "✓ Successful: $successCount students" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "✗ Failed: $failCount students" -ForegroundColor Red
}
Write-Host "`n✅ All automation tests completed!`n" -ForegroundColor Green
