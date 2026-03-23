# Run from Task Scheduler daily: Program = powershell.exe
# Arguments = -NoProfile -ExecutionPolicy Bypass -File "C:\path\to\Bigger Season\scripts\run-recap.ps1"
# Start in: (leave empty) — script cd's to repo root.

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
Set-Location $Root

$logDir = Join-Path $Root 'recap\output'
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$log = Join-Path $logDir 'last-run.log'
"=== $(Get-Date -Format o) ===" | Out-File -FilePath $log -Encoding utf8
try {
  npm run recap 2>&1 | Tee-Object -FilePath $log -Append
  exit $LASTEXITCODE
} catch {
  $_ | Out-File -FilePath $log -Append -Encoding utf8
  exit 1
}
