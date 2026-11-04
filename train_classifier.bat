@echo off
title Garbage Detection AI - Model Training (GPU)
color 0B
echo ==============================================================
echo    GARBAGE DETECTION AI - MODEL TRAINING ON GPU
echo ==============================================================
echo.
cd /d "%~dp0"
.\gpu_env\Scripts\python.exe backend\train_classifier.py --epochs 100

echo.
echo ==============================================================
echo Training finished. Press any key to exit.
echo ==============================================================
pause
