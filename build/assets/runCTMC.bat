@echo off
echo ========================================
echo    CTMC MATLAB Analysis Launcher
echo ========================================
echo.

REM These variables will be modified by the application
set CTMC_PATH=C:\Path\To\CTMCLib
set MODEL_NAME=CTMCSolver

echo Cartella CTMC: "%CTMC_PATH%"
echo Nome Modello: %MODEL_NAME%
echo.

REM Change to CTMC directory
cd /d "%CTMC_PATH%"
if %errorlevel% neq 0 (
    echo ERRORE: Impossibile accedere alla cartella "%CTMC_PATH%"
    pause
    exit /b 1
)

REM Check if required files exist
if not exist "CTMCSolver.m" (
    echo ERRORE: File CTMCSolver.m non trovato nella cartella!
    echo Verifica che i file siano stati copiati correttamente.
    pause
    exit /b 1
)

if not exist "buildGenerator.m" (
    echo ERRORE: File buildGenerator.m non trovato!
    echo Verifica che i file helper siano presenti.
    pause
    exit /b 1
)

if not exist "solveCTMC.m" (
    echo ERRORE: File solveCTMC.m non trovato!
    echo Verifica che i file helper siano presenti.
    pause
    exit /b 1
)

echo Pulizia cartella output...
if exist "output" (
    rd /s /q "output"
)
mkdir "output"

echo.
echo Avvio analisi CTMC MATLAB...
echo ========================================
echo.

REM Launch MATLAB with logging
matlab -batch "try; CTMCSolver; disp('SIMULATION_COMPLETED'); catch ME; fprintf(2, 'MATLAB_ERROR: %s\n', ME.message); disp('SIMULATION_FAILED'); exit(1); end; exit(0);" -logfile matlab_output.log

echo.
echo ========================================
if exist "output\results.mat" (
    echo Analisi CTMC completata con successo!
    echo Risultati salvati in: output\results.mat
) else (
    echo Analisi CTMC fallita o incompleta.
    echo Controlla il file matlab_output.log per dettagli.
)
echo ========================================
echo.
pause