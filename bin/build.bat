@echo off
setlocal

:: Dossier du build : client/build (évite de toucher au code source)
set BUILDDIR=..\client\build
set PROJECTDIR=..\client\js

echo Deleting previous build directory
rmdir /S /Q %BUILDDIR%

echo Building client with RequireJS
cd %PROJECTDIR%
node ..\..\bin\r.js -o build.js
cd ..\..\bin

echo Removing unnecessary js files from the build directory
for %%F in (
    game.js home.js log.js require-jquery.js modernizr.js css3-mediaqueries.js
    mapworker.js detect.js underscore.min.js text.js
) do (
    del /Q %BUILDDIR%\js\%%F 2>nul
)

echo Removing sprites directory
rmdir /S /Q %BUILDDIR%\sprites

echo Removing config directory
rmdir /S /Q %BUILDDIR%\config

echo Moving build.txt to current dir
move %BUILDDIR%\build.txt . >nul 2>&1

echo Build complete
endlocal
pause
