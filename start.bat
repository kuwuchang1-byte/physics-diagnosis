@echo off
chcp 65001 >nul
title Physics Diagnosis

set "DIR=%~dp0backend\.."
for /f "delims=" %%i in ('cd /d "%DIR%" ^&^& cd') do set "DIR=%%i"

echo [1/3] Starting backend...
start "Backend" /d "%DIR%\backend" cmd /k "node src\index.js"
ping -n 5 127.0.0.1 >nul

echo [2/3] Starting frontend...
start "Frontend" /d "%DIR%\frontend" cmd /k "npx vite --host"
ping -n 6 127.0.0.1 >nul

echo [3/3] Opening browser...
start "" "http://localhost:5173"

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do set "IP=%%a"
set IP=%IP: =%

echo.
echo ========================================
echo   Done!
echo.
echo   Local:    http://localhost:5173
echo   WiFi:     http://%IP%:5173
echo ========================================
echo.
echo   Close this window when ready.
echo.
pause
