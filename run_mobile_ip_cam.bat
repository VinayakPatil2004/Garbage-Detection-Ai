@echo off
title Mobile IP Webcam - Garbage Detection AI
color 0A
cls
echo ==============================================================
echo    GARBAGE DETECTION AI - MOBILE IP WEBCAM STREAM
echo ==============================================================
echo.
echo [INSTRUCTIONS]
echo 1. Install free "IP Webcam" app from Play Store on your Android mobile.
echo 2. Make sure your Phone and PC are on the same Wi-Fi (or mobile hotspot).
echo 3. Open IP Webcam on mobile, scroll down and tap "Start server".
echo 4. Look at the IP address shown on mobile screen (e.g. http://192.168.1.15:8080)
echo.
set /p IP_URL="Enter Mobile Stream URL (e.g. http://192.168.1.15:8080/video): "

if "%IP_URL%"=="" (
    echo [ERROR] No URL entered! Exiting...
    pause
    exit /b
)

echo.
echo [CONNECTING] Connecting AI to: %IP_URL% ...
echo Press 'q' inside video window to stop monitoring.
echo.

.\gpu_env\Scripts\python.exe garbage_detection\detect.py --source "%IP_URL%"

echo.
echo [DONE] Stream stopped.
pause
