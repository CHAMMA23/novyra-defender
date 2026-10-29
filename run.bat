@echo off
title Novyra Defender - Anti-Scam Security Bot
color 0c
echo ========================================================
echo         NOVYRA DEFENDER - ANTI-SCAM TRAP BOT
echo ========================================================
echo.

IF NOT EXIST "node_modules" (
    echo [INFO] Installing required dependencies...
    npm install
)

echo [INFO] Starting Novyra Defender...
node index.js
pause
