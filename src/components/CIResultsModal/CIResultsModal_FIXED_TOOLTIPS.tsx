import React, { useState, useEffect } from 'react';
import { CIHistoryPoint, MatlabResultsService } from '../../services/matlab-results-service';
import './CIResultsModal.css';

interface CIResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CIResultsModal: React.FC<CIResultsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [ciHistory, setCiHistory] = useState<CIHistoryPoint[] | null>(null);
  const [activeTab, setActiveTab] = useState<'evolution' | 'convergence'>('evolution');
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    if (isOpen) {
      const results = MatlabResultsService.getCurrentResults();
      let ciData = results?.ciHistory || null;

      // Se non ci sono dati reali, usa dati mock per il test (TEMPORANEO)
      if (!ciData) {
        console.log('🧪 [CIResultsModal] No real CI data, using mock data for testing');
        ciData = generateMockCIData();
      }

      setCiHistory(ciData);
    }
  }, [isOpen]);

  // Funzione per generare dati CI mock per il test (TEMPORANEO)
  const generateMockCIData = (): CIHistoryPoint[] => {
    const mockData: CIHistoryPoint[] = [];
    const targetProb = 0.001234;

    for (let i = 1; i <= 100; i++) {
      const iteration = i * 100;
      const noise = (Math.random() - 0.5) * 0.0001;
      const convergenceFactor = Math.exp(-i / 30);

      const meanEstimate = targetProb + noise * convergenceFactor;
      const stdError = 0.0001 * convergenceFactor + 0.00001;
      const zValue = 1.96;
      const ciWidth = 2 * zValue * stdError;
      const acceptedError = 0.0002 * Math.exp(-i / 50) + 0.00005;

      mockData.push({
        iteration,
        p_failure: meanEstimate + noise * 2,
        mean_estimate: meanEstimate,
        CI_lower: meanEstimate - ciWidth/2,
        CI_upper: meanEstimate + ciWidth/2,
        CI_width: ciWidth,
        accepted_error: acceptedError,
        std_error: stdError
      });
    }

    return mockData;
  };

  if (!isOpen) return null;

  if (!ciHistory || ciHistory.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content ci-results-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📈 Simulation Confidence Interval Analysis</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="ci-no-data">
              <h3>⚠️ Nessun dato CI disponibile</h3>
              <p>I dati di Confidence Interval non sono disponibili per questa simulazione.</p>
              <p>Possibili cause:</p>
              <ul>
                <li>La simulazione non è stata eseguita con CI abilitati</li>
                <li>La simulazione non è ancora completata</li>
                <li>I dati CI non sono stati salvati nel file results.mat</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (n: number, decimals: number = 6): string => {
    return parseFloat(n.toFixed(decimals)).toString();
  };

  const handleMouseEnter = (event: React.MouseEvent, content: string) => {
    setTooltip({
      visible: true,
      x: event.clientX + 10,
      y: event.clientY - 10,
      content
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: '' });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (tooltip.visible) {
      setTooltip(prev => ({
        ...prev,
        x: event.clientX + 10,
        y: event.clientY - 10
      }));
    }
  };

  const renderEvolutionCharts = () => {
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Prepare data for charts
    const iterations = ciHistory.map(p => p.iteration);
    const pFailures = ciHistory.map(p => p.p_failure);
    const meanEstimates = ciHistory.map(p => p.mean_estimate);
    const ciLowers = ciHistory.map(p => p.CI_lower);
    const ciUppers = ciHistory.map(p => p.CI_upper);
    const ciWidths = ciHistory.map(p => p.CI_width);
    const acceptedErrors = ciHistory.map(p => p.accepted_error);
    const stdErrors = ciHistory.map(p => p.std_error);

    // Calculate scales with safety checks
    const minIteration = Math.min(...iterations);
    const maxIteration = Math.max(...iterations);
    const minProb = Math.min(...pFailures, ...ciLowers);
    const maxProb = Math.max(...pFailures, ...ciUppers);
    const maxWidth = Math.max(...ciWidths, ...acceptedErrors);
    const maxStdError = Math.max(...stdErrors);

    // Ensure valid ranges to prevent division by zero
    const iterationRange = (maxIteration - minIteration) || 1;
    const probRange = (maxProb - minProb) || 1e-10;
    const safeMaxWidth = maxWidth || 1e-10;
    const safeMaxStdError = maxStdError || 1e-10;

    const xScale = (iter: number) => {
      const result = ((iter - minIteration) / iterationRange) * chartWidth;
      return isFinite(result) ? result : 0;
    };

    const yScaleProb = (prob: number) => {
      const result = chartHeight - ((prob - minProb) / probRange) * chartHeight;
      return isFinite(result) ? result : chartHeight / 2;
    };

    const yScaleLog = (val: number) => {
      const logMin = Math.log10(Math.max(1e-10, Math.min(...ciWidths, ...acceptedErrors)));
      const logMax = Math.log10(safeMaxWidth);
      const logVal = Math.log10(Math.max(1e-10, val));
      const logRange = (logMax - logMin) || 1;
      const result = chartHeight - ((logVal - logMin) / logRange) * chartHeight;
      return isFinite(result) ? result : chartHeight / 2;
    };

    const yScaleStd = (std: number) => {
      const result = chartHeight - (std / safeMaxStdError) * chartHeight;
      return isFinite(result) ? result : chartHeight / 2;
    };

    // Chart 4: Convergence Ratio
    const convergenceRatios = ciWidths.map((width, i) => {
      const ratio = acceptedErrors[i] !== 0 ? width / acceptedErrors[i] : 0;
      return isFinite(ratio) ? ratio : 0;
    });
    const validRatios = convergenceRatios.filter(r => isFinite(r) && r > 0);
    const maxRatio = validRatios.length > 0 ? Math.max(...validRatios.slice(0, 10)) : 1;
    const safeMaxRatio = maxRatio || 1;

    const yScaleRatio = (ratio: number) => {
      const result = chartHeight - Math.min(ratio / (safeMaxRatio * 1.1), 1) * chartHeight;
      return isFinite(result) ? result : chartHeight / 2;
    };

    // Chart 1: Probability Evolution with CI
    const probabilityChart = (
      <div className="ci-chart">
        <h4>Evoluzione Probabilità di Failure</h4>
        <svg width={width} height={height}>
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <line
                key={ratio}
                x1={0}
                y1={ratio * chartHeight}
                x2={chartWidth}
                y2={ratio * chartHeight}
                stroke="#e0e0e0"
                strokeWidth={0.5}
              />
            ))}

            {/* CI Area */}
            <path
              d={`M ${xScale(iterations[0])} ${yScaleProb(ciLowers[0])} ${iterations.map((iter, i) =>
                `L ${xScale(iter)} ${yScaleProb(ciLowers[i])}`).join(' ')} ${iterations.slice().reverse().map((iter, i) =>
                `L ${xScale(iter)} ${yScaleProb(ciUppers[ciUppers.length - 1 - i])}`).join(' ')} Z`}
              fill="rgba(255, 0, 0, 0.2)"
              stroke="none"
            />

            {/* Mean line */}
            <path
              d={`M ${xScale(iterations[0])} ${yScaleProb(meanEstimates[0])} ${iterations.slice(1).map((iter, i) =>
                `L ${xScale(iter)} ${yScaleProb(meanEstimates[i + 1])}`).join(' ')}`}
              stroke="red"
              strokeWidth={2}
              fill="none"
            />

            {/* Point estimates with custom tooltips */}
            {iterations.map((iter, i) => (
              <circle
                key={i}
                cx={xScale(iter)}
                cy={yScaleProb(pFailures[i])}
                r={3}
                fill="blue"
                stroke="white"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleMouseEnter(e, `Iterazione: ${iter}\nProbabilità: ${formatNumber(pFailures[i])}\nCI: [${formatNumber(ciLowers[i])}, ${formatNumber(ciUppers[i])}]`)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
              />
            ))}

            {/* Axes */}
            <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="black" strokeWidth={1} />
            <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="black" strokeWidth={1} />

            {/* X-axis tick marks and labels */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const xPos = ratio * chartWidth;
              const iterValue = Math.round(minIteration + ratio * (maxIteration - minIteration));
              return (
                <g key={`x-tick-${ratio}`}>
                  <line x1={xPos} y1={chartHeight} x2={xPos} y2={chartHeight + 5} stroke="black" strokeWidth={1} />
                  <text x={xPos} y={chartHeight + 18} textAnchor="middle" fontSize="10" fill="black">
                    {iterValue}
                  </text>
                </g>
              );
            })}

            {/* Y-axis tick marks and labels */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const yPos = ratio * chartHeight;
              const probValue = minProb + (1 - ratio) * probRange;
              return (
                <g key={`y-tick-${ratio}`}>
                  <line x1={-5} y1={yPos} x2={0} y2={yPos} stroke="black" strokeWidth={1} />
                  <text x={-8} y={yPos + 3} textAnchor="end" fontSize="10" fill="black">
                    {formatNumber(probValue, 4)}
                  </text>
                </g>
              );
            })}

            {/* Labels */}
            <text x={chartWidth / 2} y={chartHeight + 35} textAnchor="middle" fontSize="12">Iterazione</text>
            <text x={-45} y={chartHeight / 2} textAnchor="middle" fontSize="12" transform={`rotate(-90, -45, ${chartHeight / 2})`}>Probabilità</text>
          </g>
        </svg>
      </div>
    );

    return (
      <div className="ci-charts-grid">
        {probabilityChart}
        {/* Altri grafici seguiranno lo stesso pattern */}
      </div>
    );
  };

  const renderConvergenceAnalysis = () => {
    return <div>Convergence Analysis (da implementare con tooltips)</div>;
  };

  const renderStatistics = () => {
    const lastPoint = ciHistory[ciHistory.length - 1];
    const converged = lastPoint.accepted_error > 0 && lastPoint.CI_width <= lastPoint.accepted_error;

    return (
      <div className="ci-statistics">
        <h3>📊 Statistiche Riassuntive</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Iterazioni Analizzate</div>
            <div className="stat-value">{ciHistory.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Iterazione Finale</div>
            <div className="stat-value">{lastPoint.iteration}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Stima Finale Probabilità</div>
            <div className="stat-value">{formatNumber(lastPoint.mean_estimate)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Intervallo Confidenza Finale</div>
            <div className="stat-value">[{formatNumber(lastPoint.CI_lower)}, {formatNumber(lastPoint.CI_upper)}]</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Larghezza CI Finale</div>
            <div className="stat-value">{formatNumber(lastPoint.CI_width)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Errore Accettabile Finale</div>
            <div className="stat-value">{formatNumber(lastPoint.accepted_error)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rapporto Finale (CI/Errore)</div>
            <div className="stat-value">
              {lastPoint.accepted_error !== 0
                ? formatNumber(lastPoint.CI_width / lastPoint.accepted_error, 3)
                : 'N/A'
              }
            </div>
          </div>
          <div className={`stat-card convergence-status ${converged ? 'converged' : 'not-converged'}`}>
            <div className="stat-label">Criterio di Stop</div>
            <div className="stat-value">
              {converged ? '✓ RAGGIUNTO' : '✗ NON raggiunto'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ci-results-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📈 Simulation Confidence Interval Analysis</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'evolution' ? 'active' : ''}`}
              onClick={() => setActiveTab('evolution')}
            >
              📊 Evoluzione CI
            </button>
            <button
              className={`tab ${activeTab === 'convergence' ? 'active' : ''}`}
              onClick={() => setActiveTab('convergence')}
            >
              📈 Analisi Convergenza
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'evolution' && renderEvolutionCharts()}
            {activeTab === 'convergence' && renderConvergenceAnalysis()}
          </div>

          {renderStatistics()}
        </div>

        {/* Custom Tooltip */}
        {tooltip.visible && (
          <div
            style={{
              position: 'fixed',
              left: tooltip.x,
              top: tooltip.y,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              pointerEvents: 'none',
              zIndex: 10000,
              whiteSpace: 'pre-line',
              maxWidth: '300px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

export default CIResultsModal;