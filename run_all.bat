@echo off
title Starting Garbage Detection AI Full System
echo ============================================================
echo   Starting Garbage Detection AI Complete System
echo ============================================================
echo.
echo [1/2] Starting AI Backend on Port 5000 (CUDA GPU)...
start "Garbage Detection Backend" cmd /k ".\gpu_env\Scripts\python.exe backend/app.py"

echo Waiting 3 seconds for AI Models to load in VRAM...
timeout /t 3 /nobreak >nul

echo [2/2] Starting React + Vite Frontend on Port 8443...
start "Garbage Detection Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================================
echo  All systems running! 
echo  Open http://localhost:8443 in your browser.
echo ============================================================
pause
