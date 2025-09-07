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
toc
resultsFile = fullfile(pwd, 'output\results.mat');
save(resultsFile);
