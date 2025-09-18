function plotConfidenceIntervalResults(CI_history, varargin)
%PLOTCONFIDENCEINTERVALRESULTS Visualizza i risultati delle stopping rules CI
%   Questa funzione crea grafici per visualizzare l'evoluzione dell'intervallo
%   di confidenza e dei criteri di stop durante la simulazione
%
%   Input:
%       CI_history - Array di strutture con la storia delle statistiche CI
%       varargin - Parametri opzionali:
%                 'SaveFigures', true/false - Salva le figure (default: false)
%                 'FigurePrefix', string - Prefisso per i nomi dei file (default: 'CI_')
%
%   Esempio di utilizzo:
%       load('test_confidence_interval_results.mat');
%       plotConfidenceIntervalResults(CI_history);
%       plotConfidenceIntervalResults(CI_history, 'SaveFigures', true);

    % Controllo degli argomenti di input
    if nargin < 1
        error('plotConfidenceIntervalResults:NotEnoughInputs', ...
              ['Utilizzo: plotConfidenceIntervalResults(CI_history)\n' ...
               'Dove CI_history è un array di strutture con le statistiche CI.\n' ...
               'Per ottenere CI_history, esegui prima una simulazione con stopping rules CI\n' ...
               'oppure carica i risultati da un file .mat salvato.']);
    end

    % Parsing degli argomenti opzionali
    p = inputParser;
    addParameter(p, 'SaveFigures', false, @islogical);
    addParameter(p, 'FigurePrefix', 'CI_', @ischar);
    parse(p, varargin{:});
    
    save_figures = p.Results.SaveFigures;
    figure_prefix = p.Results.FigurePrefix;
    
    if isempty(CI_history)
        fprintf('ERRORE: CI_history è vuoto.\n');
        fprintf('Per ottenere dati da visualizzare:\n');
        fprintf('  1. Esegui ZFTAMain con stopping rules abilitate\n');
        fprintf('  2. Oppure esegui testConfidenceIntervalStoppingRules\n');
        fprintf('  3. Oppure carica un file con: load(''nome_file.mat'')\n');
        return;
    end
    
    % Estrai i dati dalla storia
    iterations = [CI_history.iteration];
    p_failures = [CI_history.p_failure];
    mean_estimates = [CI_history.mean_estimate];
    CI_lowers = [CI_history.CI_lower];
    CI_uppers = [CI_history.CI_upper];
    CI_widths = [CI_history.CI_width];
    accepted_errors = [CI_history.accepted_error];
    std_errors = [CI_history.std_error];
    
    % Controllo di sanità sui dati
    fprintf('Dati caricati: %d punti\n', length(iterations));
    fprintf('Range iterazioni: %d - %d\n', min(iterations), max(iterations));
    fprintf('Range probabilità: %.6f - %.6f\n', min(p_failures), max(p_failures));
    
    % Sostituisci valori non validi
    CI_widths(~isfinite(CI_widths)) = 0;
    accepted_errors(~isfinite(accepted_errors) | accepted_errors <= 0) = 1e-6;
    std_errors(~isfinite(std_errors)) = 0;
    
    %% Figura 1: Evoluzione della probabilità di failure e intervallo di confidenza
    figure('Name', 'Evoluzione Probabilità di Failure e Intervallo di Confidenza', 'Position', [100, 100, 1200, 600]);
    
    subplot(2, 2, 1);
    plot(iterations, p_failures, 'b.', 'MarkerSize', 4);
    hold on;
    plot(iterations, mean_estimates, 'r-', 'LineWidth', 2);
    fill([iterations, fliplr(iterations)], [CI_lowers, fliplr(CI_uppers)], 'r', 'FaceAlpha', 0.2, 'EdgeColor', 'none');
    xlabel('Iterazione');
    ylabel('Probabilità di Failure');
    title('Evoluzione della Stima di Probabilità di Failure');
    legend('Stime puntuali', 'Media cumulativa', 'Intervallo di Confidenza', 'Location', 'best');
    grid on;
    
    subplot(2, 2, 2);
    semilogy(iterations, CI_widths, 'g-', 'LineWidth', 2);
    hold on;
    semilogy(iterations, accepted_errors, 'r--', 'LineWidth', 2);
    xlabel('Iterazione');
    ylabel('Larghezza (scala log)');
    title('Larghezza Intervallo di Confidenza vs Errore Accettabile');
    legend('Larghezza CI', 'Errore Accettabile', 'Location', 'best');
    grid on;
    
    subplot(2, 2, 3);
    plot(iterations, std_errors, 'k-', 'LineWidth', 1.5);
    xlabel('Iterazione');
    ylabel('Errore Standard');
    title('Evoluzione dell''Errore Standard');
    grid on;
    
    subplot(2, 2, 4);
    convergence_ratio = CI_widths ./ accepted_errors;
    plot(iterations, convergence_ratio, 'm-', 'LineWidth', 2);
    hold on;
    plot(iterations, ones(size(iterations)), 'r--', 'LineWidth', 1);
    xlabel('Iterazione');
    ylabel('Rapporto');
    title('Rapporto Larghezza CI / Errore Accettabile');
    legend('Rapporto', 'Soglia di Stop (=1)', 'Location', 'best');
    grid on;
    
    % Calcola limiti sicuri per l'asse Y
    valid_ratios = convergence_ratio(isfinite(convergence_ratio) & convergence_ratio > 0);
    if ~isempty(valid_ratios)
        max_ratio_to_show = max(valid_ratios(1:min(10, length(valid_ratios))));
        if max_ratio_to_show > 0 && isfinite(max_ratio_to_show)
            ylim([0, max_ratio_to_show * 1.1]);  % Aggiungi 10% di margine
        else
            ylim([0, 5]);  % Valore di default
        end
    else
        ylim([0, 5]);  % Valore di default se non ci sono dati validi
    end
    
    if save_figures
        saveas(gcf, [figure_prefix 'evolution.png']);
        saveas(gcf, [figure_prefix 'evolution.fig']);
    end
    
    %% Figura 2: Analisi della convergenza
    figure('Name', 'Analisi della Convergenza', 'Position', [150, 150, 1000, 500]);
    
    subplot(1, 2, 1);
    plot(iterations, mean_estimates, 'b-', 'LineWidth', 2);
    xlabel('Iterazione');
    ylabel('Stima Media');
    title('Convergenza della Stima Media');
    grid on;
    
    % Calcola la variazione percentuale della media
    if length(mean_estimates) > 1
        pct_change = abs(diff(mean_estimates) ./ mean_estimates(1:end-1)) * 100;
        subplot(1, 2, 2);
        semilogy(iterations(2:end), pct_change, 'r-', 'LineWidth', 1.5);
        xlabel('Iterazione');
        ylabel('Variazione % (scala log)');
        title('Variazione Percentuale della Stima Media');
        grid on;
    end
    
    if save_figures
        saveas(gcf, [figure_prefix 'convergence.png']);
        saveas(gcf, [figure_prefix 'convergence.fig']);
    end
    
    %% Stampa statistiche riassuntive
    fprintf('\n=== STATISTICHE RIASSUNTIVE ===\n');
    fprintf('Numero di iterazioni analizzate: %d\n', length(CI_history));
    fprintf('Iterazione finale: %d\n', iterations(end));
    fprintf('Stima finale di probabilità: %.6f\n', mean_estimates(end));
    fprintf('Intervallo di confidenza finale: [%.6f, %.6f]\n', CI_lowers(end), CI_uppers(end));
    fprintf('Larghezza CI finale: %.6f\n', CI_widths(end));
    fprintf('Errore accettabile finale: %.6f\n', accepted_errors(end));
    fprintf('Rapporto finale (CI/Errore): %.3f\n', CI_widths(end)/accepted_errors(end));
    
    % Controlla se il criterio di stop è stato raggiunto
    if CI_widths(end) <= accepted_errors(end)
        fprintf('✓ Criterio di stop RAGGIUNTO\n');
    else
        fprintf('✗ Criterio di stop NON raggiunto\n');
    end
    fprintf('===============================\n');
end
