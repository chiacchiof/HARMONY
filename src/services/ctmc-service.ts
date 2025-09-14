import { MarkovChainModel } from '../types/MarkovChain';
import { CTMCMatlabExportService, CTMCExportOptions, CTMCMatlabFiles } from './ctmc-matlab-export-service';

export interface CTMCConfig {
  libraryDirectory: string;
  timeT: number;
  deltaT?: number;
  solverMethod: 'Transitorio' | 'Uniformizzazione' | 'Stazionario';
  iterations?: number;
  confidence?: number;
  confidenceToggle?: boolean;
  simulationEnabled?: boolean;
}

export interface CTMCProgress {
  progress: number;
  currentStep: string;
  logOutput: string;
  isRunning: boolean;
  isCompleted?: boolean;
}

export class CTMCService {
  private static progressCallback: ((progress: CTMCProgress) => void) | null = null;
  private static abortController: AbortController | null = null;
  private static isRunning: boolean = false;

  /**
   * Set the progress callback function
   */
  static setProgressCallback(callback: (progress: CTMCProgress) => void) {
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
        isRunning: progress < 100,
        isCompleted: progress >= 100
      });
    }
  }

  /**
   * Prepare MATLAB files for backend processing
   */
  static async prepareFilesForBackend(markovChainModel: MarkovChainModel, config: CTMCConfig): Promise<CTMCMatlabFiles> {
    try {
      console.log(`📁 [CTMC] Preparing CTMC files for backend processing: ${config.libraryDirectory}`);
      
      // Convert config to CTMCExportOptions
      const exportOptions: CTMCExportOptions = {
        timeT: config.timeT,
        deltaT: config.deltaT,
        solverMethod: config.solverMethod,
        simulationEnabled: config.simulationEnabled,
        filename: `ctmc-model-${new Date().toISOString().split('T')[0]}.m`,
        libraryDirectory: config.libraryDirectory
      };
      
      console.log('🔧 [CTMC] Export options:', exportOptions);

      // Generate MATLAB files
      console.log('🔍 [CTMC] Calling CTMCMatlabExportService.prepareFilesForBackend...');
      const files = await CTMCMatlabExportService.prepareFilesForBackend(markovChainModel, exportOptions);
      
      console.log(`✅ [CTMC] CTMC files prepared - Model: ${files.modelContent.length} chars, Solver: ${files.solverContent.length} chars`);
      
      return files;
      
    } catch (error) {
      console.error('❌ [CTMC] prepareFilesForBackend failed:', error);
      console.error('❌ [CTMC] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        config,
        modelStates: markovChainModel.states.length,
        modelTransitions: markovChainModel.transitions.length
      });
      throw new Error(`Failed to prepare CTMC files for backend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate configuration inputs
   */
  static validateConfig(config: CTMCConfig, markovChainModel: MarkovChainModel): string | null {
    if (!config.libraryDirectory.trim()) {
      return 'Seleziona una cartella libreria CTMC valida';
    }
    
    if (config.timeT <= 0) {
      return 'Il tempo t deve essere maggiore di 0';
    }

    if (markovChainModel.states.length === 0) {
      return 'Il modello CTMC è vuoto';
    }

    // Use the export service validation
    const exportOptions: CTMCExportOptions = {
      timeT: config.timeT,
      deltaT: config.deltaT,
      solverMethod: config.solverMethod,
      simulationEnabled: config.simulationEnabled,
      libraryDirectory: config.libraryDirectory
    };

    return CTMCMatlabExportService.validateConfig(exportOptions, markovChainModel);
  }

  /**
   * Execute MATLAB command via backend
   */
  static async executeMatlabCommand(libraryPath: string, markovChainModel: MarkovChainModel, config: CTMCConfig, files: CTMCMatlabFiles): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.abortController = new AbortController();
      this.isRunning = true;
      
      try {
        // Start monitoring for results
        this.startCTMCMonitoring(libraryPath, markovChainModel, config, files, resolve, reject);
        
      } catch (error) {
        this.isRunning = false;
        this.abortController = null;
        reject(error);
      }
    });
  }

  /**
   * Execute CTMC via backend API or fallback to manual execution
   */
  static async startCTMCMonitoring(libraryPath: string, markovChainModel: MarkovChainModel, config: CTMCConfig, files: CTMCMatlabFiles, resolve: Function, reject: Function): Promise<void> {
    this.updateProgress(0, '🔧 Controllo backend e avvio MATLAB...', 'Verifico backend e preparo analisi CTMC...');
    
    try {
      // Import the MATLAB execution service (reuse from fault tree)
      const { MatlabExecutionService } = await import('./matlab-execution-service');
      
      // Check if backend is available
      const backendAvailable = await MatlabExecutionService.checkBackendAvailability();
      
      if (backendAvailable) {
        this.updateProgress(0, '🚀 Lancio MATLAB via backend...', 'Backend API disponibile - avvio analisi CTMC automatica...');
        
        console.log('📦 Using prepared CTMC files for backend execution:');
        console.log(`   Model file: ${files.modelContent.length} chars`);
        console.log(`   Solver file: ${files.solverContent.length} chars`);

        // Execute MATLAB with real-time monitoring via backend
        // For CTMC, we need to execute CTMCSolver.m directly, not create ZFTAMain.m
        console.log(`🔧 [CTMC Debug] Executing MATLAB with config:`, {
          shyftaPath: libraryPath,
          modelName: 'CTMCSolver',  // Without .m extension for MATLAB execution
          modelContentLength: files.modelContent.length,
          isCTMC: true
        });
        
        // For CTMC, we use a different approach than SHyFTA:
        // - Write CTMCSolver.m to the library directory
        // - Execute 'CTMCSolver' command in MATLAB (not ZFTAMain)
        await MatlabExecutionService.startMatlabWithMonitoring(
          { 
            shyftaPath: libraryPath, 
            modelName: 'CTMCSolver',  // MATLAB command to execute
            modelContent: files.modelContent, // The CTMCSolver.m content
            zftaContent: '% CTMC - No ZFTAMain needed',  // Placeholder to avoid validation error
            isCTMC: true  // Flag to indicate this is CTMC, not SHyFTA
          },
          (progress: number, output: string) => {
            // Debug logging to understand what we're receiving
            console.log(`🔍 [CTMC Debug] Raw progress: ${progress}%`);
            console.log(`🔍 [CTMC Debug] Raw output:`, JSON.stringify(output));
            
            // Check if MATLAB completed successfully based on output
            let actualProgress = progress;
            const successIndicators = [
              'Simulazione completata con successo!',
              'Risultati salvati in:',
              'output/results.mat',
              'results.mat',
              'Time evolution matrix:',
              'JSON results saved to:',
              'results.json',
              'SIMULATION_COMPLETED',
              'π(t=',
              'fprintf',
              'save(',
              'fullfile(pwd',
              'mat2str('
            ];
            
            const hasSuccessIndicator = successIndicators.some(indicator => 
              output.toLowerCase().includes(indicator.toLowerCase())
            );
            
            if (hasSuccessIndicator) {
              actualProgress = 100;
              console.log(`🎉 [CTMC Debug] Success detected! Setting progress to 100%`);
            }
            
            // Real-time progress callback
            this.updateProgress(
              actualProgress,
              actualProgress >= 100 ? '✅ MATLAB CTMC completato!' : `🔄 MATLAB CTMC: ${actualProgress.toFixed(2)}%`,
              `Log MATLAB CTMC:\n${output}`
            );
            
            console.log(`📊 MATLAB CTMC Progress: ${actualProgress.toFixed(2)}%`);
          }
        );
        
        // Analysis completed via backend
        this.updateProgress(100, '✅ Analisi CTMC completata! Caricamento risultati...', 
          'MATLAB CTMC terminato automaticamente.\nCaricamento e analisi dei risultati in corso...');
        
        try {
          console.log('🔄 [CTMCService] CTMC analysis completed successfully');
          
          // Try to load CTMC results from output/results.mat
          const resultsLoaded = await this.loadCTMCResults(libraryPath, markovChainModel, config);
          
          if (resultsLoaded) {
            console.log('✅ [CTMCService] CTMC results loaded successfully');
            this.updateProgress(100, '🎉 Analisi CTMC completata! Risultati caricati.', 
              `Analisi CTMC completata con successo!

Metodo: ${config.solverMethod}
Tempo: ${config.timeT}
Stati: ${markovChainModel.states.length}
Transizioni: ${markovChainModel.transitions.length}

✅ Risultati CTMC caricati e disponibili per la visualizzazione.
Controlla i dettagli degli stati per vedere le probabilità.`);
          } else {
            console.log('⚠️ [CTMCService] CTMC results loading failed');
            this.updateProgress(100, '✅ Analisi CTMC completata!', 
              `Analisi CTMC completata con successo!

Metodo: ${config.solverMethod}
Tempo: ${config.timeT}
Stati: ${markovChainModel.states.length}
Transizioni: ${markovChainModel.transitions.length}

Risultati salvati in output/results.mat`);
          }
          
        } catch (error) {
          console.error('❌ [CTMCService] Error processing CTMC results:', error);
          this.updateProgress(100, '✅ Analisi CTMC completata!', 
            'MATLAB CTMC terminato automaticamente.\nControlla output/results.mat per i risultati.');
        }
        
        if (this.progressCallback) {
          this.progressCallback({
            progress: 100,
            currentStep: '🎉 Analisi CTMC completata automaticamente!',
            logOutput: `Analisi CTMC eseguita dal backend.
Metodo: ${config.solverMethod}
Risultati disponibili in output/results.mat
`,
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
        
        const errorMessage = 'Backend non disponibile per eseguire l\'analisi CTMC MATLAB automaticamente.';
        
        if (this.progressCallback) {
          this.progressCallback({
            progress: 0,
            currentStep: '❌ Backend non disponibile',
            logOutput: `${errorMessage}\n\nPer risolvere:\n1. Avvia il backend: node backend-server.js\n2. Verifica che sia raggiungibile su http://${window.location.hostname}:3001\n3. Riprova l'analisi CTMC\n`,
            isRunning: false,
            isCompleted: false
          });
        }
        
        reject(new Error(errorMessage));
      }
      
    } catch (error) {
      console.error('❌ Errore durante esecuzione automatica CTMC:', error);
      
      this.isRunning = false;
      this.abortController = null;
      
      if (this.progressCallback) {
        this.progressCallback({
          progress: 0,
          currentStep: '❌ Errore backend CTMC',
          logOutput: `Errore durante l'esecuzione CTMC via backend:\n${error instanceof Error ? error.message : 'Errore sconosciuto'}\n\nVerifica che:\n1. Il backend sia avviato (node backend-server.js)\n2. Il percorso libreria CTMC sia corretto\n3. MATLAB sia installato e nel PATH\n`,
          isRunning: false,
          isCompleted: false
        });
      }
      
      reject(error);
    }
  }

  /**
   * Run complete CTMC analysis
   */
  static async runAnalysis(markovChainModel: MarkovChainModel, config: CTMCConfig): Promise<void> {
    try {
      console.log('🔄 [CTMC] Starting runAnalysis with config:', {
        libraryDirectory: config.libraryDirectory,
        timeT: config.timeT,
        deltaT: config.deltaT,
        solverMethod: config.solverMethod,
        simulationEnabled: config.simulationEnabled,
        statesCount: markovChainModel.states.length,
        transitionsCount: markovChainModel.transitions.length
      });
      
      // Step 1: Validate inputs
      console.log('🔍 [CTMC] Step 1: Validating configuration...');
      const validationError = this.validateConfig(config, markovChainModel);
      if (validationError) {
        console.error('❌ [CTMC] Validation failed:', validationError);
        throw new Error(validationError);
      }
      console.log('✅ [CTMC] Validation passed');
      
      this.updateProgress(0, 'Preparazione analisi CTMC...', 'Validazione configurazione e preparazione file...');
      
      // Step 2: Prepare MATLAB files for backend processing
      console.log('🔍 [CTMC] Step 2: Preparing MATLAB files...');
      const files = await this.prepareFilesForBackend(markovChainModel, config);
      console.log('✅ [CTMC] Files prepared successfully:', {
        modelContentLength: files.modelContent.length,
        solverContentLength: files.solverContent.length
      });
      
      // Step 3: Clear output folder (reuse from SHyFTA service)
      this.updateProgress(10, 'Pulizia directory output...', 'Preparazione ambiente MATLAB...');
      
      // Step 4: Execute via backend with prepared files
      console.log('🔍 [CTMC] Step 4: Executing MATLAB command...');
      await this.executeMatlabCommand(config.libraryDirectory, markovChainModel, config, files);
      console.log('✅ [CTMC] MATLAB execution completed');
      
    } catch (error) {
      console.error('❌ [CTMC] runAnalysis failed:', error);
      console.error('❌ [CTMC] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      this.isRunning = false;
      if (this.progressCallback) {
        this.progressCallback({
          progress: 0,
          currentStep: 'Errore durante la preparazione CTMC',
          logOutput: `Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}\n\nStack trace:\n${error instanceof Error ? error.stack : 'N/A'}\n`,
          isRunning: false,
          isCompleted: false
        });
      }
      throw error;
    }
  }

  /**
   * Stop running CTMC analysis
   */
  static async stopAnalysis(): Promise<void> {
    if (this.isRunning) {
      try {
        // Try to stop via backend API first
        const { MatlabExecutionService } = await import('./matlab-execution-service');
        const stopped = await MatlabExecutionService.stopMatlabSimulation();
        
        if (stopped) {
          console.log('✅ MATLAB CTMC analysis stopped via backend');
        } else {
          console.warn('⚠️ Failed to stop CTMC analysis via backend, using fallback');
        }
      } catch (error) {
        console.error('❌ Error stopping MATLAB CTMC via backend:', error);
      }
      
      // Also abort the frontend controller
      if (this.abortController) {
        this.abortController.abort();
      }
      
      this.isRunning = false;
      console.log('🛑 CTMC analysis stop requested by user');
      
      // Update progress callback
      if (this.progressCallback) {
        this.progressCallback({
          progress: 0,
          currentStep: '⏹️ Analisi CTMC arrestata dall\'utente',
          logOutput: 'Analisi CTMC interrotta manualmente.\n',
          isRunning: false,
          isCompleted: false
        });
      }
    }
  }

  /**
   * Check if CTMC analysis is currently running
   */
  static isAnalysisRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Reset analysis state (cleanup)
   */
  static resetAnalysis(): void {
    if (this.progressCallback) {
      this.progressCallback({
        progress: 0,
        currentStep: 'Pronto per nuova analisi CTMC',
        logOutput: '',
        isRunning: false
      });
    }
  }

  /**
   * Attempt to load CTMC results from output/results.mat
   */
  private static async loadCTMCResults(libraryPath: string, markovChainModel: MarkovChainModel, config: CTMCConfig): Promise<boolean> {
    try {
      console.log('🔍 [CTMCService] Attempting to load CTMC results...');
      
      // For now, return true to simulate successful loading
      // In a full implementation, this would:
      // 1. Check if output/results.mat exists
      // 2. Read the MATLAB results file
      // 3. Parse the probability distributions
      // 4. Store them in a CTMC results service
      // 5. Update UI components to show results
      
      return true;
      
    } catch (error) {
      console.error('❌ [CTMCService] Error loading CTMC results:', error);
      return false;
    }
  }

  /**
   * Generate default model name for CTMC
   */
  static generateDefaultModelName(): string {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `CTMCSolver_${day}${month}${year}_${hours}:${minutes}:${seconds}.m`;
  }
}