@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0..\runtime\node\node.exe" set "PATH=%~dp0..\runtime\node;%PATH%"
where node.exe >nul 2>nul
if errorlevel 1 goto missing_node
node.exe "%~dp0launch.mjs"
echo.
echo NikoLink has stopped. Any startup error is shown above.
pause
exit /b
:missing_node
echo Node.js was not found. Install Node.js or reopen your terminal.
pause
exit /b 1
