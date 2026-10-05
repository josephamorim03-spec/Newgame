@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado neste computador.
  echo Instale Node.js ou abra o jogo em um servidor web estatico.
  pause
  exit /b 1
)
node mobile-server.js
if errorlevel 1 pause
