@echo off
rem The Altitude Test - launch every screen in Chrome kiosk mode on ONE Windows PC.
rem 1) start the server first:   npm start   (in the repo folder)
rem 2) run:  kiosk\screens.bat [http://localhost:8080]
rem Each window gets its own Chrome profile so --window-position lands it on its own monitor;
rem the screens stay in sync through the server (SSE relay), not through the browser profile.
rem Adjust the x,y offsets below to your monitor arrangement (Windows > Display settings).

set HOST=%1
if "%HOST%"=="" set HOST=http://localhost:8080
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set FLAGS=--no-first-run --disable-features=TranslateUI --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble --overscroll-history-navigation=0

rem Seat 1 in-flight screen (landscape, host) on monitor 1
start "" %CHROME% --kiosk "%HOST%/?preview=0" --window-position=0,0 --user-data-dir="%TEMP%\altitude-ife1" %FLAGS%
timeout /t 2 >nul
rem Seat 1 plane window (portrait) on monitor 2 - frame=0 shows just the view behind the physical window
start "" %CHROME% --kiosk "%HOST%/window.html?seat=1&frame=0" --window-position=1920,0 --user-data-dir="%TEMP%\altitude-win1" %FLAGS%
timeout /t 2 >nul
rem Seat 2 (head-to-head) screens - delete these two lines for a single-seat build
start "" %CHROME% --kiosk "%HOST%/?seat=2&preview=0" --window-position=3000,0 --user-data-dir="%TEMP%\altitude-ife2" %FLAGS%
timeout /t 2 >nul
start "" %CHROME% --kiosk "%HOST%/window.html?seat=2&frame=0" --window-position=4920,0 --user-data-dir="%TEMP%\altitude-win2" %FLAGS%
timeout /t 2 >nul
rem Leaderboard on the booth screen
start "" %CHROME% --kiosk "%HOST%/leaderboard.html" --window-position=6000,0 --user-data-dir="%TEMP%\altitude-lb" %FLAGS%
