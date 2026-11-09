# Applies the Snapshot v2 database migrations to the PRODUCTION database.
# Run it yourself, from the repo folder, in PowerShell:
#     powershell -ExecutionPolicy Bypass -File scripts\migrate-production.ps1
#
# You'll be asked to paste the production database connection string. Get it from your
# database provider's dashboard (Vercel → Storage → your database → ".env.local" / "Connect",
# or Neon/Supabase → Connection string). Use the DIRECT (non-pooled) connection if offered.
# Vercel marks it "Sensitive", so it can't be downloaded automatically.
#
# Safe by design:
#  - What you paste is hidden, never printed or saved, and cleared at the end.
#  - It first checks that production matches the schema the live app uses (commit f85df8a).
#    If anything differs, it stops and changes nothing.
#  - The migrations only ADD columns/values, so the current live site keeps working.
# Take a backup/snapshot in your database provider's dashboard first if you can.

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$liveSchema = Join-Path $env:TEMP 'nexterlaw-schema-live.prisma'

try {
    Write-Host '1/4 Paste the PRODUCTION database connection string (input is hidden), then press Enter:' -ForegroundColor Cyan
    $secure = Read-Host -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $url = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim().Trim('"') }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    if ($url -notmatch '^postgres(ql)?://') { throw 'That does not look like a Postgres connection string (it should start with postgres:// or postgresql://). Nothing was changed.' }
    if ($url -match 'localhost|127\.0\.0\.1') { throw 'That is a local database, not production. Nothing was changed.' }
    $env:DATABASE_URL = $url
    Remove-Variable url

    Write-Host '2/4 Checking production matches the live schema (f85df8a)...' -ForegroundColor Cyan
    # WriteAllText writes UTF-8 without a BOM (Out-File in PowerShell 5 adds one, which Prisma rejects).
    [IO.File]::WriteAllText($liveSchema, (git show f85df8a:prisma/schema.prisma | Out-String))
    npx prisma migrate diff --from-config-datasource --to-schema $liveSchema --exit-code | Out-Null
    if ($LASTEXITCODE -eq 2) { throw 'Production differs from the live schema. Nothing was changed. Send this message to Claude.' }
    if ($LASTEXITCODE -ne 0) { throw 'Could not connect or compare schemas (check the connection string). Nothing was changed.' }
    Write-Host '    Match. Safe to continue.' -ForegroundColor Green

    Write-Host '3/4 Recording the starting point (0_init) and applying the new migrations...' -ForegroundColor Cyan
    # Marks 0_init as already applied (it describes what is already there). If it was
    # recorded on an earlier run, Prisma just says so and we carry on.
    npx prisma migrate resolve --applied 0_init
    if ($LASTEXITCODE -ne 0) { Write-Host '    0_init was already recorded; continuing.' -ForegroundColor Yellow }
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw 'migrate deploy failed. Send the output above to Claude.' }

    Write-Host '4/4 Final status:' -ForegroundColor Cyan
    npx prisma migrate status
    Write-Host 'Done. Tell Claude it worked.' -ForegroundColor Green
}
finally {
    if (Test-Path $liveSchema) { Remove-Item $liveSchema -Force }
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    $tmp = Join-Path $env:TEMP 'nexterlaw-prod.env'
    if (Test-Path $tmp) { Remove-Item $tmp -Force }  # left over from the first version of this script
}
