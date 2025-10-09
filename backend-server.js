/**
 * Simple Node.js backend server for executing MATLAB commands
 * Run with: node backend-server.js
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Global process tracking for stop functionality
let currentMatlabProcess = null;
let lastCTMCLibraryPath = null; // Track the last CTMC library path used

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for file content

// Helper function to update batch file
async function updateBatchFile(shyftaPath, modelName, res) {
  try {
    // Read the template from the frontend project
    const templatePath = path.join(__dirname, 'public', 'assets', 'runSHyFTA.bat');
    let batContent;
    
    if (fs.existsSync(templatePath)) {
      batContent = fs.readFileSync(templatePath, 'utf8');
      console.log(`✅ Using existing template: ${templatePath}`);
    } else {
      // Fallback template if file doesn't exist
      batContent = `@echo off
echo ========================================
echo    SHYFTA MATLAB Simulation Launcher
echo ========================================
echo.

set SHYFTA_PATH=${shyftaPath}
set MODEL_NAME=${modelName.replace(/\.m$/, '')}

echo Cartella SHyFTA: %SHYFTA_PATH%
echo Nome Modello: %MODEL_NAME%
echo.

cd /d %SHYFTA_PATH%
if %errorlevel% neq 0 (
    echo ERRORE: Impossibile accedere alla cartella "%SHYFTA_PATH%"
    pause
    exit /b 1
)

if not exist "ZFTAMain.m" (
    echo ERRORE: File ZFTAMain.m non trovato!
    pause
    exit /b 1
)

if not exist "%MODEL_NAME%.m" (
    echo ERRORE: File del modello %MODEL_NAME%.m non trovato!
    pause
    exit /b 1
)

echo Pulizia cartella output...
if exist "output" (
    rd /s /q "output"
)
mkdir "output"

echo Avvio simulazione MATLAB...
matlab -batch "try; ZFTAMain; disp('SIMULATION_COMPLETED'); catch ME; fprintf(2, 'MATLAB_ERROR: %s\n', ME.message); disp('SIMULATION_FAILED'); exit(1); end; exit(0);" -logfile matlab_output.log

if exist "output\\results.mat" (
    echo Simulazione completata con successo!
    echo Risultati salvati in: output\\results.mat
) else (
    echo Simulazione fallita o incompleta.
)
echo.
pause`;
    }
    
    // Replace placeholders in the template
    const modelNameWithoutExt = modelName.replace(/\.m$/, '');
    batContent = batContent
      .replace(/set SHYFTA_PATH=.*/, `set SHYFTA_PATH=${shyftaPath}`)
      .replace(/set MODEL_NAME=.*/, `set MODEL_NAME=${modelNameWithoutExt}`);
    
    // Save updated batch file
    const batPath = path.join(shyftaPath, 'runSHyFTA.bat');
    fs.writeFileSync(batPath, batContent, 'utf8');
    console.log(`🔧 Updated batch file: ${batPath}`);
    
  } catch (error) {
    console.error('❌ Error updating batch file:', error);
    throw error;
  }
}

// Helper function to update CTMC batch file
async function updateCTMCBatchFile(ctmcPath, modelName, res) {
  try {
    // Read the template from the frontend project
    const templatePath = path.join(__dirname, 'public', 'assets', 'runCTMC.bat');
    let batContent;
    
    if (fs.existsSync(templatePath)) {
      batContent = fs.readFileSync(templatePath, 'utf8');
      console.log(`✅ Using existing CTMC template: ${templatePath}`);
    } else {
      // Fallback template if file doesn't exist
      batContent = `@echo off
echo ========================================
echo    CTMC MATLAB Analysis Launcher
echo ========================================
echo.

set CTMC_PATH=${ctmcPath}
set MODEL_NAME=${modelName.replace(/\.m$/, '')}

echo Cartella CTMC: %CTMC_PATH%
echo Nome Modello: %MODEL_NAME%
echo.

cd /d %CTMC_PATH%
if %errorlevel% neq 0 (
    echo ERRORE: Impossibile accedere alla cartella "%CTMC_PATH%"
    pause
    exit /b 1
)

if not exist "CTMCSolver.m" (
    echo ERRORE: File CTMCSolver.m non trovato!
    pause
    exit /b 1
)

echo Pulizia cartella output...
if exist "output" (
    rd /s /q "output"
)
mkdir "output"

echo Avvio analisi CTMC MATLAB...
matlab -batch "try; CTMCSolver; disp('SIMULATION_COMPLETED'); catch ME; fprintf(2, 'MATLAB_ERROR: %s\n', ME.message); disp('SIMULATION_FAILED'); exit(1); end; exit(0);" -logfile matlab_output.log

if exist "output\\results.mat" (
    echo Analisi CTMC completata con successo!
    echo Risultati salvati in: output\\results.mat
) else (
    echo Analisi CTMC fallita o incompleta.
)
echo.
pause`;
    }
    
    // Replace placeholders in the template
    const modelNameWithoutExt = modelName.replace(/\.m$/, '');
    batContent = batContent
      .replace(/set CTMC_PATH=.*/, `set CTMC_PATH=${ctmcPath}`)
      .replace(/set MODEL_NAME=.*/, `set MODEL_NAME=${modelNameWithoutExt}`);
    
    // Save updated batch file
    const batPath = path.join(ctmcPath, 'runCTMC.bat');
    fs.writeFileSync(batPath, batContent, 'utf8');
    console.log(`🔧 Updated CTMC batch file: ${batPath}`);
    
  } catch (error) {
    console.error('❌ Error updating CTMC batch file:', error);
    throw error;
  }
}

// Helper function to execute CTMC simulation
function executeCTMCSimulation(ctmcPath, outputDir, res) {
  console.log(`🔬 [CTMC executeCTMCSimulation] ENTRY - Starting CTMC MATLAB execution: ${ctmcPath}`);
  console.log(`📊 [CTMC executeCTMCSimulation] Will monitor output directory: ${outputDir}`);
  console.log(`🔧 [CTMC executeCTMCSimulation] Response object type: ${typeof res}, hasWriteHead: ${typeof res.writeHead}`);
  
  const batPath = path.join(ctmcPath, 'runCTMC.bat');
  
  console.log(`🚀 Starting CTMC MATLAB execution: ${batPath}`);
  console.log(`📊 Will monitor output directory: ${outputDir}`);
  
  // Spawn the MATLAB process with detached: false to ensure child processes are killed
  const matlabProcess = spawn('cmd', ['/c', batPath], {
    cwd: ctmcPath,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,  // Ensure child processes are killed with parent
    shell: true       // Use shell for better process tree management
  });

  // Track the current process globally for stop functionality
  currentMatlabProcess = matlabProcess;

  let outputBuffer = '';
  let currentProgress = 0;
  let lastUpdateTime = Date.now();

  console.log(`🎬 MATLAB CTMC process started with PID: ${matlabProcess.pid}`);

  // Listen to stdout for MATLAB progress
  matlabProcess.stdout.on('data', (data) => {
    const output = data.toString();
    outputBuffer += output;
    
    console.log('📊 MATLAB STDOUT:', output);

    // For CTMC, look for completion indicators and batch progress
    const completionIndicators = [
      'π(t=',
      '(t=', // Handle encoding issues with π
      'Risultati salvati in:',
      'Results saved to:',
      'Distribuzione transitoria',
      'output/results.mat',
      'output\\results.mat',
      'SIMULATION_COMPLETED',
      'save(',
      'fullfile(pwd',
      'Distribuzione transitoria a t=',
      'Analisi CTMC completata con successo!'
    ];
    
    const hasCompletion = completionIndicators.some(indicator => 
      output.toLowerCase().includes(indicator.toLowerCase())
    );
    
    // Also look for batch file progress indicators
    if (output.includes('Avvio analisi CTMC MATLAB...')) {
      currentProgress = Math.max(currentProgress, 20);
      console.log('🚀 CTMC MATLAB started');
    }
    
    if (hasCompletion && currentProgress < 100) {
      currentProgress = 100;
      console.log('🎉 CTMC completion detected, setting progress to 100%');
      console.log(`🎯 Completion detected by indicator: ${completionIndicators.find(ind => output.toLowerCase().includes(ind.toLowerCase()))}`);
    }
    
    // Send progress update
    const progressData = {
      success: false,
      progress: currentProgress,
      output: `CTMC MATLAB: ${currentProgress}%\n${outputBuffer.slice(-800)}`
    };
    
    res.write(`data: ${JSON.stringify(progressData)}\n\n`);
    lastUpdateTime = Date.now();
  });

  // Listen to stderr for errors
  matlabProcess.stderr.on('data', (data) => {
    const errorOutput = data.toString();
    console.error('❌ MATLAB STDERR:', errorOutput);
    outputBuffer += `ERROR: ${errorOutput}`;
    
    const errorData = {
      success: false,
      progress: currentProgress,
      error: errorOutput.trim(),
      output: `❌ CTMC ERRORE: ${errorOutput}\n${outputBuffer.slice(-800)}`
    };
    
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
  });

  // Handle process completion
  matlabProcess.on('close', (code) => {
    console.log(`🏁 MATLAB CTMC process finished with exit code: ${code}`);
    
    if (currentMatlabProcess === matlabProcess) {
      currentMatlabProcess = null;
    }
    
    // Check if results.mat exists in output directory (more robust search)
    let resultsPath = path.join(outputDir, 'results.mat');
    let resultsExist = fs.existsSync(resultsPath);
    
    // If not found, try multiple approaches
    if (!resultsExist) {
      console.log(`🔍 Primary results path not found: ${resultsPath}`);
      
      // Try direct path from working directory
      const directPath = path.join(ctmcPath, 'output', 'results.mat');
      if (fs.existsSync(directPath)) {
        resultsPath = directPath;
        resultsExist = true;
        console.log(`🔧 Found results at direct path: ${directPath}`);
      }
      
      // Try case-insensitive search on Windows
      if (!resultsExist && process.platform === 'win32') {
        try {
          const parentDir = path.dirname(ctmcPath);
          const dirs = fs.readdirSync(parentDir);
          
          // Find the actual CTMC directory with correct case
          const ctmcDirName = path.basename(ctmcPath);
          const actualCtmcDir = dirs.find(dir => 
            dir.toLowerCase() === ctmcDirName.toLowerCase()
          );
          
          if (actualCtmcDir) {
            const actualCtmcPath = path.join(parentDir, actualCtmcDir);
            const actualOutputDir = path.join(actualCtmcPath, 'output');
            resultsPath = path.join(actualOutputDir, 'results.mat');
            resultsExist = fs.existsSync(resultsPath);
            
            if (resultsExist) {
              console.log(`🔧 Found results file with case correction: ${resultsPath}`);
            }
          }
        } catch (caseError) {
          console.warn('⚠️ Case-insensitive file search failed:', caseError.message);
        }
      }
    }
    
    console.log(`🔍 Checking CTMC results file: ${resultsPath}`);
    console.log(`📊 CTMC results file exists: ${resultsExist ? 'YES' : 'NO'}`);
    
    // For CTMC, check both exit code and indicators in output
    const hasSuccessIndicators = outputBuffer.toLowerCase().includes('simulation_completed') ||
                                  outputBuffer.toLowerCase().includes('results saved') ||
                                  outputBuffer.toLowerCase().includes('risultati salvati in:') ||
                                  outputBuffer.toLowerCase().includes('distribuzione transitoria') ||
                                  outputBuffer.toLowerCase().includes('π(t=') ||
                                  outputBuffer.toLowerCase().includes('(t=') ||
                                  outputBuffer.toLowerCase().includes('mat2str') ||
                                  outputBuffer.toLowerCase().includes('save(') ||
                                  resultsExist;
    
    const finalData = {
      success: (code === 0) || hasSuccessIndicators || resultsExist, // CTMC can succeed with warnings
      progress: 100,
      output: outputBuffer,
      resultsPath: resultsExist ? resultsPath : null,
      exitCode: code,
      hasSuccessIndicators
    };
    
    if (finalData.success) {
      console.log('🎉 ✅ MATLAB CTMC analysis completed successfully!');
      console.log(`📁 Results saved in: ${resultsPath || 'output directory'}`);
    } else {
      console.log(`❌ MATLAB CTMC analysis failed:`);
      console.log(`   Exit code: ${code}`);
      console.log(`   Results file: ${resultsExist ? 'Found' : 'Missing'}`);
    }
    
    res.write(`data: ${JSON.stringify(finalData)}\n\n`);
    res.end();
  });

  // Handle process errors
  matlabProcess.on('error', (error) => {
    console.error('💥 Failed to start MATLAB CTMC process:', error);
    
    const errorData = {
      success: false,
      progress: 0,
      error: error.message,
      output: `CTMC Process error: ${error.message}\n${outputBuffer}`
    };
    
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.end();
  });

  // Handle client disconnect
  res.req.on('close', () => {
    console.log('👋 Client disconnected - terminating CTMC MATLAB process if running');
    if (matlabProcess && !matlabProcess.killed) {
      const pid = matlabProcess.pid;
      console.log(`🔪 Client disconnect: Killing CTMC process tree for PID: ${pid}`);
      
      const { spawn } = require('child_process');
      const killProcess = spawn('taskkill', ['/pid', pid, '/t', '/f'], {
        stdio: 'inherit'
      });
      
      killProcess.on('close', (code) => {
        console.log(`🏁 Client disconnect CTMC kill completed with code: ${code}`);
      });
      
      setTimeout(() => {
        if (!matlabProcess.killed) {
          matlabProcess.kill('SIGKILL');
        }
      }, 2000);
    }
  });
}

// Helper function to execute MATLAB simulation (SHyFTA)
function executeMatlabSimulation(shyftaPath, outputDir, res) {
  const batPath = path.join(shyftaPath, 'runSHyFTA.bat');
  
  console.log(`🚀 Starting MATLAB execution: ${batPath}`);
  console.log(`📊 Will monitor output directory: ${outputDir}`);
  
  // Spawn the MATLAB process with detached: false to ensure child processes are killed
  const matlabProcess = spawn('cmd', ['/c', batPath], {
    cwd: shyftaPath,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,  // Ensure child processes are killed with parent
    shell: true       // Use shell for better process tree management
  });

  // Track the current process globally for stop functionality
  currentMatlabProcess = matlabProcess;

  let outputBuffer = '';
  let currentProgress = 0; // Start from 0, only MATLAB progress counts
  let lastUpdateTime = Date.now();
  let matlabStarted = false;

  console.log(`🎬 MATLAB process started with PID: ${matlabProcess.pid}`);

  // File watcher for results.mat - complete simulation when file is created
  const resultsPath = path.join(outputDir, 'results.mat');
  let simulationCompleted = false;
  
  const checkResults = () => {
    if (!simulationCompleted && fs.existsSync(resultsPath)) {
      console.log('🎉 results.mat detected! Completing simulation...');
      simulationCompleted = true;
      
      // Clean up the watcher immediately to prevent memory leaks
      clearInterval(resultsWatcher);
      console.log('🧹 Cleared results watcher interval');
      
      // Send completion signal
      const finalData = {
        success: true,
        progress: 100,
        output: outputBuffer,
        resultsPath: resultsPath
      };
      
      res.write(`data: ${JSON.stringify(finalData)}\n\n`);
      res.end();
      
      // Clean up the process reference
      if (currentMatlabProcess === matlabProcess) {
        currentMatlabProcess = null;
      }
      
      // Don't kill MATLAB immediately, let it finish naturally
      console.log('✅ Simulation marked as completed, MATLAB can continue if needed');
    }
  };
  
  // Check every 10 seconds for results.mat
  const resultsWatcher = setInterval(checkResults, 10000);
  
  // Clean up watcher when process ends
  matlabProcess.on('close', () => {
    clearInterval(resultsWatcher);
  });

  // Listen to stdout for MATLAB progress
  matlabProcess.stdout.on('data', (data) => {
    const output = data.toString();
    outputBuffer += output;
    
    console.log('📊 MATLAB STDOUT:', output);

    // Look for progress in the output: "Avanzamento: XX.XX%"
    const progressMatches = output.match(/Avanzamento:\s*(\d+\.?\d*)%/g);
    if (progressMatches) {
      const lastMatch = progressMatches[progressMatches.length - 1];
      const progressMatch = lastMatch.match(/Avanzamento:\s*(\d+\.?\d*)%/);
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        
        // Update progress only if MATLAB reports higher progress
        if (progress > currentProgress) {
          currentProgress = progress;
          
          const progressData = {
            success: false,
            progress: currentProgress,
            output: `MATLAB: ${progress.toFixed(2)}%\n${outputBuffer.slice(-800)}`
          };
          
          res.write(`data: ${JSON.stringify(progressData)}\n\n`);
          lastUpdateTime = Date.now();
          
          console.log(`📈 MATLAB Progress: ${currentProgress.toFixed(2)}%`);
        }
      }
    }
    
    // Check for specific error messages
    if (output.includes('MATLAB_ERROR:') || output.includes('SIMULATION_FAILED')) {
      const errorData = {
        success: false,
        progress: currentProgress,
        error: 'MATLAB simulation failed',
        output: `❌ MATLAB failed:\n${outputBuffer.slice(-800)}`
      };
      
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    }
  });

  // Listen to stderr for errors
  matlabProcess.stderr.on('data', (data) => {
    const errorOutput = data.toString();
    console.error('❌ MATLAB STDERR:', errorOutput);
    outputBuffer += `ERROR: ${errorOutput}`;
    
    // Send error immediately to frontend
    const errorData = {
      success: false,
      progress: currentProgress,
      error: errorOutput.trim(),
      output: `❌ ERRORE: ${errorOutput}\n${outputBuffer.slice(-800)}`
    };
    
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
  });

  // Handle process completion
  matlabProcess.on('close', (code) => {
    console.log(`🏁 MATLAB process finished with exit code: ${code}`);
    
    // Clear the global process reference
    if (currentMatlabProcess === matlabProcess) {
      currentMatlabProcess = null;
    }
    
    // Only send response if simulation wasn't already completed by file watcher
    if (!simulationCompleted) {
      // Check if results.mat exists in output directory
      const resultsPath = path.join(outputDir, 'results.mat');
      const resultsExist = fs.existsSync(resultsPath);
      
      console.log(`🔍 Checking results file: ${resultsPath}`);
      console.log(`📊 Results file exists: ${resultsExist ? 'YES' : 'NO'}`);
      
      const finalData = {
        success: code === 0 && resultsExist,
        progress: 100,
        output: outputBuffer,
        resultsPath: resultsExist ? resultsPath : null,
        exitCode: code
      };
      
      if (code === 0 && resultsExist) {
        console.log('🎉 ✅ MATLAB simulation completed successfully!');
        console.log(`📁 Results saved in: ${resultsPath}`);
      } else {
        console.log(`❌ MATLAB simulation failed:`);
        console.log(`   Exit code: ${code}`);
        console.log(`   Results file: ${resultsExist ? 'Found' : 'Missing'}`);
      }
      
      res.write(`data: ${JSON.stringify(finalData)}\n\n`);
      res.end();
    } else {
      console.log('ℹ️ MATLAB process ended but simulation was already completed by file watcher');
    }
  });

  // Handle process errors
  matlabProcess.on('error', (error) => {
    console.error('💥 Failed to start MATLAB process:', error);
    
    const errorData = {
      success: false,
      progress: 0,
      error: error.message,
      output: `Process error: ${error.message}\n${outputBuffer}`
    };
    
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.end();
  });

  // Handle client disconnect
  res.req.on('close', () => {
    console.log('👋 Client disconnected - terminating MATLAB process if running');
    
    // Clean up the results watcher to prevent memory leaks
    clearInterval(resultsWatcher);
    console.log('🧹 Cleared results watcher on client disconnect');
    
    if (matlabProcess && !matlabProcess.killed) {
      const pid = matlabProcess.pid;
      console.log(`🔪 Client disconnect: Killing process tree for PID: ${pid}`);
      
      // Kill the entire process tree on Windows
      const { spawn } = require('child_process');
      const killProcess = spawn('taskkill', ['/pid', pid, '/t', '/f'], {
        stdio: 'inherit'
      });
      
      killProcess.on('close', (code) => {
        console.log(`🏁 Client disconnect kill completed with code: ${code}`);
      });
      
      // Fallback standard kill
      setTimeout(() => {
        if (!matlabProcess.killed) {
          matlabProcess.kill('SIGKILL');
        }
      }, 2000);
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stop MATLAB simulation endpoint
app.post('/api/matlab/stop', (req, res) => {
  console.log('🛑 Stop MATLAB simulation requested');
  
  if (currentMatlabProcess && !currentMatlabProcess.killed) {
    console.log(`🔪 Terminating MATLAB process PID: ${currentMatlabProcess.pid}`);
    
    try {
      // On Windows, we need to kill the entire process tree to stop MATLAB
      const pid = currentMatlabProcess.pid;
      console.log(`🔪 Killing process tree for PID: ${pid}`);
      
      // Kill the entire process tree on Windows using taskkill
      const { spawn } = require('child_process');
      const killProcess = spawn('taskkill', ['/pid', pid, '/t', '/f'], {
        stdio: 'inherit'
      });
      
      killProcess.on('close', (code) => {
        console.log(`🏁 Process tree kill completed with code: ${code}`);
      });
      
      // Also try the standard kill as fallback
      setTimeout(() => {
        if (currentMatlabProcess && !currentMatlabProcess.killed) {
          console.log('💀 Fallback: Force killing main process');
          currentMatlabProcess.kill('SIGKILL');
        }
      }, 2000);
      
      res.json({ 
        success: true, 
        message: 'MATLAB process termination initiated',
        pid: currentMatlabProcess.pid 
      });
    } catch (error) {
      console.error('❌ Error terminating MATLAB process:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  } else {
    console.log('ℹ️ No MATLAB process currently running');
    res.json({ 
      success: true, 
      message: 'No MATLAB process currently running' 
    });
  }
});

// Execute complete MATLAB simulation (SHyFTA or CTMC) with file copying and real-time streaming
app.post('/api/matlab/execute-stream', async (req, res) => {
  const { shyftaPath, modelName, modelContent, zftaContent, isCTMC } = req.body;
  
  if (isCTMC) {
    // CTMC Mode
    console.log(`🔬 CTMC analysis requested:`);
    console.log(`   📁 CTMC Path: ${shyftaPath}`);
    console.log(`   📄 Model Name: ${modelName}`);
    console.log(`   📝 Model Content: ${modelContent ? modelContent.length + ' chars' : 'missing'}`);
    console.log(`   🧪 Mode: CTMC (Continuous Time Markov Chain)`);
    
    if (!shyftaPath || !modelName || !modelContent) {
      const error = 'Missing required CTMC parameters: shyftaPath, modelName, modelContent';
      console.error(`❌ ${error}`);
      return res.status(400).json({ success: false, error });
    }
    
    // Save the CTMC library path for results lookup
    lastCTMCLibraryPath = shyftaPath;
    console.log(`💾 Saved CTMC library path for results: ${lastCTMCLibraryPath}`);
  } else {
    // SHyFTA Mode
    console.log(`🚀 Complete SHyFTA simulation requested:`);
    console.log(`   📁 SHyFTA Path: ${shyftaPath}`);
    console.log(`   📄 Model Name: ${modelName}`);
    console.log(`   📝 Model Content: ${modelContent ? modelContent.length + ' chars' : 'missing'}`);
    console.log(`   🔧 ZFTAMain Content: ${zftaContent ? zftaContent.length + ' chars' : 'missing'}`);
    
    if (!shyftaPath || !modelName || !modelContent || !zftaContent) {
      const error = 'Missing required SHyFTA parameters: shyftaPath, modelName, modelContent, zftaContent';
      console.error(`❌ ${error}`);
      return res.status(400).json({ success: false, error });
    }
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial status
  const initialMessage = isCTMC ? 'Inizializzazione analisi CTMC...' : 'Inizializzazione simulazione SHyFTA...';
  res.write(`data: ${JSON.stringify({ 
    success: false, 
    progress: 0, 
    output: initialMessage
  })}\n\n`);

  try {
    // Step 1: Verify directory exists
    if (!fs.existsSync(shyftaPath)) {
      const dirType = isCTMC ? 'CTMC library' : 'SHyFTALib';
      throw new Error(`${dirType} directory not found: ${shyftaPath}`);
    }
    const dirType = isCTMC ? 'CTMC library' : 'SHyFTALib';
    console.log(`✅ ${dirType} directory verified: ${shyftaPath}`);
    
    res.write(`data: ${JSON.stringify({ 
      success: false, 
      progress: 0, 
      output: `Directory ${dirType} verificata...` 
    })}\n\n`);

    // Step 2: Clear and create output directory
    const outputDir = path.join(shyftaPath, 'output');
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      console.log(`🗑️ Cleared existing output directory`);
    }
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
    
    res.write(`data: ${JSON.stringify({ 
      success: false, 
      progress: 0, 
      output: 'Cartella output preparata...' 
    })}\n\n`);

    if (isCTMC) {
      // CTMC Mode: Only copy CTMCSolver.m and execute it directly
      console.log(`🔬 [CTMC Debug] Starting CTMC processing for: ${shyftaPath}`);
      
      const ctmcFilePath = path.join(shyftaPath, 'CTMCSolver.m');
      fs.writeFileSync(ctmcFilePath, modelContent, 'utf8');
      console.log(`🔬 CTMCSolver.m written: ${ctmcFilePath} (${modelContent.length} bytes)`);
      
      res.write(`data: ${JSON.stringify({ 
        success: false, 
        progress: 0, 
        output: 'CTMCSolver.m configurato, avvio MATLAB...' 
      })}\n\n`);

      console.log(`🔬 [CTMC Debug] About to update batch file and execute CTMC`);

      // Step: Update runCTMC.bat with correct paths
      try {
        await updateCTMCBatchFile(shyftaPath, 'CTMCSolver', res);
        
        res.write(`data: ${JSON.stringify({ 
          success: false, 
          progress: 0, 
          output: 'File batch CTMC aggiornato, avvio MATLAB...' 
        })}\n\n`);

        console.log(`🔬 [CTMC Debug] About to call executeCTMCSimulation with:
           - ctmcPath: ${shyftaPath}  
           - outputDir: ${outputDir}
           - response object: ${typeof res}`);

        // Execute MATLAB for CTMC
        executeCTMCSimulation(shyftaPath, outputDir, res);
        console.log(`🔬 [CTMC Debug] executeCTMCSimulation called successfully`);
        
      } catch (error) {
        console.error(`💥 [CTMC Debug] CTMC setup error:`, error);
        res.write(`data: ${JSON.stringify({ 
          success: false, 
          error: error.message,
          output: `Errore durante setup CTMC: ${error.message}` 
        })}\n\n`);
        res.end();
      }
      
    } else {
      // SHyFTA Mode: Original logic
      
      // Step 3: Copy model file to SHyFTALib (always overwrite to handle model name changes)
      const modelFilePath = path.join(shyftaPath, modelName.endsWith('.m') ? modelName : `${modelName}.m`);
      
      // Remove any existing model files with different names to avoid conflicts
      try {
        const existingFiles = fs.readdirSync(shyftaPath);
        const matlabFiles = existingFiles.filter(file => file.startsWith('initFaultTree_') && file.endsWith('.m'));
        for (const oldFile of matlabFiles) {
          const oldFilePath = path.join(shyftaPath, oldFile);
          if (oldFilePath !== modelFilePath) {
            fs.unlinkSync(oldFilePath);
            console.log(`🗑️ Removed old model file: ${oldFile}`);
          }
        }
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up old model files:', cleanupError.message);
      }
      
      fs.writeFileSync(modelFilePath, modelContent, 'utf8');
      console.log(`📄 Model file copied: ${modelFilePath}`);
      
      res.write(`data: ${JSON.stringify({ 
        success: false, 
        progress: 0, 
        output: `File modello copiato: ${path.basename(modelFilePath)}` 
      })}\n\n`);

      // Step 4: Copy ZFTAMain.m to SHyFTALib
      const zftaFilePath = path.join(shyftaPath, 'ZFTAMain.m');
      fs.writeFileSync(zftaFilePath, zftaContent, 'utf8');
      console.log(`🔧 ZFTAMain.m copied: ${zftaFilePath}`);
      
      res.write(`data: ${JSON.stringify({ 
        success: false, 
        progress: 0, 
        output: 'ZFTAMain.m configurato e copiato...' 
      })}\n\n`);

      // Step 5: Update runSHyFTA.bat with correct paths
      await updateBatchFile(shyftaPath, modelName, res);
      
      res.write(`data: ${JSON.stringify({ 
        success: false, 
        progress: 0, 
        output: 'File batch aggiornato, avvio MATLAB...' 
      })}\n\n`);

      // Step 6: Execute MATLAB
      executeMatlabSimulation(shyftaPath, outputDir, res);
    }
    
  } catch (error) {
    console.error('💥 Error during setup:', error);
    res.write(`data: ${JSON.stringify({ 
      success: false, 
      error: error.message,
      output: `Errore durante setup: ${error.message}` 
    })}\n\n`);
    res.end();
  }
});

// Parse results.mat file for reliability data
app.get('/api/results/parse', async (req, res) => {
  const { resultsPath, components, iterations, missionTime, timestep = 1 } = req.query;
  let responseSent = false; // Flag to prevent double responses
  
  console.log(`📈 Results parsing requested:`);
  console.log(`   📁 Results file: ${resultsPath}`);
  console.log(`   🧩 Components: ${components}`);
  console.log(`   🔄 Iterations: ${iterations}`);
  console.log(`   ⏱️ Mission time: ${missionTime}h`);
  console.log(`   📊 Config: timestep=${timestep}h`);
  
  if (!resultsPath || !fs.existsSync(resultsPath)) {
    const error = `Results file not found: ${resultsPath}`;
    console.error(`❌ ${error}`);
    return res.status(404).json({ success: false, error });
  }
  
  try {
    // For now, we'll create a MATLAB script to read the .mat file and export data as JSON
    // This is a workaround since reading .mat files in Node.js requires special libraries
    const matlabScript = `
% Script to extract data from results.mat and save as JSON
try
    % Load only the _tfail variables from the results file
    fprintf('Loading only _tfail variables from results.mat...\\n');
    
    % Parse component names from query first
    componentNames = split('${components}', ',');
    tfailVars = {};
    for i = 1:length(componentNames)
        compName = strtrim(componentNames{i});
        if ~isempty(compName)
            tfailVars{end+1} = [compName '_tfail'];
        end
    end
    
    % Load all variables to ensure counter_i is available
    load('${resultsPath.replace(/\\/g, '/')}');
    fprintf('Loaded all variables from results.mat\\n');

    % Conservative approach: pause to ensure all variables are fully loaded
    pause(0.5);

    % Get list of all loaded variables in workspace
    allLoadedVars = who;
    fprintf('Total variables loaded: %d\\n', length(allLoadedVars));

    % Try to extract counter_i (actual iterations executed) from workspace
    actualIterations = ${iterations}; % Default fallback
    if exist('counter_i', 'var')
        actualIterations = counter_i;
        fprintf('Found counter_i = %d (actual iterations executed)\\n', counter_i);
    else
        fprintf('counter_i not found, using default iterations = %d\\n', actualIterations);
    end

    % Initialize results structure
    results = struct();
    results.success = true;
    results.components = {};
    results.actualIterations = actualIterations;
    results.maxIterations = ${iterations};

    % Extract data for each component using _tfail variables
    fprintf('Looking for _tfail variables for each component...\\n');

    for i = 1:length(componentNames)
        compName = strtrim(componentNames{i});
        if ~isempty(compName)
            % Look for the corresponding _tfail variable
            tfailVarName = [compName '_tfail'];

            % Check if variable exists in the loaded workspace using ismember
            if ismember(tfailVarName, allLoadedVars)
                % Get failure times array
                failureTimes = eval(tfailVarName);
                
                % Count actual failures (finite values)
                nFailures = sum(isfinite(failureTimes));
                validTimes = failureTimes(isfinite(failureTimes));
                
                % Extract component data
                compData = struct();
                compData.componentId = compName;
                compData.componentName = compName;
                compData.componentType = 'Component';
                compData.nFailures = nFailures;
                compData.reliability = (actualIterations - nFailures) / actualIterations;
                compData.unreliability = nFailures / actualIterations;
                compData.totalIterations = actualIterations;
                compData.timeOfFailureArray = failureTimes;
                
                fprintf(' Processed component: %s (NFailure=%d)\\n', compName, nFailures);
                
                % Calculate CDF from failure times
                timePoints = 0:${timestep}:${missionTime};
                cdfData = zeros(1, length(timePoints));
                
                if ~isempty(validTimes)
                    % CDF calculation for actual failures
                    for t = 1:length(timePoints)
                        cdfData(t) = sum(validTimes <= timePoints(t)) / actualIterations;
                    end
                end
                
                compData.cdfData = struct('time', timePoints, 'probability', cdfData);
                
                % PDF calculation using same timestep as CDF
                pdfTimePoints = 0:${timestep}:${missionTime};
                pdfData = zeros(1, length(pdfTimePoints));
                
                if ~isempty(validTimes)
                    % Count failures in each time bin
                    for i = 1:length(pdfTimePoints)-1
                        binStart = pdfTimePoints(i);
                        binEnd = pdfTimePoints(i+1);
                        failuresInBin = sum(validTimes >= binStart & validTimes < binEnd);
                        pdfData(i) = failuresInBin / (actualIterations * ${timestep});
                    end
                end
                
                compData.pdfData = struct('time', pdfTimePoints, 'density', pdfData);
                
                results.components.(compName) = compData;
            else
                % Component _tfail variable not found, create empty result
                compData = struct();
                compData.componentId = compName;
                compData.componentName = compName;
                compData.componentType = 'Component';
                compData.nFailures = 0;
                compData.reliability = 1.0;
                compData.unreliability = 0.0;
                compData.totalIterations = actualIterations;
                compData.timeOfFailureArray = [];
                compData.cdfData = struct('time', [], 'probability', []);
                compData.pdfData = struct('time', [], 'density', []);
                results.components.(compName) = compData;
                
                fprintf(' Component %s: _tfail variable not found, using defaults\\n', compName);
            end
        end
    end

    % Extract CI_history if available
    fprintf('Looking for CI_history...\\n');
    if exist('CI_history', 'var') && ~isempty(CI_history)
        fprintf('Found CI_history with %d entries\\n', length(CI_history));

        % Convert CI_history struct array to cell array for JSON compatibility
        ciHistoryArray = [];
        for i = 1:length(CI_history)
            ciPoint = struct();
            ciPoint.iteration = CI_history(i).iteration;
            ciPoint.p_failure = CI_history(i).p_failure;
            ciPoint.mean_estimate = CI_history(i).mean_estimate;
            ciPoint.CI_lower = CI_history(i).CI_lower;
            ciPoint.CI_upper = CI_history(i).CI_upper;
            ciPoint.CI_width = CI_history(i).CI_width;
            ciPoint.accepted_error = CI_history(i).accepted_error;
            ciPoint.std_error = CI_history(i).std_error;

            ciHistoryArray = [ciHistoryArray; ciPoint];
        end

        results.ciHistory = ciHistoryArray;
        fprintf('✅ CI_history added to results (%d points)\\n', length(ciHistoryArray));
    else
        fprintf('❌ CI_history not found or empty\\n');
        results.ciHistory = [];
    end

    % Save results as JSON
    jsonStr = jsonencode(results);
    fid = fopen('temp_results.json', 'w');
    fprintf(fid, '%s', jsonStr);
    fclose(fid);
    
    fprintf('✅ Results extracted successfully\\n');
    
catch ME
    fprintf('❌ Error: %s\\n', ME.message);
    results = struct();
    results.success = false;
    results.error = ME.message;
    
    jsonStr = jsonencode(results);
    fid = fopen('temp_results.json', 'w');
    fprintf(fid, '%s', jsonStr);
    fclose(fid);
end
exit;
`;
    
    // Write the MATLAB script
    const scriptPath = path.join(path.dirname(resultsPath), 'extract_results.m');
    const jsonPath = path.join(path.dirname(resultsPath), 'temp_results.json');
    
    fs.writeFileSync(scriptPath, matlabScript);
    console.log(`📝 MATLAB extraction script created: ${scriptPath}`);
    
    // Execute MATLAB script
    const matlabProcess = spawn('matlab', [
      '-batch', 
      `cd('${path.dirname(resultsPath).replace(/\\/g, '/')}'); extract_results`
    ], {
      cwd: path.dirname(resultsPath),
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    matlabProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    matlabProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    matlabProcess.on('close', (code) => {
      if (responseSent) return; // Prevent double responses
      
      console.log(`📊 MATLAB extraction completed with code: ${code}`);
      console.log(`📝 MATLAB output:`, stdout);
      
      if (stderr) console.log(`⚠️ MATLAB stderr:`, stderr);
      
      try {
        // Read the generated JSON file
        if (fs.existsSync(jsonPath)) {
          const jsonData = fs.readFileSync(jsonPath, 'utf8');
          const results = JSON.parse(jsonData);
          
          // Cleanup temporary files (keep extract_results.m for debugging)
          try {
            // Only delete the JSON file, keep extract_results.m for local testing
            fs.unlinkSync(jsonPath);
            console.log(`🧪 extract_results.m kept for debugging: ${scriptPath}`);
          } catch (cleanupError) {
            console.warn('⚠️ Could not clean up temp files:', cleanupError.message);
          }
          
          console.log(`✅ Successfully parsed results for ${Object.keys(results.components).length} components`);
          responseSent = true;
          res.json(results);
        } else {
          throw new Error('JSON results file not created by MATLAB');
        }
      } catch (parseError) {
        console.error('❌ Error parsing results:', parseError);
        responseSent = true;
        res.status(500).json({ 
          success: false, 
          error: `Failed to parse results: ${parseError.message}`,
          matlabOutput: stdout,
          matlabError: stderr
        });
      }
    });
    
    // Handle timeout
    setTimeout(() => {
      if (!matlabProcess.killed && !responseSent) {
        console.log('⏰ MATLAB extraction timeout, killing process');
        matlabProcess.kill('SIGKILL');
        responseSent = true;
        res.status(408).json({ 
          success: false, 
          error: 'MATLAB extraction timeout' 
        });
      }
    }, 600000); // 10 minute timeout - increased for complex simulations
    
  } catch (error) {
    if (!responseSent) {
      console.error('❌ Error setting up results parsing:', error);
      responseSent = true;
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
});

// Get CTMC results for visualization
app.get('/api/ctmc/results', async (req, res) => {
  const { libraryPath } = req.query;
  console.log('📊 CTMC results requested');
  if (libraryPath) {
    console.log(`📁 Library path provided: ${libraryPath}`);
  }
  
  try {
    // Determine the correct results path - always look for results.json
    let resultsDir = null;
    
    if (libraryPath) {
      resultsDir = path.join(libraryPath, 'output');
      console.log(`🎯 Using provided library path: ${libraryPath}`);
    } else if (lastCTMCLibraryPath) {
      resultsDir = path.join(lastCTMCLibraryPath, 'output');
      console.log(`🎯 Using last CTMC execution path: ${lastCTMCLibraryPath}`);
    } else {
      console.log('❌ No CTMC library path available');
      return res.status(404).json({ 
        success: false, 
        error: 'CTMC library path not specified. Please set the library directory in MSolver configuration and run CTMC analysis first.'
      });
    }
    
    const jsonResultsPath = path.join(resultsDir, 'results.json');
    console.log(`🔍 Looking for results.json at: ${jsonResultsPath}`);
    
    // Check if results.json exists
    if (!fs.existsSync(jsonResultsPath)) {
      console.log(`❌ results.json not found at: ${jsonResultsPath}`);
      return res.status(404).json({ 
        success: false, 
        error: `CTMC results.json not found at ${jsonResultsPath}. Please run CTMC analysis first.`,
        expectedPath: jsonResultsPath
      });
    }
    
    console.log(`✅ Found results.json at: ${jsonResultsPath}`);
    
    // Check file modification time
    const stats = fs.statSync(jsonResultsPath);
    const fileAge = Date.now() - stats.mtime.getTime();
    console.log(`📅 File age: ${Math.round(fileAge/60000)} minutes`);
    
    // Read and parse the JSON results
    try {
      console.log(`📄 Reading CTMC results from: ${jsonResultsPath}`);
      const jsonContent = fs.readFileSync(jsonResultsPath, 'utf8');
      const parsedResults = JSON.parse(jsonContent);
      
      console.log(`✅ Parsed JSON results:`, Object.keys(parsedResults));
      
      // Return the results as-is from the JSON file with some additional metadata
      const resultsData = {
        success: true,
        source: 'matlab_json',
        fileAge: Math.round(fileAge / 1000), // seconds
        filePath: jsonResultsPath,
        data: parsedResults  // Return all data from JSON as-is
      };
      
      // Log summary for debugging
      console.log(`📊 CTMC Results Summary:`);
      console.log(`   - States: ${parsedResults.states?.length || 0}`);
      console.log(`   - Solver: ${parsedResults.Solver || 'not specified'}`);
      console.log(`   - Solver method (legacy): ${parsedResults.solverMethod || 'not specified'}`);
      console.log(`   - Result vector: ${parsedResults.result?.length || 0} elements`);
      console.log(`   - Time steps: ${parsedResults.timeSteps?.length || 0}`);
      console.log(`   - Analysis time: ${parsedResults.analysisTime || 'not specified'}`);
      
      res.json(resultsData);
      
    } catch (jsonError) {
      console.error(`❌ Error parsing results.json: ${jsonError.message}`);
      return res.status(500).json({ 
        success: false, 
        error: `Failed to parse results.json: ${jsonError.message}`,
        filePath: jsonResultsPath
      });
    }
    
  } catch (error) {
    console.error('❌ Error reading CTMC results:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read CTMC results: ' + error.message 
    });
  }
});


// Helper function to generate mock CTMC probability data
function generateMockCTMCData(timeSteps, numStates) {
  const matrix = [];
  for (let t = 0; t < timeSteps; t++) {
    const row = [];
    const time = t * 0.1;
    
    for (let s = 0; s < numStates; s++) {
      if (t === 0) {
        // Initial condition: all probability in state 0
        row.push(s === 0 ? 1 : 0);
      } else {
        // Simulate probability evolution
        if (s === 0) {
          // State 0 probability decreases exponentially
          row.push(Math.exp(-time * 0.5));
        } else if (s === numStates - 1) {
          // Last state probability increases (absorbing)
          row.push(1 - Math.exp(-time * 0.3));
        } else {
          // Intermediate states have transient behavior
          const transientProb = (1 - Math.exp(-time * 0.5)) * Math.exp(-time * 0.2) / (numStates - 1);
          row.push(transientProb);
        }
      }
    }
    
    // Normalize probabilities to sum to 1
    const sum = row.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < row.length; i++) {
        row[i] = row[i] / sum;
      }
    }
    
    matrix.push(row);
  }
  return matrix;
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 MATLAB Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Ready to execute MATLAB simulations with real-time logging`);
  console.log(`🔧 Endpoints:`);
  console.log(`   GET /api/health - Health check`);
  console.log(`   POST /api/matlab/execute-stream - Execute MATLAB with SSE streaming`);
  console.log(`   POST /api/matlab/stop - Stop running MATLAB simulation`);
  console.log(`   GET /api/ctmc/results - Get CTMC analysis results`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('📴 Shutting down MATLAB Backend Server...');
  process.exit(0);
});