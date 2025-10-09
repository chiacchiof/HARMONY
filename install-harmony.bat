@echo off
REM ============================================
REM HARMONY - Installer Wrapper
REM ============================================
REM Avvia lo script PowerShell di installazione
REM bypassando l'Execution Policy
REM
REM Utilizzo:
REM   install-harmony.bat
REM   install-harmony.bat -Branch fix-path-issues-hdft
REM   install-harmony.bat -InstallPath C:\MyPath
REM   install-harmony.bat -Branch test-branch -InstallPath C:\Test
REM ============================================

echo ============================================
echo    HARMONY - Installer
echo ============================================
echo.
echo Avvio installazione...
echo.

REM Esegue lo script PowerShell con bypass dell'Execution Policy
REM Passa tutti i parametri ricevuti dal .bat al .ps1
powershell.exe -ExecutionPolicy Bypass -File "%~dp0install-harmony.ps1" %*

REM Verifica se l'installazione e' riuscita
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Installazione completata con successo!
) else (
    echo.
    echo Si e' verificato un errore durante l'installazione.
    pause
)
