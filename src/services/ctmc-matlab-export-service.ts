import { MarkovChainModel } from '../types/MarkovChain';

export interface CTMCExportOptions {
  timeT: number;
  deltaT?: number;
  solverMethod: 'Transitorio' | 'Uniformizzazione' | 'Stazionario';
  filename?: string;
  libraryDirectory: string;
}

export interface CTMCMatlabFiles {
  modelContent: string;
  solverContent: string;
}

export class CTMCMatlabExportService {
  
  /**
   * Validates that all transitions have exponential distributions
   */
  static validateExponentialTransitions(model: MarkovChainModel): string | null {
    for (const transition of model.transitions) {
      if (transition.probabilityDistribution.type !== 'exponential') {
        return `Transizione ${transition.source} → ${transition.target} non è esponenziale (tipo: ${transition.probabilityDistribution.type}). Solo transizioni esponenziali sono supportate per la risoluzione CTMC.`;
      }
    }
    return null;
  }

  /**
   * Validates that the model has connected states
   */
  static validateConnectedStates(model: MarkovChainModel): string | null {
    if (model.states.length === 0) {
      return 'Il modello non contiene stati.';
    }

    // Check if all states are connected (at least one incoming or outgoing transition)
    const connectedStates = new Set<string>();
    model.transitions.forEach(t => {
      connectedStates.add(t.source);
      connectedStates.add(t.target);
    });

    const disconnectedStates = model.states.filter(s => !connectedStates.has(s.id));
    if (disconnectedStates.length > 0) {
      return `Stati non collegati trovati: ${disconnectedStates.map(s => s.name).join(', ')}. Tutti gli stati devono essere collegati per il solver CTMC.`;
    }

    return null;
  }

  /**
   * Generates the MATLAB states and transitions arrays
   */
  static generateStatesAndTransitions(model: MarkovChainModel): { statesDef: string; transitionsDef: string; stateCount: number } {
    // Sort states by ID for consistent ordering (states = 0:n-1)
    const sortedStates = [...model.states].sort((a, b) => {
      const aId = parseInt(a.id.replace('state-', '')) || 0;
      const bId = parseInt(b.id.replace('state-', '')) || 0;
      return aId - bId;
    });

    const stateCount = sortedStates.length;
    
    // Create state index mapping (MATLAB uses 1-based indexing for matrix indices)
    // But the visual ID should match the MATLAB state number (0-based state space)
    const stateIndexMap = new Map<string, number>();
    sortedStates.forEach((state, index) => {
      stateIndexMap.set(state.id, index + 1); // MATLAB matrix index (1-based)
    });

    // Generate states definition
    const statesDef = `states = 0:${stateCount - 1};`;

    // Generate transitions array [from to rate]
    const transitionLines: string[] = [];
    model.transitions.forEach(transition => {
      const fromIndex = stateIndexMap.get(transition.source);
      const toIndex = stateIndexMap.get(transition.target);
      
      // Extract rate from exponential distribution
      let rate = 1; // Default rate
      if (transition.probabilityDistribution.type === 'exponential') {
        rate = transition.probabilityDistribution.lambda;
      }
      
      if (fromIndex && toIndex) {
        transitionLines.push(`    ${fromIndex}  ${toIndex}  ${rate};   % State ${fromIndex-1} → State ${toIndex-1} with rate ${rate}`);
      }
    });

    const transitionsDef = `transitions = [\n${transitionLines.join('\n')}\n];`;

    return { statesDef, transitionsDef, stateCount };
  }

  /**
   * Generates the complete MATLAB code for CTMC solving
   */
  static generateCTMCMatlabCode(model: MarkovChainModel, options: CTMCExportOptions): string {
    const { statesDef, transitionsDef, stateCount } = this.generateStatesAndTransitions(model);

    // Find initial state or default to first state
    const initialState = model.states.find(s => s.isInitial);
    let initialStateIndex = 0; // Default to state 0
    
    if (initialState) {
      // Extract numeric ID from state ID (e.g., 'state-1' -> 1)
      const stateId = parseInt(initialState.id.replace('state-', ''));
      if (!isNaN(stateId)) {
        initialStateIndex = stateId;
      }
    }

    console.log(`[CTMC] Creating initial distribution for ${stateCount} states, initial state: ${initialStateIndex}`);

    // Create initial distribution vector (all zeros except initial state) 
    // State space is 0-based, so initialStateIndex should be used directly
    const initialDistribution = Array(stateCount).fill(0);
    
    // Ensure the initialStateIndex is within bounds
    if (initialStateIndex >= 0 && initialStateIndex < stateCount) {
      initialDistribution[initialStateIndex] = 1;
    } else {
      // Fallback to first state if index is out of bounds
      initialDistribution[0] = 1;
      console.warn(`[CTMC] Initial state index ${initialStateIndex} out of bounds, using state 0`);
    }
    
    const pi0Def = `pi0 = [${initialDistribution.join(' ')}];`;
    console.log(`[CTMC] Generated pi0: ${pi0Def}`);

    // Generate method-specific code
    let solutionCode = '';
    let resultsCode = '';

    switch (options.solverMethod) {
      case 'Transitorio':
        solutionCode = `
% Time evolution analysis
t = ${options.timeT};
deltaT = ${options.deltaT || 0.1}; % Time step for probability evolution

% Time loop for probability calculation
timeSteps = 0:deltaT:t;
numTimeSteps = length(timeSteps);
numStates = length(states);

% Initialize probability matrix (time x states)
probabilityMatrix = zeros(numTimeSteps, numStates);

% Calculate probability for each time step
fprintf("\\nCalculating probability evolution...\\n");
for i = 1:numTimeSteps
    currentTime = timeSteps(i);
    if currentTime == 0
        % Initial condition
        probabilityMatrix(i, :) = pi0;
    else
        % Solve CTMC for current time
        pi_t = solveCTMC(Q, pi0, currentTime);
        probabilityMatrix(i, :) = pi_t;
    end
    
    % Progress indicator
    if mod(i, 10) == 0 || i == numTimeSteps
        fprintf("Progress: %.1f%% (t=%.2f)\\n", (i/numTimeSteps)*100, currentTime);
    end
end

% Final solution using expm
pi_t_expm = solveCTMC(Q, pi0, t);
result = pi_t_expm;`;
        resultsCode = `fprintf("\\nDistribuzione transitoria a t=%.2f:\\n", t);
fprintf("π(t=%.2f) = %s\\n", t, mat2str(result, 6));
fprintf("Time evolution matrix: %dx%d (time x states)\\n", size(probabilityMatrix, 1), size(probabilityMatrix, 2));`;
        break;

      case 'Uniformizzazione':
        solutionCode = `
% Time evolution analysis using uniformization
t = ${options.timeT};
deltaT = ${options.deltaT || 0.1}; % Time step for probability evolution

% Time loop for probability calculation
timeSteps = 0:deltaT:t;
numTimeSteps = length(timeSteps);
numStates = length(states);

% Initialize probability matrix (time x states)
probabilityMatrix = zeros(numTimeSteps, numStates);

% Calculate probability for each time step
fprintf("\\nCalculating probability evolution (uniformization)...\\n");
for i = 1:numTimeSteps
    currentTime = timeSteps(i);
    if currentTime == 0
        % Initial condition
        probabilityMatrix(i, :) = pi0;
    else
        % Solve CTMC for current time using uniformization
        pi_t = solveCTMC(Q, pi0, currentTime, "method", "uniformization", "tol", 1e-12);
        probabilityMatrix(i, :) = pi_t;
    end
    
    % Progress indicator
    if mod(i, 10) == 0 || i == numTimeSteps
        fprintf("Progress: %.1f%% (t=%.2f)\\n", (i/numTimeSteps)*100, currentTime);
    end
end

% Final solution using uniformization
pi_t_uni = solveCTMC(Q, pi0, t, "method", "uniformization", "tol", 1e-12);
result = pi_t_uni;`;
        resultsCode = `fprintf("\\nDistribuzione transitoria (uniformizzazione) a t=%.2f:\\n", t);
fprintf("π(t=%.2f) = %s\\n", t, mat2str(result, 6));
fprintf("Time evolution matrix: %dx%d (time x states)\\n", size(probabilityMatrix, 1), size(probabilityMatrix, 2));`;
        break;

      case 'Stazionario':
        solutionCode = `
% Distribuzione stazionaria
pi_inf = stationaryPI(Q);
result = pi_inf;`;
        resultsCode = `fprintf("\\nDistribuzione stazionaria:\\n");
fprintf("π(∞) = %s\\n", mat2str(result, 6));`;
        break;
    }

    // Generate complete MATLAB code
    const matlabCode = `%% CTMC Solver - Generated by SHIFTAI
% Modello: ${model.states.length} stati, ${model.transitions.length} transizioni
% Metodo: ${options.solverMethod}
% Tempo: ${options.timeT}

% 1. Definisco lo spazio degli stati
${statesDef}

% 2. Elenco delle transizioni [from to rate]
${transitionsDef}

% 3. Costruisco il generatore Q
Q = buildGenerator(states, transitions);

% 4. Distribuzione iniziale
${pi0Def}

% 5. Risoluzione CTMC
${solutionCode}

% 6. Stampa risultati
${resultsCode}

% 7. Salvataggio risultati
resultsFile = fullfile(pwd, 'output/results.mat');
if exist('probabilityMatrix', 'var')
    save(resultsFile, 'result', 'timeSteps', 'probabilityMatrix', 'Q', 'pi0', 'states', 'transitions', 't', 'deltaT');
    fprintf("\\nRisultati salvati in: %s\\n", resultsFile);
    fprintf("Time evolution matrix: %dx%d (time x states)\\n", size(probabilityMatrix, 1), size(probabilityMatrix, 2));
    
    % Also save as JSON for Node.js parsing
    resultsStruct.timeSteps = timeSteps;
    resultsStruct.probabilityMatrix = probabilityMatrix;
    resultsStruct.result = result;
    resultsStruct.states = states;
    resultsStruct.transitions = transitions;
    resultsStruct.t = t;
    resultsStruct.deltaT = deltaT;
    resultsStruct.analysisTime = datestr(now, 'yyyy-mm-dd HH:MM:SS');
else
    save(resultsFile, 'result', 'Q', 'pi0', 'states', 'transitions');
    fprintf("\\nRisultati salvati in: %s\\n", resultsFile);
    
    % Also save as JSON for Node.js parsing
    resultsStruct.result = result;
    resultsStruct.states = states;
    resultsStruct.transitions = transitions;
    resultsStruct.analysisTime = datestr(now, 'yyyy-mm-dd HH:MM:SS');
end

% Convert to JSON and save
jsonFile = fullfile(pwd, 'output/results.json');
jsonText = jsonencode(resultsStruct);
fid = fopen(jsonFile, 'w');
if fid == -1
    fprintf("Warning: Could not create JSON file\\n");
else
    fprintf(fid, '%s', jsonText);
    fclose(fid);
    fprintf("JSON results saved to: %s\\n", jsonFile);
end
`;

    return matlabCode;
  }

  /**
   * Prepares MATLAB files for backend processing
   */
  static async prepareFilesForBackend(model: MarkovChainModel, options: CTMCExportOptions): Promise<CTMCMatlabFiles> {
    try {
      // Validate exponential transitions
      const exponentialError = this.validateExponentialTransitions(model);
      if (exponentialError) {
        throw new Error(exponentialError);
      }

      // Validate connected states
      const connectivityError = this.validateConnectedStates(model);
      if (connectivityError) {
        throw new Error(connectivityError);
      }

      // Generate model-specific MATLAB code
      const modelContent = this.generateCTMCMatlabCode(model, options);

      // Read the CTMCSolver.m template and copy it
      const response = await fetch('/assets/CTMCSolver.m');
      let solverContent = await response.text();

      // If the solver template is empty or doesn't exist, use our base template
      if (!solverContent.trim()) {
        solverContent = this.generateCTMCMatlabCode(model, options);
      }

      console.log(`CTMC files prepared - Model: ${modelContent.length} chars, Solver: ${solverContent.length} chars`);

      return { modelContent, solverContent };
      
    } catch (error) {
      throw new Error(`Failed to prepare CTMC files for backend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates configuration inputs for CTMC solving
   */
  static validateConfig(options: CTMCExportOptions, model: MarkovChainModel): string | null {
    if (!options.libraryDirectory.trim()) {
      return 'Seleziona una directory libreria valida';
    }
    
    if (options.timeT <= 0) {
      return 'Il tempo t deve essere maggiore di 0';
    }

    if (model.states.length === 0) {
      return 'Il modello CTMC è vuoto';
    }

    // Validate exponential distributions
    const exponentialError = this.validateExponentialTransitions(model);
    if (exponentialError) {
      return exponentialError;
    }

    // Validate connectivity
    const connectivityError = this.validateConnectedStates(model);
    if (connectivityError) {
      return connectivityError;
    }

    return null;
  }

  /**
   * Export CTMC model to MATLAB file (frontend only)
   */
  static async exportToMatlab(model: MarkovChainModel, options: CTMCExportOptions): Promise<void> {
    const matlabCode = this.generateCTMCMatlabCode(model, options);
    const dataBlob = new Blob([matlabCode], { type: 'text/plain' });
    
    // Try to use File System Access API if available
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const defaultName = options.filename || `ctmc-model-${new Date().toISOString().split('T')[0]}.m`;
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'MATLAB Files',
            accept: {
              'text/plain': ['.m']
            }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(dataBlob);
        await writable.close();
        return;
      } catch (error) {
        console.log('File System Access not available or cancelled, using fallback:', error);
      }
    }
    
    // Fallback to traditional download
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename || `ctmc-model-${new Date().toISOString().split('T')[0]}.m`;
    link.click();
    URL.revokeObjectURL(url);
  }
}