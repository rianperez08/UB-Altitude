@echo off
rem Launch ONE screen in Chrome kiosk mode.
rem Usage: kiosk\screen.bat <page> [x] [y] [host]
rem   kiosk\screen.bat "/"                       seat 1 in-flight screen (host)
rem   kiosk\screen.bat "/window.html?frame=0" 1920 0
rem   kiosk\screen.bat "/leaderboard.html" 0 0 http://10.0.0.5:8080   (screen on another PC)
set PAGE=%~1
if "%PAGE%"=="" set PAGE=/
set X=%2
if "%X%"=="" set X=0
set Y=%3
if "%Y%"=="" set Y=0
set HOST=%4
if "%HOST%"=="" set HOST=http://localhost:8080
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
for /f "delims=/?&= tokens=1" %%a in ("%PAGE:~1%") do set NAME=%%a
if "%NAME%"=="" set NAME=ife
start "" %CHROME% --kiosk "%HOST%%PAGE%" --window-position=%X%,%Y% --user-data-dir="%TEMP%\altitude-%NAME%-%X%" --no-first-run --disable-features=TranslateUI --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble --overscroll-history-navigation=0
