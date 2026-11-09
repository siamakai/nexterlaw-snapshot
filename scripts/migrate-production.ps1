# Applies the Snapshot v2 database migrations to the PRODUCTION database.
# Run it yourself, from the repo folder, in PowerShell:
#     powershell -ExecutionPolicy Bypass -File scripts\migrate-production.ps1
#
# Safe by design:
#  - The database password is fetched into a temp file and deleted at the end; it is never printed.
#  - It first checks that production matches the schema the live app uses (commit f85df8a).
#    If anything differs, it stops and changes nothing.
#  - The migrations only ADD columns/values, so the current live site keeps working.
# Take a backup/snapshot in your database provider's dashboard first if you can.

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$envFile = Join-Path $env:TEMP 'nexterlaw-prod.env'
$liveSchema = Join-Path $env:TEMP 'nexterlaw-schema-live.prisma'

try {
    Write-Host '1/5 Linking this folder to the Vercel project...' -ForegroundColor Cyan
    npx vercel link --yes --project nexterlaw-snapshot --scope nexter-ais-projects | Out-Null

    Write-Host '2/5 Fetching production settings (kept private)...' -ForegroundColor Cyan
    npx vercel env pull $envFile --environment=production --yes | Out-Null
    $line = Get-Content $envFile | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1
    if (-not $line) { throw 'DATABASE_URL not found in production settings.' }
    $env:DATABASE_URL = $line.Substring('DATABASE_URL='.Length).Trim('"')

    Write-Host '3/5 Checking production matches the live schema (f85df8a)...' -ForegroundColor Cyan
    # WriteAllText writes UTF-8 without a BOM (Out-File in PowerShell 5 adds one, which Prisma rejects).
    [IO.File]::WriteAllText($liveSchema, (git show f85df8a:prisma/schema.prisma | Out-String))
    npx prisma migrate diff --from-config-datasource --to-schema $liveSchema --exit-code | Out-Null
    if ($LASTEXITCODE -eq 2) { throw 'Production differs from the live schema. Nothing was changed. Send this message to Claude.' }
    if ($LASTEXITCODE -ne 0) { throw 'Could not compare schemas. Nothing was changed.' }
    Write-Host '    Match. Safe to continue.' -ForegroundColor Green

    Write-Host '4/5 Recording the starting point (0_init) and applying the new migrations...' -ForegroundColor Cyan
    # Marks 0_init as already applied (it describes what is already there). If it was
    # recorded on an earlier run, Prisma just says so and we carry on.
    npx prisma migrate resolve --applied 0_init
    if ($LASTEXITCODE -ne 0) { Write-Host '    0_init was already recorded; continuing.' -ForegroundColor Yellow }
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw 'migrate deploy failed. Send the output above to Claude.' }

    Write-Host '5/5 Final status:' -ForegroundColor Cyan
    npx prisma migrate status
    Write-Host 'Done. Tell Claude it worked.' -ForegroundColor Green
}
finally {
    if (Test-Path $envFile) { Remove-Item $envFile -Force }
    if (Test-Path $liveSchema) { Remove-Item $liveSchema -Force }
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
