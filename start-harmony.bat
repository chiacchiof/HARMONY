@echo off
REM ============================================
REM HARMONY - Launcher Script
REM ============================================
REM Avvia l'applicazione Harmony (Frontend React)
REM ============================================

cls
echo ============================================
echo    HARMONY - Fault Tree Editor
echo ============================================
echo.

REM Verifica che siamo nella directory corretta
if not exist "package.json" (
    echo [X] ERRORE: File package.json non trovato!
    echo.
    echo Assicurati di eseguire questo script dalla directory di Harmony.
    echo.
    pause
    exit /b 1
)

REM Verifica Node.js installato
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] ERRORE: Node.js non trovato!
    echo.
    echo Installa Node.js da: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Verifica npm installato
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] ERRORE: npm non trovato!
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js trovato:
node --version
echo.

REM Verifica che node_modules esista
if not exist "node_modules" (
    echo [!] ATTENZIONE: Dipendenze non installate!
    echo.
    echo Installo le dipendenze npm...
    echo Questo potrebbe richiedere alcuni minuti...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [X] ERRORE durante l'installazione delle dipendenze!
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dipendenze installate!
    echo.
)

echo ============================================
echo    Avvio Harmony...
echo ============================================
echo.
echo L'applicazione si aprira automaticamente nel browser su:
echo http://localhost:3000
echo.
echo Per fermare Harmony, chiudi questa finestra o premi Ctrl+C
echo.
echo ============================================
echo.

REM Avvia il server di sviluppo React
npm start

REM Se npm start fallisce
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [X] ERRORE durante l'avvio di Harmony!
    echo.
    pause
    exit /b 1
)
