@echo off
REM ============================================
REM HARMONY - Installer Wrapper
REM ============================================
REM Avvia lo script PowerShell di installazione
REM bypassando l'Execution Policy
REM ============================================

echo ============================================
echo    HARMONY - Installer
echo ============================================
echo.
echo Avvio installazione...
echo.

REM Esegue lo script PowerShell con bypass dell'Execution Policy
powershell.exe -ExecutionPolicy Bypass -File "%~dp0install-harmony.ps1"

REM Verifica se l'installazione e' riuscita
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Installazione completata con successo!
) else (
    echo.
    echo Si e' verificato un errore durante l'installazione.
    pause
)
