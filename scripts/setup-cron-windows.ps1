# PowerShell script to set up Windows Task Scheduler for checking expired rentals
# Run this script as Administrator

$ErrorActionPreference = "Stop"

Write-Host "📅 Setting up Windows Task Scheduler for expired rentals check..." -ForegroundColor Cyan

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$checkScript = Join-Path $scriptDir "check-expired-rentals.js"

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if script exists
if (-not (Test-Path $checkScript)) {
    Write-Host "❌ Error: Script not found at $checkScript" -ForegroundColor Red
    exit 1
}

# Task name
$taskName = "CheckExpiredRentals"

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task '$taskName' already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create action (run Node.js script)
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"$checkScript`"" -WorkingDirectory $projectRoot

# Create trigger (daily at midnight)
$trigger = New-ScheduledTaskTrigger -Daily -At "00:00"

# Create settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Create principal (run as current user)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

# Register the task
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Automatically checks and updates expired property rentals daily" | Out-Null
    Write-Host "✅ Task '$taskName' created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Task Details:" -ForegroundColor Cyan
    Write-Host "   Name: $taskName"
    Write-Host "   Schedule: Daily at 12:00 AM"
    Write-Host "   Script: $checkScript"
    Write-Host ""
    Write-Host "🔍 To verify, run:" -ForegroundColor Yellow
    Write-Host "   Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "▶️  To test immediately, run:" -ForegroundColor Yellow
    Write-Host "   Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 To view task history:" -ForegroundColor Yellow
    Write-Host "   Get-WinEvent -LogName Microsoft-Windows-TaskScheduler/Operational | Where-Object {`$_.Message -like '*$taskName*'}" -ForegroundColor White
} catch {
    Write-Host "❌ Error creating task: $_" -ForegroundColor Red
    Write-Host "💡 Try running PowerShell as Administrator" -ForegroundColor Yellow
    exit 1
}

