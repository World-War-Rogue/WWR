@echo off
setlocal enabledelayedexpansion
title Skinforge - World War Rogue

REM Double-click this. It finds Blender, renders every skin config in skins\,
REM and leaves the frames in tools\skinforge\out\<id>\frames\.
REM
REM Nothing here needs the command line. If Blender is missing it says so and
REM tells you where to get it, rather than failing with a path error.

cd /d "%~dp0"

set "BLENDER="
for %%V in (4.5 4.4 4.3 4.2 4.1 4.0) do (
  if exist "%ProgramFiles%\Blender Foundation\Blender %%V\blender.exe" (
    set "BLENDER=%ProgramFiles%\Blender Foundation\Blender %%V\blender.exe"
  )
)
if not defined BLENDER (
  where blender >nul 2>&1 && set "BLENDER=blender"
)

if not defined BLENDER (
  echo.
  echo   Blender was not found.
  echo.
  echo   Install it from https://www.blender.org/download/ - the standard
  echo   installer, default location. Then run this again.
  echo.
  pause
  exit /b 1
)

echo Using: !BLENDER!
echo.

set FOUND=0
for %%C in (skins\*.json) do (
  set FOUND=1
  echo ================================================================
  echo Building %%~nC
  echo ================================================================
  "!BLENDER!" -b -P skinforge.py -- "%%C"
  echo.
)

if !FOUND!==0 (
  echo   No skin configs found in skins\.
)

echo.
echo   Done. Frames are in tools\skinforge\out\
echo.
pause
