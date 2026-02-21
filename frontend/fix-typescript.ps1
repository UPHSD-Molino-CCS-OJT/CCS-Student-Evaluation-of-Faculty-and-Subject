# PowerShell script to fix common TypeScript errors in React components

Write-Host "Fixing TypeScript errors in React components..." -ForegroundColor Green

# Fix colSpan and rows attributes (should be numbers, not strings)
Write-Host "Fixing HTML attribute types..." -ForegroundColor Yellow

# AdminEvaluations.tsx - colSpan
(Get-Content "src/pages/admin/AdminEvaluations.tsx") -replace 'colSpan="6"', 'colSpan={6}' | Set-Content "src/pages/admin/AdminEvaluations.tsx"

# StudentEvaluate.tsx - rows
(Get-Content "src/pages/student/StudentEvaluate.tsx") -replace 'rows="5"', 'rows={5}' | Set-Content "src/pages/student/StudentEvaluate.tsx"

Write-Host "Fixed HTML attributes" -ForegroundColor Green

Write-Host "Script completed!" -ForegroundColor Green
Write-Host "Run 'npx tsc --noEmit' to check for remaining errors" -ForegroundColor Cyan
