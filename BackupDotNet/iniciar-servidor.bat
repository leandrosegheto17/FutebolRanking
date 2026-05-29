@echo off
echo ================================================
echo   FUTEBOL RANKING - Iniciando servidor local
echo ================================================
echo.

echo [1/2] Iniciando backend .NET...
start "Backend API" cmd /k "cd /d "%~dp0Backend\src\GrupoFutebol.API" && set ASPNETCORE_ENVIRONMENT=Development && dotnet run"

timeout /t 5 /nobreak > nul

echo [2/2] Iniciando Cloudflare Tunnel...
echo.
echo Aguarde o URL publico aparecer abaixo (linha com "trycloudflare.com")
echo Copie esse URL e cole no Vercel como BACKEND_URL
echo.
cloudflared tunnel --url http://localhost:5132

pause
