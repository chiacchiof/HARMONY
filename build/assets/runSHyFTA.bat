@echo off
echo ========================================
echo    SHYFTA MATLAB Simulation Launcher
echo ========================================
echo.

REM These variables will be modified by the application
set SHYFTA_PATH=C:\Path\To\SHyFTALib
set MODEL_NAME=ModelName

echo Cartella SHyFTA: "%SHYFTA_PATH%"
echo Nome Modello: %MODEL_NAME%
echo.

REM Change to SHyFTA directory
cd /d "%SHYFTA_PATH%"
if %errorlevel% neq 0 (
    echo ERRORE: Impossibile accedere alla cartella "%SHYFTA_PATH%"
    pause
    exit /b 1
)

REM Check if required files exist
if not exist "ZFTAMain.m" (
    echo ERRORE: File ZFTAMain.m non trovato nella cartella!
    echo Verifica che i file siano stati copiati correttamente.
    pause
    exit /b 1
)

if not exist "%MODEL_NAME%.m" (
    echo ERRORE: File del modello %MODEL_NAME%.m non trovato!
    echo Verifica che i file siano stati copiati correttamente.
    pause
    exit /b 1
)

echo Pulizia cartella output...
if exist "output" (
    rd /s /q "output"
)
mkdir "output"

echo.
echo Avvio simulazione MATLAB...
echo ========================================
echo.

REM Launch MATLAB with logging
matlab -batch "try; ZFTAMain; disp('SIMULATION_COMPLETED'); catch ME; disp(['MATLAB_ERROR: ' ME.message]); disp('SIMULATION_FAILED'); end; exit;" -logfile matlab_output.log

echo.
echo ========================================
if exist "output\results.mat" (
    echo Simulazione completata con successo!
    echo Risultati salvati in: output\results.mat
) else (
    echo Simulazione fallita o incompleta.
    echo Controlla il file matlab_output.log per dettagli.
)
echo ========================================
echo.
pause