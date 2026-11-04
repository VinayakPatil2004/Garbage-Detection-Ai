@echo off
title Garbage Detection AI - Resume Model Training (GPU)
color 0E
echo ==============================================================
echo    GARBAGE DETECTION AI - RESUME MODEL TRAINING (GPU)
echo ==============================================================
echo.
echo Resuming training from last saved checkpoint (last.pt)...
echo.

cd /d "%~dp0"
.\gpu_env\Scripts\python.exe backend\resume_training.py

echo.
echo ==============================================================
echo Training finished. Press any key to exit.
echo ==============================================================
pause
