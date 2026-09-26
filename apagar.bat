@echo off
title Apagar Lead Hunter
echo ===================================================
echo   Apagando servidor Lead Hunter (Puerto 5000)...
echo ===================================================
powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo Servidor detenido correctamente.
echo.
pause
