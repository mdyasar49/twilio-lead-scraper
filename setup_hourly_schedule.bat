@echo off
setlocal
cd /d "%~dp0"

echo =====================================================================
echo ⏰ Infogenx Twilio Lead Scraper - Windows 1-Hour Schedule Setup
echo =====================================================================

set TASK_NAME=InfogenxTwilioLeadScraperHourly
set BATCH_PATH=%~dp0run_hourly.bat

echo [*] Registering Task '%TASK_NAME%' to run every 1 hour...

schtasks /create /tn "%TASK_NAME%" /tr "\"%BATCH_PATH%\"" /sc HOURLY /mo 1 /f

if %ERRORLEVEL% equ 0 (
    echo.
    echo [✅] Success! Task '%TASK_NAME%' has been scheduled to run every 1 hour.
    echo [*] View logs anytime at: %~dp0logs\scraper.log
) else (
    echo.
    echo [!] Failed to create scheduled task. Please make sure to right-click and "Run as administrator".
)

pause
endlocal
