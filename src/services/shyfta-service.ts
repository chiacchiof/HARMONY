import { FaultTreeModel } from '../types/FaultTree';
import { MatlabExportService } from './matlab-export-service';
import { MatlabResultsService } from './matlab-results-service';
import { SHyFTAConfig as SHyFTAConfigService } from '../config/shyfta-config';

export interface SHyFTAConfig {
  shyftaLibFolder: string;
  modelName: string;
  iterations: number;
  confidence: number;
  confidenceToggle: boolean;
  missionTime: number;
}

export interface SHyFTAProgress {
  progress: number;
  currentStep: string;
  logOutput: string;
  isRunning: boolean;
  isCompleted?: boolean;
}

export class SHyFTAService {
  private static progressCallback: ((progress: SHyFTAProgress) => void) | null = null;
  private static abortController: AbortController | null = null;
  private static isRunning: boolean = false;

  /**
   * Set the progress callback function
   */
  static setProgressCallback(callback: (progress: SHyFTAProgress) => void) {
    this.progressCallback = callback;
  }

  /**
   * Update progress and notify callback
   */
  private static updateProgress(progress: number, currentStep: string, logOutput: string = '') {
    if (this.progressCallback) {
      this.progressCallback({
        progress,
        currentStep,
        logOutput,
        isRunning: progress < 100, // Set to false when progress is 100%
        isCompleted: progress >= 100
      });
    }
  }

  /**
   * Generate ZFTAMain.m content with placeholders replaced
   */
  static async generateZFTAMainContent(config: SHyFTAConfig): Promise<string> {
    try {
      // Try to fetch the template from public assets
      const response = await fetch('/assets/ZFTAMain.m');
      let template: string;
      
      if (response.ok) {
        template = await response.text();
      } else {
        // Fallback template if file not found
        template = `clear all; %to modify to clear only PROGRAMS variables
addpath(genpath(pwd));
tic
UNVALID_FT = 0; % 0, FT is valid (1 otherwise) This check is performed inside the "initFaultTree" script.

inputFullFileNameRound = fullfile(pwd, '\\src\\func\\zround.m');
outputFullFileNameRound = fullfile(pwd, '\\src\\func\\rround.m');
copyfile (inputFullFileNameRound, outputFullFileNameRound);
clear inputFullFileNameRound outputFullFileNameRound;

%% SIMULATION PARAMETERS
debugMode = false;
iter = <ITER>;
%% STOP CRITERIA PARAMETERS
confidenceLevel = <CONFIDENCE>;
stopCriteriaOn = <TRUEFALSE>;
percentageErrorTollerance = 0.001;
zvalue = norminv(1-((1-confidenceLevel)/2));
err_iter = 0;
muX =  0;
err_i = 0;
err_vect = 0;
TOP_i = 0;
stopCriteriaMet = false;

counter_error = 1;
mu_i = 0;
S_i = 0;
%%
rng('shuffle')
failureTime = zeros(1,iter);

TimeStep = Constants.TIMESTEP;
currentTime = 0;
counter_i = 1;

%% Debug Mode
if debugMode
   debugLogFile = createDebugMode; %return the ID to the debug file
end
%%

<MODEL_NAME>

if (UNVALID_FT)
    return
end

setStopCriteria;

ttfComponents = zeros(counterComponents-1,iter);
while(nextEventTime<Tm) 
    ZFTAevaluateFT;
end
computeUpTime;
updateNFailure;

for counter_i=2:iter
    pct = counter_i/iter*100;               % percentuale completata
    fprintf('\\rAvanzamento: %6.2f%%%%', pct);  % \\r torna a inizio riga e sovrascrive
    drawnow;                        % obbliga l'aggiornamento della Console
    if(~stopCriteriaMet)
        reinit;
        while(nextEventTime<Tm) 
            ZFTAevaluateFT;
        end
        computeUpTime;
        updateNFailure;
        if(stopCriteriaOn)
            verifyStopCriteria; 
        end
       % disp(counter_i);
    else
        toc
        return;
    end
    if(mod(counter_i,100000)==0)
        save('workspace_great');
    end
end
toc`;
      }

      // Replace placeholders
      const modelNameWithoutExt = config.modelName.replace(/\.m$/, '');
      return template
        .replace(/<MODEL_NAME>/g, modelNameWithoutExt)
        .replace(/<ITER>/g, config.iterations.toString())
        .replace(/<CONFIDENCE>/g, config.confidence.toString())
        .replace(/<TRUEFALSE>/g, config.confidenceToggle.toString());
        
    } catch (error) {
      throw new Error(`Failed to generate ZFTAMain.m content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare MATLAB files for backend processing (no frontend file operations)
   */
  static async prepareFilesForBackend(faultTreeModel: FaultTreeModel, config: SHyFTAConfig): Promise<{ modelContent: string; zftaContent: string }> {
    try {
      console.log(`Preparing files for backend processing: ${config.shyftaLibFolder}`);
      
      // Generate MATLAB model code
      const modelContent = await this.generateModelCode(faultTreeModel, config);
      
      // Read the real ZFTAMain.m template from assets and replace placeholders
      const response = await fetch('/assets/ZFTAMain.m');
      let zftaContent = await response.text();
      
      // Replace placeholders with actual values
      const modelNameWithoutExt = config.modelName.replace(/\.m$/, '');
      zftaContent = zftaContent
        .replace(/<MODEL_NAME>/g, modelNameWithoutExt)
        .replace(/<ITER>/g, config.iterations.toString())
        .replace(/<CONFIDENCE>/g, config.confidence.toString())
        .replace(/<TRUEFALSE>/g, config.confidenceToggle.toString());
      
      console.log(`Files prepared for backend - Model: ${modelContent.length} chars, ZFTA: ${zftaContent.length} chars`);
      
      return { modelContent, zftaContent };
      
    } catch (error) {
      throw new Error(`Failed to prepare files for backend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate MATLAB model code using the proper MatlabExportService
   */
  private static async generateModelCode(faultTreeModel: FaultTreeModel, config: SHyFTAConfig): Promise<string> {
    // Use the real MatlabExportService with proper bottom-up ordering and priority handling
    const matlabCode = (MatlabExportService as any).generateMatlabCode(faultTreeModel, {
      missionTime: config.missionTime,
      filename: config.modelName
    });
    
    return matlabCode;
  }




  /**
   * Validate configuration inputs
   */
  static validateConfig(config: SHyFTAConfig, faultTreeModel: FaultTreeModel): string | null {
    if (!config.shyftaLibFolder.trim()) {
      return 'Seleziona una cartella SHyFTALib valida';
    }
    if (!config.modelName.trim()) {
      return 'Inserisci un nome modello valido';
    }
    if (config.iterations <= 0) {
      return 'Il numero di iterazioni deve essere maggiore di 0';
    }
    if (config.confidence <= 0 || config.confidence >= 1) {
      return 'L\'intervallo di confidenza deve essere tra 0 e 1';
    }
    if (faultTreeModel.events.length === 0 && faultTreeModel.gates.length === 0) {
      return 'Il modello di fault tree è vuoto';
    }
    return null;
  }

  /**
   * Simulate clearing output folder
   */
  static async clearOutputFolder(shyftaPath: string): Promise<void> {
    console.log(`Clearing output folder at: ${shyftaPath}/output`);
    return Promise.resolve();
  }

  /**
   * Execute MATLAB command via backend (no frontend file operations)
   */
  static async executeMatlabCommand(shyftaPath: string, faultTreeModel: FaultTreeModel, config: SHyFTAConfig, files: { modelContent: string; zftaContent: string }): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.abortController = new AbortController();
      this.isRunning = true;
      
      try {
        // Start monitoring for results
        this.startSimulationMonitoring(shyftaPath, faultTreeModel, config, files, resolve, reject);
        
      } catch (error) {
        this.isRunning = false;
        this.abortController = null;
        reject(error);
      }
    });
  }

  /**
   * Execute MATLAB via backend API or fallback to manual execution
   */
  static async startSimulationMonitoring(shyftaPath: string, faultTreeModel: FaultTreeModel, config: SHyFTAConfig, files: { modelContent: string; zftaContent: string }, resolve: Function, reject: Function): Promise<void> {
    this.updateProgress(0, '🔧 Controllo backend e avvio MATLAB...', 'Verifico backend e preparo simulazione...');
    
    try {
      // Import the MATLAB execution service
      const { MatlabExecutionService } = await import('./matlab-execution-service');
      
      // Check if backend is available
      const backendAvailable = await MatlabExecutionService.checkBackendAvailability();
      
      if (backendAvailable) {
        this.updateProgress(0, '🚀 Lancio MATLAB via backend...', 'Backend API disponibile - avvio simulazione automatica...');
        
        console.log('📦 Using prepared files for backend execution:');
        console.log(`   Model file: ${config.modelName} (${files.modelContent.length} chars)`);
        console.log(`   ZFTAMain.m: ${files.zftaContent.length} chars`);

        // Execute MATLAB with real-time monitoring via backend
        await MatlabExecutionService.startMatlabWithMonitoring(
          { 
            shyftaPath, 
            modelName: config.modelName,
            modelContent: files.modelContent,
            zftaContent: files.zftaContent
          },
          (progress: number, output: string) => {
            // Real-time progress callback - use actual MATLAB progress
            this.updateProgress(
              progress, // Use real MATLAB progress directly
              `🔄 MATLAB: ${progress.toFixed(2)}%`,
              `Log MATLAB in tempo reale:\n${output}`
            );
            
            console.log(`📊 MATLAB Progress: ${progress.toFixed(2)}%`);
            console.log(`📝 MATLAB Output:`, output);
          }
        );
        
        // Simulation completed via backend - try to load results
        this.updateProgress(100, '✅ Simulazione completata! Caricamento risultati...', 
          'MATLAB terminato automaticamente.\nCaricamento e analisi dei risultati in corso...');
        
        try {
          console.log('🔄 [SHyFTAService] Starting automatic results loading...');
          
          // Get current settings for results processing
          const settings = SHyFTAConfigService.loadSettings();
          console.log(`   ⚙️ Settings: timestep=${settings.resultsTimestep}h, bins=${settings.resultsBinCount}`);
          
          // Try to load results automatically with configured parameters
          const resultsLoaded = await MatlabResultsService.loadResultsAfterSimulation(
            shyftaPath,
            faultTreeModel.events,
            faultTreeModel.gates,
            config.missionTime,
            config.iterations,
            {
              timestep: settings.resultsTimestep,
              binCount: settings.resultsBinCount
            }
          );
          
          if (resultsLoaded) {
            console.log('✅ [SHyFTAService] Results loaded successfully - UI should update now');
            this.updateProgress(100, '🎉 Simulazione completata! Risultati caricati.', 
              'Simulazione completata con successo!\nRisultati di affidabilità ora disponibili sui componenti.\nUsa "Risultati Simulazione" nei dettagli dei componenti per visualizzare PDF/CDF.');
          } else {
            console.log('⚠️ [SHyFTAService] Results loading failed - using fallback message');
            this.updateProgress(100, '✅ Simulazione completata!', 
              'MATLAB terminato automaticamente.\nControlla output/results.mat per i risultati.');
          }
        } catch (error) {
          console.error('❌ [SHyFTAService] Error loading simulation results:', error);
          this.updateProgress(100, '✅ Simulazione completata!', 
            'MATLAB terminato automaticamente.\nControlla output/results.mat per i risultati.');
        }
        
        if (this.progressCallback) {
          this.progressCallback({
            progress: 100,
            currentStep: '🎉 Simulazione SHyFTA completata automaticamente!',
            logOutput: 'Simulazione eseguita dal backend.\nRisultati di affidabilità disponibili sui componenti.\n',
            isRunning: false,
            isCompleted: true
          });
        }
        
        this.isRunning = false;
        this.abortController = null;
        resolve();
        
      } else {
        // Backend not available - report error
        console.error('❌ Backend API non disponibile');
        
        this.isRunning = false;
        this.abortController = null;
        
        const errorMessage = 'Backend non disponibile per eseguire la simulazione MATLAB automaticamente.';
        
        if (this.progressCallback) {
          this.progressCallback({
            progress: 0,
            currentStep: '❌ Backend non disponibile',
            logOutput: `${errorMessage}\n\nPer risolvere:\n1. Avvia il backend: node backend-server.js\n2. Verifica che sia raggiungibile su http://localhost:3001\n3. Riprova la simulazione\n`,
            isRunning: false,
            isCompleted: false
          });
        }
        
        reject(new Error(errorMessage));
      }
      
    } catch (error) {
      console.error('❌ Errore durante esecuzione automatica:', error);
      
      // Stop simulation and report error instead of fallback
      this.isRunning = false;
      this.abortController = null;
      
      if (this.progressCallback) {
        this.progressCallback({
          progress: 0,
          currentStep: '❌ Errore backend',
          logOutput: `Errore durante l'esecuzione via backend:\n${error instanceof Error ? error.message : 'Errore sconosciuto'}\n\nVerifica che:\n1. Il backend sia avviato (node backend-server.js)\n2. Il percorso SHyFTALib sia corretto\n3. MATLAB sia installato e nel PATH\n`,
          isRunning: false,
          isCompleted: false
        });
      }
      
      reject(error);
    }
  }


  /**
   * Check if simulation results exist and complete the process
   */
  private static checkSimulationResults(shyftaPath: string, outputBuffer: string, resolve: Function): void {
    // In a real implementation, check if output/results.mat exists
    // For now, assume success if process completed without error
    
    this.updateProgress(100, '✅ Simulazione completata!', 
      `MATLAB terminato con successo!\n\nOutput completo:\n${outputBuffer}\n\nControlla output/results.mat per i risultati.`);
    
    if (this.progressCallback) {
      this.progressCallback({
        progress: 100,
        currentStep: '🎉 Simulazione SHyFTA completata!',
        logOutput: `Simulazione terminata!\nLog completo MATLAB visibile nella console Node.js\n`,
        isRunning: false
      });
    }
    
    this.isRunning = false;
    this.abortController = null;
    resolve();
  }


  /**
   * Note: Batch file is now handled by the backend - no frontend file operations needed
   */
  static async prepareBatchFileContent(config: SHyFTAConfig): Promise<string> {
    try {
      // Read the template .bat file from assets
      const response = await fetch('/assets/runSHyFTA.bat');
      let batContent = await response.text();
      
      // Replace placeholders with actual values
      const modelNameWithoutExt = config.modelName.replace(/\.m$/, '');
      batContent = batContent
        .replace('set SHYFTA_PATH=C:\\Path\\To\\SHyFTALib', `set SHYFTA_PATH=${config.shyftaLibFolder}`)
        .replace('set MODEL_NAME=ModelName', `set MODEL_NAME=${modelNameWithoutExt}`);
      
      console.log(`Batch file content prepared for backend processing`);
      return batContent;
      
    } catch (error) {
      throw new Error(`Failed to prepare batch file content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run complete SHyFTA simulation
   */
  static async runSimulation(faultTreeModel: FaultTreeModel, config: SHyFTAConfig): Promise<void> {
    try {
      // Step 1: Validate inputs
      const validationError = this.validateConfig(config, faultTreeModel);
      if (validationError) {
        throw new Error(validationError);
      }
      
      this.updateProgress(0, 'Preparazione simulazione...', 'Validazione configurazione e preparazione file...');
      
      // Step 2: Prepare MATLAB files for backend processing
      const { modelContent, zftaContent } = await this.prepareFilesForBackend(faultTreeModel, config);
      
      // Step 3: Clear output folder
      await this.clearOutputFolder(config.shyftaLibFolder);
      
      // Step 4: Execute via backend with prepared files
      await this.executeMatlabCommand(config.shyftaLibFolder, faultTreeModel, config, { modelContent, zftaContent });
      
    } catch (error) {
      this.isRunning = false;
      if (this.progressCallback) {
        this.progressCallback({
          progress: 0,
          currentStep: 'Errore durante la preparazione',
          logOutput: `Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}\n`,
          isRunning: false,
          isCompleted: false
        });
      }
      throw error;
    }
  }

  /**
   * Stop running simulation (with confirmation)
   */
  static async stopSimulation(): Promise<void> {
    if (this.isRunning) {
      try {
        // Try to stop via backend API first
        const { MatlabExecutionService } = await import('./matlab-execution-service');
        const stopped = await MatlabExecutionService.stopMatlabSimulation();
        
        if (stopped) {
          console.log('✅ MATLAB simulation stopped via backend');
        } else {
          console.warn('⚠️ Failed to stop via backend, using fallback');
        }
      } catch (error) {
        console.error('❌ Error stopping MATLAB via backend:', error);
      }
      
      // Also abort the frontend controller
      if (this.abortController) {
        this.abortController.abort();
      }
      
      this.isRunning = false;
      console.log('🛑 Simulation stop requested by user');
      
      // Update progress callback
      if (this.progressCallback) {
        this.progressCallback({
          progress: 0,
          currentStep: '⏹️ Simulazione arrestata dall\'utente',
          logOutput: 'Simulazione interrotta manualmente.\n',
          isRunning: false,
          isCompleted: false
        });
      }
    }
  }

  /**
   * Check if simulation is currently running
   */
  static isSimulationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Reset simulation state (cleanup)
   */
  static resetSimulation(): void {
    if (this.progressCallback) {
      this.progressCallback({
        progress: 0,
        currentStep: 'Pronto per nuova simulazione',
        logOutput: '',
        isRunning: false
      });
    }
  }

  /**
   * Generate default model name
   */
  static generateDefaultModelName(): string {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `initFaultTree_${day}${month}${year}_${hours}:${minutes}:${seconds}.m`;
  }

  /**
   * Parse MATLAB log for progress information
   */
  static parseProgressFromLog(logLine: string): number | null {
    const progressMatch = logLine.match(/Avanzamento:\s*(\d+\.?\d*)%/);
    return progressMatch ? parseFloat(progressMatch[1]) : null;
  }
}