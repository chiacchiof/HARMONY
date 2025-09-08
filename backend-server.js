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

// Helper function to execute MATLAB simulation
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

// Execute complete SHyFTA simulation with file copying and real-time streaming
app.post('/api/matlab/execute-stream', async (req, res) => {
  const { shyftaPath, modelName, modelContent, zftaContent } = req.body;
  
  console.log(`🚀 Complete SHyFTA simulation requested:`);
  console.log(`   📁 SHyFTA Path: ${shyftaPath}`);
  console.log(`   📄 Model Name: ${modelName}`);
  console.log(`   📝 Model Content: ${modelContent ? modelContent.length + ' chars' : 'missing'}`);
  console.log(`   🔧 ZFTAMain Content: ${zftaContent ? zftaContent.length + ' chars' : 'missing'}`);
  
  if (!shyftaPath || !modelName || !modelContent || !zftaContent) {
    const error = 'Missing required parameters: shyftaPath, modelName, modelContent, zftaContent';
    console.error(`❌ ${error}`);
    return res.status(400).json({ success: false, error });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial status
  res.write(`data: ${JSON.stringify({ 
    success: false, 
    progress: 0, 
    output: 'Inizializzazione simulazione SHyFTA...' 
  })}\n\n`);

  try {
    // Step 1: Verify SHyFTALib directory exists
    if (!fs.existsSync(shyftaPath)) {
      throw new Error(`SHyFTALib directory not found: ${shyftaPath}`);
    }
    console.log(`✅ SHyFTALib directory verified: ${shyftaPath}`);
    
    res.write(`data: ${JSON.stringify({ 
      success: false, 
      progress: 0, 
      output: 'Directory SHyFTALib verificata...' 
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
  const { resultsPath, components, iterations, missionTime, timestep = 1, binCount = 100 } = req.query;
  let responseSent = false; // Flag to prevent double responses
  
  console.log(`📈 Results parsing requested:`);
  console.log(`   📁 Results file: ${resultsPath}`);
  console.log(`   🧩 Components: ${components}`);
  console.log(`   🔄 Iterations: ${iterations}`);
  console.log(`   ⏱️ Mission time: ${missionTime}h`);
  console.log(`   📊 Config: timestep=${timestep}h, bins=${binCount}`);
  
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
    % Load the results file
    load('${resultsPath.replace(/\\/g, '/')}');
    
    % Initialize results structure
    results = struct();
    results.success = true;
    results.components = {};
    
    % Parse component names from query
    componentNames = split('${components}', ',');
    
    % Extract data for each component using _tfail variables
    fprintf('Looking for _tfail variables for each component...\\n');
    
    for i = 1:length(componentNames)
        compName = strtrim(componentNames{i});
        if ~isempty(compName)
            % Look for the corresponding _tfail variable
            tfailVarName = [compName '_tfail'];
            
            if exist(tfailVarName, 'var')
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
                compData.reliability = (${iterations} - nFailures) / ${iterations};
                compData.unreliability = nFailures / ${iterations};
                compData.totalIterations = ${iterations};
                compData.timeOfFailureArray = failureTimes;
                
                fprintf(' Processed component: %s (NFailure=%d)\\n', compName, nFailures);
                
                % Calculate CDF from failure times
                timePoints = 0:${timestep}:${missionTime};
                cdfData = zeros(1, length(timePoints));
                
                if ~isempty(validTimes)
                    % CDF calculation for actual failures
                    for t = 1:length(timePoints)
                        cdfData(t) = sum(validTimes <= timePoints(t)) / ${iterations};
                    end
                end
                
                compData.cdfData = struct('time', timePoints, 'probability', cdfData);
                
                % PDF calculation using histogram
                if ~isempty(validTimes) && length(validTimes) > 1
                    [counts, centers] = hist(validTimes, ${binCount});
                    binWidth = (max(validTimes) - min(validTimes)) / ${binCount};
                    if binWidth > 0
                        densities = counts / (${iterations} * binWidth);
                        compData.pdfData = struct('time', centers, 'density', densities);
                    else
                        compData.pdfData = struct('time', [], 'density', []);
                    end
                else
                    compData.pdfData = struct('time', [], 'density', []);
                end
                
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
                compData.totalIterations = ${iterations};
                compData.timeOfFailureArray = [];
                compData.cdfData = struct('time', [], 'probability', []);
                compData.pdfData = struct('time', [], 'density', []);
                results.components.(compName) = compData;
                
                fprintf(' Component %s: _tfail variable not found, using defaults\\n', compName);
            end
        end
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
          
          // Cleanup temporary files
          try {
            fs.unlinkSync(scriptPath);
            fs.unlinkSync(jsonPath);
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
    }, 30000); // 30 second timeout
    
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

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 MATLAB Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Ready to execute MATLAB simulations with real-time logging`);
  console.log(`🔧 Endpoints:`);
  console.log(`   GET /api/health - Health check`);
  console.log(`   POST /api/matlab/execute-stream - Execute MATLAB with SSE streaming`);
  console.log(`   POST /api/matlab/stop - Stop running MATLAB simulation`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('📴 Shutting down MATLAB Backend Server...');
  process.exit(0);
});