@echo off
setlocal
cd /d "%~dp0"

if not exist logs mkdir logs

echo ======================================================== >> logs\scraper.log
echo [%date% %time%] Starting 1-Hour Scheduled Lead Scraper Cycle >> logs\scraper.log
echo ======================================================== >> logs\scraper.log

:: Run All Scrapers (Web & Social)
python main.py --mode all >> logs\scraper.log 2>&1

:: Run Zoho CRM Sync
python main.py --mode sync-crm >> logs\scraper.log 2>&1

echo [%date% %time%] Cycle completed successfully. >> logs\scraper.log
endlocal
