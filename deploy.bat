@echo off
setlocal
cd /d "%~dp0"

echo =====================================================================
echo 🚀 Infogenx Twilio Lead Scraper - Instant 1-Click Execution
echo =====================================================================
echo.

:: 1. Install / Verify Requirements
echo [*] Checking Python dependencies...
pip install -r requirements.txt --quiet

:: 2. Run Scraping Engine
echo.
echo [*] Executing Multi-Engine Web & Social Lead Scrapers...
python main.py --mode all

:: 3. Run Zoho CRM Sync
echo.
echo [*] Syncing fresh leads to Zoho CRM...
python main.py --mode sync-crm

echo.
echo [🎉] Execution Completed!
pause
endlocal
