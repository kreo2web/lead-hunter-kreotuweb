@echo off
title Lead Hunter - Kreotuweb.com
echo ===================================================
echo   Iniciando Lead Hunter - Kreotuweb.com
echo ===================================================
cd /d "%~dp0"
echo Abriendo aplicacion en el navegador...
start http://localhost:5000
echo Servidor corriendo en http://localhost:5000
echo Para detener el servidor, presiona Ctrl + C o cierra esta ventana.
echo.
npm start
pause
