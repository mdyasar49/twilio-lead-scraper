@echo off
setlocal
cd /d "%~dp0"

echo =====================================================================
echo Infogenx Twilio Lead Scraper - Instant 1-Click Execution
echo =====================================================================
echo.

REM 1. Install / Verify Requirements
echo [*] Checking Python dependencies...
pip install -r requirements.txt --quiet

REM 2. Run Scraping Engine
echo.
echo [*] Executing Multi-Engine Web and Social Lead Scrapers...
python -u main.py --mode all

REM 3. Run Zoho CRM Sync
echo.
echo [*] Syncing fresh leads to Zoho CRM...
python -u main.py --mode sync-crm

echo.
echo [Execution Completed!]
pause
endlocal
