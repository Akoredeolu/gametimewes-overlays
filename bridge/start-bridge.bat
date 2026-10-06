@echo off
title Gametimewes Sim Bridge
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get the LTS from https://nodejs.org then run this again. & pause & exit /b 1)
if not exist node_modules (echo Installing bridge dependencies... & call npm install --omit=dev)
if not exist config.json (copy config.example.json config.json >nul & echo Created config.json - add your SimBrief username there.)
node bridge.js
pause
