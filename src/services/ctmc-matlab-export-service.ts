import { MarkovChainModel } from '../types/MarkovChain';
import { DistributionType } from '../types/FaultTree';

export interface CTMCExportOptions {
  timeT: number;
  deltaT?: number;
  solverMethod: 'Transitorio' | 'Uniformizzazione' | 'Stazionario';
  simulationEnabled?: boolean;
  iterations?: number;      // Number of Monte Carlo iterations
  confidence?: number;       // Confidence level for simulation (not used yet, for future)
  confidenceToggle?: boolean; // Toggle confidence intervals (not used yet, for future)
  filename?: string;
  libraryDirectory: string;
}

export interface CTMCMatlabFiles {
  modelContent: string;
  solverContent: string;
}

export class CTMCMatlabExportService {
  
  /**
   * Validates that all transitions have appropriate distributions
   * For analytical solvers: only exponential
   * For simulation: exponential, weibull, normal (mapped to lognormal), constant (mapped to deterministic)
   */
  static validateTransitionDistributions(model: MarkovChainModel, simulationEnabled: boolean): string | null {
    if (simulationEnabled) {
      // Simulation supports the current type system: exponential, weibull, normal, constant
      // These will be mapped to MATLAB simulation distributions
      const supportedTypes: DistributionType[] = ['exponential', 'weibull', 'normal', 'constant'];
      for (const transition of model.transitions) {
        if (!supportedTypes.includes(transition.probabilityDistribution.type)) {
          return `Transizione ${transition.source} → ${transition.target} ha distribuzione non supportata: ${transition.probabilityDistribution.type}. Tipi supportati: ${supportedTypes.join(', ')}.`;
        }
      }
      return null;
    } else {
      // Analytical solvers only support exponential
      for (const transition of model.transitions) {
        if (transition.probabilityDistribution.type !== 'exponential') {
          return `Transizione ${transition.source} → ${transition.target} non è esponenziale (tipo: ${transition.probabilityDistribution.type}). Solo transizioni esponenziali sono supportate per la risoluzione CTMC analitica.`;
        }
      }
      return null;
    }
  }

  /**
   * Validates that all transitions have exponential distributions (for backward compatibility)
   */
  static validateExponentialTransitions(model: MarkovChainModel): string | null {
    return this.validateTransitionDistributions(model, false);
  }

  /**
   * Validates that the model has connected states
   */
  static validateConnectedStates(model: MarkovChainModel): string | null {
    if (model.states.length === 0) {
      return 'Il modello non contiene stati.';
    }

    if (model.transitions.length === 0) {
      return 'Il modello non contiene transizioni. Aggiungi almeno una transizione per connettere gli stati.';
    }

    // Check if all states are connected (at least one incoming or outgoing transition)
    const connectedStates = new Set<string>();
    model.transitions.forEach(t => {
      connectedStates.add(t.source);
      connectedStates.add(t.target);
    });

    const disconnectedStates = model.states.filter(s => !connectedStates.has(s.id));
    if (disconnectedStates.length > 0) {
      console.log('🔍 [CTMC Validation] Disconnected states found:', {
        disconnectedStates: disconnectedStates.map(s => ({ id: s.id, name: s.name })),
        allStates: model.states.map(s => ({ id: s.id, name: s.name })),
        allTransitions: model.transitions.map(t => ({ source: t.source, target: t.target }))
      });
      
      return `Stati isolati: ${disconnectedStates.map(s => s.name).join(', ')}. \n\nOgni stato deve avere almeno una transizione in ingresso o in uscita.\n\nSoluzioni:\n• Collega questi stati con nuove transizioni\n• Oppure elimina gli stati non necessari`;
    }

    return null;
  }

  /**
   * Generates the MATLAB transitions cell array for simulation
   */
  static generateSimulationTransitions(model: MarkovChainModel): { transitionsDef: string; stateCount: number } {
    // Sort states by ID for consistent ordering
    const sortedStates = [...model.states].sort((a, b) => {
      const aId = parseInt(a.id.replace('state-', '')) || 0;
      const bId = parseInt(b.id.replace('state-', '')) || 0;
      return aId - bId;
    });

    const stateCount = sortedStates.length;

    // Create state index mapping (MATLAB uses 1-based indexing)
    const stateIndexMap = new Map<string, number>();
    sortedStates.forEach((state, index) => {
      stateIndexMap.set(state.id, index + 1);
    });

    // Initialize transitions cell array
    const transitionLines: string[] = [];
    transitionLines.push(`% Initialize transitions cell array`);
    transitionLines.push(`numStates = ${stateCount};`);
    transitionLines.push(`transitions = cell(numStates, numStates);`);
    transitionLines.push(``);

    // Fill in transitions with distribution information
    model.transitions.forEach(transition => {
      const fromIndex = stateIndexMap.get(transition.source);
      const toIndex = stateIndexMap.get(transition.target);

      if (fromIndex && toIndex) {
        const dist = transition.probabilityDistribution;
        let distType = '';
        let params = '';

        // Map distribution type to MATLAB format
        // Frontend types: exponential, weibull, normal, constant
        // MATLAB simulation types: exp, weibull, lognormal, deterministic
        switch (dist.type) {
          case 'exponential':
            distType = 'exp';
            params = `[${dist.lambda}]`;
            break;
          case 'weibull':
            // WeibullDistribution has k (shape), lambda (scale), mu (location)
            // MATLAB weibull expects [shape, scale]
            distType = 'weibull';
            params = `[${dist.k}, ${dist.lambda}]`; // shape, scale
            break;
          case 'normal':
            // Map normal to lognormal for simulation
            // NormalDistribution has mu (mean), sigma (std dev)
            // MATLAB lognormal expects [mu, sigma]
            distType = 'lognormal';
            params = `[${dist.mu}, ${dist.sigma}]`; // mu, sigma
            break;
          case 'constant':
            // Map constant probability to deterministic time
            // ConstantDistribution has probability
            // Use a fixed time value of 1.0 (can be adjusted)
            distType = 'deterministic';
            params = `[1.0]`; // fixed time value
            break;
          default:
            // Fallback to exponential with lambda=1
            distType = 'exp';
            params = `[1]`;
        }

        transitionLines.push(`transitions{${fromIndex}, ${toIndex}}.type = '${distType}';`);
        transitionLines.push(`transitions{${fromIndex}, ${toIndex}}.params = ${params};`);
        transitionLines.push(``);
      }
    });

    const transitionsDef = transitionLines.join('\n');
    return { transitionsDef, stateCount };
  }

  /**
   * Generates the MATLAB states and transitions arrays (for analytical solvers)
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
   * Generates MATLAB code for Monte Carlo simulation
   */
  static generateSimulationMatlabCode(model: MarkovChainModel, options: CTMCExportOptions): string {
    const { transitionsDef, stateCount } = this.generateSimulationTransitions(model);

    // Find initial state or default to first state
    const initialState = model.states.find(s => s.isInitial);
    let initialStateIndex = 0; // Default to state 0

    if (initialState) {
      const stateId = parseInt(initialState.id.replace('state-', ''));
      if (!isNaN(stateId)) {
        initialStateIndex = stateId;
      }
    }

    // Create initial distribution vector
    const initialDistribution = Array(stateCount).fill(0);
    if (initialStateIndex >= 0 && initialStateIndex < stateCount) {
      initialDistribution[initialStateIndex] = 1;
    } else {
      initialDistribution[0] = 1;
      console.warn(`[CTMC Simulation] Initial state index ${initialStateIndex} out of bounds, using state 0`);
    }

    const pi0Def = `pi0 = [${initialDistribution.join(' ')}];`;

    // Simulation parameters
    const T = options.timeT;
    const N = options.iterations || 1000;
    const deltaT = options.deltaT || 0.1;

    // Generate complete MATLAB simulation code
    const matlabCode = `%% CTMC Simulation Solver - Generated by SHIFTAI
% Modello: ${model.states.length} stati, ${model.transitions.length} transizioni
% Metodo: Monte Carlo Simulation
% Tempo: ${T}, Iterazioni: ${N}

% 1. Definizione delle transizioni con distribuzioni generiche
${transitionsDef}

% 2. Distribuzione iniziale
${pi0Def}

% 3. Parametri di simulazione
T = ${T};           % Tempo finale
N = ${N};           % Numero di iterazioni Monte Carlo
deltaT = ${deltaT};  % Granularità temporale

% 4. Esecuzione della simulazione Monte Carlo
fprintf("\\n=== Simulazione Monte Carlo CTMC ===\\n");
fprintf("Tempo finale: %.2f\\n", T);
fprintf("Iterazioni: %d\\n", N);
fprintf("Time step: %.4f\\n\\n", deltaT);

[pi_T, timeSteps, probabilityMatrix] = CTMCSimSolver(transitions, pi0, T, N, deltaT);

% 5. Risultati finali
fprintf("\\n=== Risultati Finali ===\\n");
fprintf("Distribuzione al tempo T=%.2f:\\n", T);
fprintf("π(T) = %s\\n", mat2str(pi_T, 6));

% 6. Salvataggio risultati
% Create results structure
result = pi_T;
states = 0:${stateCount-1};
Q = []; % Not available for simulation mode

% Save to MAT file
resultsFile = fullfile(pwd, 'output', 'results.mat');
if exist('probabilityMatrix', 'var') && exist('timeSteps', 'var')
    save(resultsFile, 'result', 'timeSteps', 'probabilityMatrix', 'Q', 'pi0', 'states', 'transitions', 'T', 'deltaT');
else
    save(resultsFile, 'result', 'Q', 'pi0', 'states', 'transitions', 'T');
end
fprintf("\\nRisultati salvati in: %s\\n", resultsFile);

% Save as JSON for Node.js parsing
resultsStruct.result = result;
resultsStruct.states = states;
resultsStruct.transitions = transitions;
if exist('probabilityMatrix', 'var') && exist('timeSteps', 'var')
    resultsStruct.timeSteps = timeSteps;
    resultsStruct.probabilityMatrix = probabilityMatrix;
end
resultsStruct.t = T;
resultsStruct.deltaT = deltaT;
resultsStruct.Solver = 'Simulation';
resultsStruct.analysisTime = datestr(now, 'yyyy-mm-dd HH:MM:SS');

jsonFile = fullfile(pwd, 'output', 'results.json');
jsonText = jsonencode(resultsStruct);
fid = fopen(jsonFile, 'w');
if fid == -1
    fprintf("Warning: Could not create JSON file\\n");
else
    fprintf(fid, '%s', jsonText);
    fclose(fid);
    fprintf("JSON results saved to: %s\\n", jsonFile);
end

fprintf("\\nSimulazione completata!\\n");
fprintf("SIMULATION_COMPLETED\\n");
`;

    return matlabCode;
  }

  /**
   * Generates the complete MATLAB code for CTMC solving
   */
  static generateCTMCMatlabCode(model: MarkovChainModel, options: CTMCExportOptions): string {
    // Check if simulation mode is enabled
    if (options.simulationEnabled) {
      return this.generateSimulationMatlabCode(model, options);
    }

    // Otherwise, generate analytical solver code
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

    // Determine the solver method name based on simulation flag and solver method
    let solverName = '';
    if (options.simulationEnabled) {
      solverName = 'Simulation';
    } else {
      switch (options.solverMethod) {
        case 'Transitorio':
          solverName = 'Transitorio';
          break;
        case 'Uniformizzazione':
          solverName = 'Uniformized';
          break;
        case 'Stazionario':
          solverName = 'Stazionario';
          break;
      }
    }

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
resultsFile = fullfile(pwd, 'output', 'results.mat');
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
    resultsStruct.Solver = '${solverName}';
    resultsStruct.analysisTime = datestr(now, 'yyyy-mm-dd HH:MM:SS');
else
    save(resultsFile, 'result', 'Q', 'pi0', 'states', 'transitions');
    fprintf("\\nRisultati salvati in: %s\\n", resultsFile);
    
    % Also save as JSON for Node.js parsing
    resultsStruct.result = result;
    resultsStruct.states = states;
    resultsStruct.transitions = transitions;
    resultsStruct.Solver = '${solverName}';
    resultsStruct.analysisTime = datestr(now, 'yyyy-mm-dd HH:MM:SS');
end

% Convert to JSON and save
jsonFile = fullfile(pwd, 'output', 'results.json');
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
      console.log('🔍 [CTMC Export] Starting prepareFilesForBackend with model:', {
        states: model.states.length,
        transitions: model.transitions.length,
        options
      });
      
      // Validate transitions (exponential for analytical, any supported for simulation)
      console.log(`🔍 [CTMC Export] Validating transitions (simulation=${options.simulationEnabled})...`);
      const transitionError = this.validateTransitionDistributions(model, options.simulationEnabled || false);
      if (transitionError) {
        console.error('❌ [CTMC Export] Transition validation failed:', transitionError);
        throw new Error(transitionError);
      }
      console.log('✅ [CTMC Export] Transitions validated');

      // Validate connected states
      console.log('🔍 [CTMC Export] Validating connected states...');
      const connectivityError = this.validateConnectedStates(model);
      if (connectivityError) {
        console.error('❌ [CTMC Export] Connectivity validation failed:', connectivityError);
        throw new Error(connectivityError);
      }
      console.log('✅ [CTMC Export] Connected states validated');

      // Generate model-specific MATLAB code
      console.log('🔍 [CTMC Export] Generating MATLAB code...');
      const modelContent = this.generateCTMCMatlabCode(model, options);
      console.log(`✅ [CTMC Export] MATLAB code generated: ${modelContent.length} chars`);

      // Read the CTMCSolver.m template and copy it
      console.log('🔍 [CTMC Export] Fetching CTMCSolver.m template...');
      const response = await fetch('/assets/CTMCSolver.m');
      if (!response.ok) {
        console.error('❌ [CTMC Export] Failed to fetch CTMCSolver.m:', response.status, response.statusText);
        throw new Error(`Failed to fetch CTMCSolver.m template: ${response.status} ${response.statusText}`);
      }
      
      let solverContent = await response.text();
      console.log(`✅ [CTMC Export] CTMCSolver.m template fetched: ${solverContent.length} chars`);

      // If the solver template is empty or doesn't exist, use our base template
      if (!solverContent.trim()) {
        console.log('⚠️ [CTMC Export] Template is empty, using generated code as fallback');
        solverContent = this.generateCTMCMatlabCode(model, options);
      }

      console.log(`✅ [CTMC Export] CTMC files prepared - Model: ${modelContent.length} chars, Solver: ${solverContent.length} chars`);

      return { modelContent, solverContent };
      
    } catch (error) {
      console.error('❌ [CTMC Export] prepareFilesForBackend failed:', error);
      console.error('❌ [CTMC Export] Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        model: {
          states: model.states.length,
          transitions: model.transitions.length
        },
        options
      });
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

    // Validate transitions based on simulation mode
    const transitionError = this.validateTransitionDistributions(model, options.simulationEnabled || false);
    if (transitionError) {
      return transitionError;
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