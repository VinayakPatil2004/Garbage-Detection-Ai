@echo off
title Running Live Road Video AI Detection
echo ============================================================
echo   Garbage Detection AI - Live Road Video Detection
echo ============================================================
echo Playing video: C:\Users\Shree\Downloads\VID20261116122028.mp4
echo Real-time YOLOv8s + 640px Road AI with CLAHE Active!
echo.
echo Press 'q' to quit, 's' to save snapshot.
echo ============================================================
.\gpu_env\Scripts\python.exe garbage_detection/detect.py --source "C:\Users\Shree\Downloads\VID20261116122028.mp4"
pause

