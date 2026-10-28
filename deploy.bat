@echo off
rem ============================================================
rem  Push to GitHub and trigger deployment.
rem  Double-click this file.
rem
rem  This launcher is deliberately ASCII-only: a .bat saved as
rem  UTF-8 shows Chinese text as garbage under the default code
rem  page, so all messages live in tools/deploy.mjs instead.
rem ============================================================

rem Use UTF-8 so Node's Chinese output renders correctly
chcp 65001 >nul 2>&1

rem Run from this file's own folder, wherever it was launched from
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Node.js not found.
  echo   Install it from https://nodejs.org/ then double-click this file again.
  echo.
  pause
  exit /b 1
)

rem Pass through a repo URL if one was given, e.g. by dragging onto this file
node tools\deploy.mjs %*

rem Remember Node's exit code: the pause below would otherwise overwrite it,
rem making a failed run look successful to anything checking the code.
set RC=%ERRORLEVEL%

rem Keep the window open so the result is readable after a double-click
echo.
pause
exit /b %RC%
