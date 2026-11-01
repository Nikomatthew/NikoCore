@echo off
setlocal
cd /d "%~dp0opencode-adapter"
if exist "%~dp0runtime\node\node.exe" set "PATH=%~dp0runtime\node;%PATH%"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Please run install.bat first.
  pause
  exit /b 1
)
node.exe "%~dp0opencode-adapter\launch.mjs"
set "result=%errorlevel%"
pause
exit /b %result%
