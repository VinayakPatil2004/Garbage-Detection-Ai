@echo off
title Cloudflare Public Tunnel - Garbage Detection AI
color 0B
cls
echo =====================================================================
echo    GARBAGE DETECTION AI - CLOUDFLARE SECURE PUBLIC TUNNEL
echo =====================================================================
echo.

if not exist "cloudflared.exe" (
    echo [INFO] cloudflared.exe not found. Downloading latest official release...
    curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if not exist "cloudflared.exe" (
        echo [ERROR] Failed to download cloudflared.exe. Please check your internet.
        pause
        exit /b
    )
    echo [SUCCESS] Download complete!
    echo.
)

echo [INFO] Starting Cloudflare Tunnel for Port 8443...
echo [INFO] Forwarding Frontend Dashboard + AI GPU Engine + MySQL API.
echo.
echo ---------------------------------------------------------------------
echo  LOOK FOR THE TRYCLOUDFLARE URL BELOW (Example):
echo  https://xxxx-xxxx-xxxx.trycloudflare.com
echo.
echo  1. Copy that https:// URL.
echo  2. Open it in Chrome on your Mobile Phone anywhere in the world!
echo  3. Go to "Live Monitoring" to view detections or use mobile camera!
echo ---------------------------------------------------------------------
echo.

.\cloudflared.exe tunnel --url http://localhost:8443

pause
