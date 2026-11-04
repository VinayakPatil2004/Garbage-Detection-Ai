@echo off
title Garbage Detection AI Backend (Flask + GPU)
echo ============================================================
echo   Starting Garbage Detection AI Backend (NVIDIA GPU / CUDA)
echo ============================================================
.\gpu_env\Scripts\python.exe backend/app.py
pause
