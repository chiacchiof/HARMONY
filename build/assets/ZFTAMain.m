clear all; %to modify to clear only PROGRAMS variables
addpath(genpath(pwd));
tic
UNVALID_FT = 0; % 0, FT is valid (1 otherwise) This check is performed inside the "initFaultTree" script.

inputFullFileNameRound = fullfile(pwd, '\src\func\zround.m');
outputFullFileNameRound = fullfile(pwd, '\src\func\rround.m');
copyfile (inputFullFileNameRound, outputFullFileNameRound);
clear inputFullFileNameRound outputFullFileNameRound;

%% SIMULATION PARAMETERS
debugMode = false;
iter = <ITER>;

%% STOP CRITERIA PARAMETERS
confidenceLevel = <CONFIDENCE>;
stopCriteriaOn = <TRUEFALSE>;
percentageErrorTollerance = <PERC_ERR_TOLERANCE>;
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

%% =====================================================
%% PARAMETRI AVANZATI CONVERGENZA - ESPERTI ONLY
%% =====================================================

%% CONFIDENCE INTERVAL STOPPING CRITERIA PARAMETERS
% Tutti i parametri per le stopping rules basate su intervalli di confidenza

% Parametri per la robustezza del criterio di stop (OTTIMIZZATI PER TASSI BASSI)
min_iterations_for_CI = <min_iterations_for_CI>;              % Iterazioni minime prima controlli CI (↑ per tassi bassi)
max_iterations_for_robustness = <max_iterations_for_robustness>;   % Limite massimo iterazioni (sicurezza anti-loop)

% Parametri per controlli di stabilità e convergenza (OTTIMIZZATI PER TASSI BASSI)
stability_check_window = <stability_check_window>;               % Finestra stabilità stime (↑=più robusto, ↓=più veloce)
stability_threshold = <stability_threshold>;                 % Soglia stabilità (↓=più stringente, ↑=più tollerante)
convergence_check_window = <convergence_check_window>;             % Finestra convergenza CI (↑=più robusto, ↓=più veloce)  
convergence_threshold = <convergence_threshold>;              % Soglia convergenza CI (↓=più stringente, ↑=più tollerante)

% GUIDA RAPIDA PER MODIFICHE:
% Per RISULTATI PIÙ VELOCI: ↑ thresholds (0.15, 0.2), ↓ windows (30, 15)
% Per RISULTATI PIÙ ROBUSTI: ↓ thresholds (0.05, 0.1), ↑ windows (100, 30)
% Per TASSI MOLTO BASSI (<0.001): ↑ min_iterations_for_CI (2000-5000)

% Inizializzazione delle variabili per algoritmo di Welford
mu_failure = 0;                            % Media della probabilità di failure
M2_failure = 0;                            % Somma dei quadrati delle deviazioni (per varianza)
failure_estimates = [];                    % Array delle stime di probabilità

% Inizializzazione delle strutture per il monitoraggio
CI_stats = struct();                       % Statistiche correnti intervallo di confidenza
% CI_history verrà inizializzato dinamicamente alla prima aggiunta

% Flag per il controllo del debug
CI_debug_mode = false;                     % Abilita output dettagliato per debugging

% Messaggio di conferma per debug
if debugMode
    fprintf('Confidence Interval Stopping Criteria initialized with:\n');
    fprintf('  Confidence Level: %.1f%%\n', confidenceLevel*100);
    fprintf('  Error Tolerance: %.1f%%\n', percentageErrorTollerance*100);
    fprintf('  Min iterations for CI: %d\n', min_iterations_for_CI);
    fprintf('  Max iterations: %d\n', max_iterations_for_robustness);
    fprintf('  Stability window: %d iterations\n', stability_check_window);
    fprintf('  Convergence window: %d iterations\n', convergence_check_window);
    fprintf('  Stability threshold: %.2f\n', stability_threshold);
    fprintf('  Convergence threshold: %.2f\n', convergence_threshold);
end

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

% Variabile per tracciare il motivo di uscita
exit_reason = 'max_iterations';  % Default: tutte le iterazioni completate

for counter_i=2:iter
    pct = counter_i/iter*100;               % percentuale completata
    fprintf('\rAvanzamento: %6.2f%%%%', pct);  % \r torna a inizio riga e sovrascrive
    drawnow;                        % obbliga l’aggiornamento della Console
    if(~stopCriteriaMet)
        reinit;
        while(nextEventTime<Tm) 
            ZFTAevaluateFT;
        end
        computeUpTime;
        updateNFailure;
        if(stopCriteriaOn)
            verifyStopCriteriaConfidenceInterval; 
        end
       % disp(counter_i);
    else
        exit_reason = 'convergence';
        break;
    end
     % Salvataggio periodico del workspace
    if(mod(counter_i,100000)==0)
        save('workspace_great');
        if debugMode
            fprintf('Workspace salvato all''iterazione %d\n', counter_i);
        end
    end
end

%% =====================================================
%% SALVATAGGIO FINALE UNIFICATO - SEMPRE ESEGUITO
%% =====================================================

elapsed_time = toc;

% Creazione dei time-to-failure data PRIMA del salvataggio
% (eseguito nel contesto corretto con accesso a tutte le variabili)
fprintf('📊 Creando time-to-failure data...\n');
try
    if exist('createTimeToFailureBasicEvents.m', 'file')
        createTimeToFailureBasicEvents;
        fprintf('   ✓ Time-to-failure Basic Events creato\n');
    end
    
    if exist('createTimeToFailureGates.m', 'file')
        createTimeToFailureGates;
        fprintf('   ✓ Time-to-failure Gates creato\n');
    end
catch ME
    fprintf('   ⚠ Warning creazione TTF: %s\n', ME.message);
end

% Salvataggio finale del workspace e risultati
toc

% Prima salva tutto il workspace (come nel commit precedente)
resultsFile = fullfile(pwd, 'output\results.mat');
save(resultsFile);

% Poi usa anche la funzione unificata per altre funzionalità
saveSimulationResults(exit_reason, counter_i, elapsed_time, 'CreateTTF', false, 'Verbose', true);
