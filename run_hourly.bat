@echo off
setlocal
cd /d "%~dp0"

set "PYTHONUNBUFFERED=1"
if not exist "logs" mkdir "logs"

echo ========================================================>> "logs\scraper.log"
echo Starting 1-Hour Scheduled Lead Scraper Cycle>> "logs\scraper.log"
echo ========================================================>> "logs\scraper.log"

REM Run All Scrapers (Web and Social)
python -u main.py --mode all >> "logs\scraper.log" 2>&1

REM Run Zoho CRM Sync
python -u main.py --mode sync-crm >> "logs\scraper.log" 2>&1

echo Cycle completed successfully.>> "logs\scraper.log"
endlocal
