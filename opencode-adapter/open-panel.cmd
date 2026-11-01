@echo off
cd /d "%~dp0"
powershell -NoProfile -Command "if (Test-Path '..\data\opencode-adapter\state\panel.url') { Start-Process (Get-Content '..\data\opencode-adapter\state\panel.url' -Raw) } else { Write-Host 'Run start.cmd first' }"
