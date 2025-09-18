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
    const rect = event.currentTarget.getBoundingClientRect();
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

            {/* Point estimates with tooltips */}
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

    // Chart 2: CI Width vs Accepted Error (Log scale)
    const widthChart = (
      <div className="ci-chart">
        <h4>Larghezza CI vs Errore Accettabile</h4>
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

            {/* CI Width line */}
            <path
              d={`M ${xScale(iterations[0])} ${yScaleLog(ciWidths[0])} ${iterations.slice(1).map((iter, i) =>
                `L ${xScale(iter)} ${yScaleLog(ciWidths[i + 1])}`).join(' ')}`}
              stroke="green"
              strokeWidth={2}
              fill="none"
            />

            {/* CI Width data points with tooltips */}
            {iterations.map((iter, i) => (
              <circle
                key={`ci-width-${i}`}
                cx={xScale(iter)}
                cy={yScaleLog(ciWidths[i])}
                r={2}
                fill="green"
                stroke="white"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleMouseEnter(e, `Iterazione: ${iter}\nLarghezza CI: ${formatNumber(ciWidths[i], 6)}\nErrore Accettabile: ${formatNumber(acceptedErrors[i], 6)}`)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
              />
            ))}

            {/* Accepted Error line */}
            <path
              d={`M ${xScale(iterations[0])} ${yScaleLog(acceptedErrors[0])} ${iterations.slice(1).map((iter, i) =>
                `L ${xScale(iter)} ${yScaleLog(acceptedErrors[i + 1])}`).join(' ')}`}
              stroke="red"
              strokeWidth={2}
              strokeDasharray="5,5"
              fill="none"
            />

            {/* Accepted Error data points with tooltips */}
            {iterations.map((iter, i) => (
              <circle
                key={`accepted-error-${i}`}
                cx={xScale(iter)}
                cy={yScaleLog(acceptedErrors[i])}
                r={2}
                fill="red"
                stroke="white"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleMouseEnter(e, `Iterazione: ${iter}\nErrore Accettabile: ${formatNumber(acceptedErrors[i], 6)}`)}
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
                <g key={`x-tick-width-${ratio}`}>
                  <line x1={xPos} y1={chartHeight} x2={xPos} y2={chartHeight + 5} stroke="black" strokeWidth={1} />
                  <text x={xPos} y={chartHeight + 18} textAnchor="middle" fontSize="10" fill="black">
                    {iterValue}
                  </text>
                </g>
              );
            })}

            {/* Y-axis tick marks and labels (log scale) */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const yPos = ratio * chartHeight;
              const logMin = Math.log10(Math.max(1e-10, Math.min(...ciWidths, ...acceptedErrors)));
              const logMax = Math.log10(safeMaxWidth);
              const logValue = logMin + (1 - ratio) * (logMax - logMin);
              const actualValue = Math.pow(10, logValue);
              return (
                <g key={`y-tick-width-${ratio}`}>
                  <line x1={-5} y1={yPos} x2={0} y2={yPos} stroke="black" strokeWidth={1} />
                  <text x={-8} y={yPos + 3} textAnchor="end" fontSize="10" fill="black">
                    {formatNumber(actualValue, 6)}
                  </text>
                </g>
              );
            })}

            {/* Labels */}
            <text x={chartWidth / 2} y={chartHeight + 35} textAnchor="middle" fontSize="12">Iterazione</text>
            <text x={-45} y={chartHeight / 2} textAnchor="middle" fontSize="12" transform={`rotate(-90, -45, ${chartHeight / 2})`}>Larghezza (log)</text>
          </g>
        </svg>
      </div>
    );

    // Chart 3: Standard Error
    const stdErrorChart = (
      <div className="ci-chart">
        <h4>Evoluzione Errore Standard</h4>
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

            {/* Std Error line */}
            <path
              d={`M ${xScale(iterations[0])} ${yScaleStd(stdErrors[0])} ${iterations.slice(1).map((iter, i) =>
                `L ${xScale(iter)} ${yScaleStd(stdErrors[i + 1])}`).join(' ')}`}
              stroke="black"
              strokeWidth={1.5}
              fill="none"
            />

            {/* Std Error data points with tooltips */}
            {iterations.map((iter, i) => (
              <circle
                key={`std-error-${i}`}
                cx={xScale(iter)}
                cy={yScaleStd(stdErrors[i])}
                r={2}
                fill="black"
                stroke="white"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleMouseEnter(e, `Iterazione: ${iter}\nErrore Standard: ${formatNumber(stdErrors[i], 6)}`)}
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
                <g key={`x-tick-std-${ratio}`}>
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
              const stdValue = (1 - ratio) * safeMaxStdError;
              return (
                <g key={`y-tick-std-${ratio}`}>
                  <line x1={-5} y1={yPos} x2={0} y2={yPos} stroke="black" strokeWidth={1} />
                  <text x={-8} y={yPos + 3} textAnchor="end" fontSize="10" fill="black">
                    {formatNumber(stdValue, 6)}
                  </text>
                </g>
              );
            })}

            {/* Labels */}
            <text x={chartWidth / 2} y={chartHeight + 35} textAnchor="middle" fontSize="12">Iterazione</text>
            <text x={-55} y={chartHeight / 2} textAnchor="middle" fontSize="12" transform={`rotate(-90, -55, ${chartHeight / 2})`}>Errore Standard</text>
          </g>
        </svg>
      </div>
    );

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

    const convergenceChart = (
      <div className="ci-chart">
        <h4>Rapporto Larghezza CI / Errore Accettabile</h4>
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

            {/* Threshold line (y=1) */}
            <line
              x1={0}
              y1={yScaleRatio(1)}
              x2={chartWidth}
              y2={yScaleRatio(1)}
              stroke="red"
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* Convergence ratio line */}
            <path
              d={`M ${xScale(iterations[0])} ${yScaleRatio(convergenceRatios[0])} ${iterations.slice(1).map((iter, i) =>
                `L ${xScale(iter)} ${yScaleRatio(convergenceRatios[i + 1])}`).join(' ')}`}
              stroke="magenta"
              strokeWidth={2}
              fill="none"
            />

            {/* Convergence ratio data points with tooltips */}
            {iterations.map((iter, i) => (
              <circle
                key={`ratio-${i}`}
                cx={xScale(iter)}
                cy={yScaleRatio(convergenceRatios[i])}
                r={2}
                fill="magenta"
                stroke="white"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleMouseEnter(e, `Iterazione: ${iter}\nRapporto CI/Errore: ${formatNumber(convergenceRatios[i], 3)}\n${convergenceRatios[i] <= 1 ? 'CONVERGED ✓' : 'NON CONVERGED ✗'}`)}
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
                <g key={`x-tick-ratio-${ratio}`}>
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
              const ratioValue = (1 - ratio) * safeMaxRatio * 1.1;
              return (
                <g key={`y-tick-ratio-${ratio}`}>
                  <line x1={-5} y1={yPos} x2={0} y2={yPos} stroke="black" strokeWidth={1} />
                  <text x={-8} y={yPos + 3} textAnchor="end" fontSize="10" fill="black">
                    {formatNumber(ratioValue, 2)}
                  </text>
                </g>
              );
            })}

            {/* Labels */}
            <text x={chartWidth / 2} y={chartHeight + 35} textAnchor="middle" fontSize="12">Iterazione</text>
            <text x={-35} y={chartHeight / 2} textAnchor="middle" fontSize="12" transform={`rotate(-90, -35, ${chartHeight / 2})`}>Rapporto</text>
          </g>
        </svg>
      </div>
    );

    return (
      <div className="ci-charts-grid">
        {probabilityChart}
        {widthChart}
        {stdErrorChart}
        {convergenceChart}
      </div>
    );
  };

  const renderConvergenceAnalysis = () => {
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const iterations = ciHistory.map(p => p.iteration);
    const meanEstimates = ciHistory.map(p => p.mean_estimate);

    // Calculate percentage changes with safety checks
    const pctChanges: number[] = [];
    for (let i = 1; i < meanEstimates.length; i++) {
      const prevValue = meanEstimates[i-1];
      if (prevValue !== 0) {
        const change = Math.abs((meanEstimates[i] - prevValue) / prevValue) * 100;
        pctChanges.push(isFinite(change) ? change : 0);
      } else {
        pctChanges.push(0);
      }
    }

    const minIteration = Math.min(...iterations);
    const maxIteration = Math.max(...iterations);
    const minMean = Math.min(...meanEstimates);
    const maxMean = Math.max(...meanEstimates);
    const maxPctChange = Math.max(...pctChanges);

    // Ensure valid ranges to prevent division by zero
    const iterationRange = (maxIteration - minIteration) || 1;
    const meanRange = (maxMean - minMean) || 1e-10;
    const safeMaxPctChange = maxPctChange || 1;

    const xScale = (iter: number) => {
      const result = ((iter - minIteration) / iterationRange) * chartWidth;
      return isFinite(result) ? result : 0;
    };

    const yScaleMean = (mean: number) => {
      const result = chartHeight - ((mean - minMean) / meanRange) * chartHeight;
      return isFinite(result) ? result : chartHeight / 2;
    };

    const yScalePct = (pct: number) => {
      const logRatio = Math.log10(pct + 1) / Math.log10(safeMaxPctChange + 1);
      const result = chartHeight - Math.min(logRatio, 1) * chartHeight;
      return isFinite(result) ? result : chartHeight / 2;
    };

    return (
      <div className="ci-convergence-charts">
        <div className="ci-chart">
          <h4>Convergenza della Stima Media</h4>
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

              {/* Mean estimates line */}
              <path
                d={`M ${xScale(iterations[0])} ${yScaleMean(meanEstimates[0])} ${iterations.slice(1).map((iter, i) =>
                  `L ${xScale(iter)} ${yScaleMean(meanEstimates[i + 1])}`).join(' ')}`}
                stroke="blue"
                strokeWidth={2}
                fill="none"
              />

              {/* Mean estimates data points with tooltips */}
              {iterations.map((iter, i) => (
                <circle
                  key={`conv-mean-${i}`}
                  cx={xScale(iter)}
                  cy={yScaleMean(meanEstimates[i])}
                  r={2}
                  fill="blue"
                  stroke="white"
                  strokeWidth={1}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleMouseEnter(e, `Iterazione: ${iter}\nStima Media: ${formatNumber(meanEstimates[i], 6)}`)}
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
                  <g key={`x-tick-conv-mean-${ratio}`}>
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
                const meanValue = minMean + (1 - ratio) * meanRange;
                return (
                  <g key={`y-tick-conv-mean-${ratio}`}>
                    <line x1={-5} y1={yPos} x2={0} y2={yPos} stroke="black" strokeWidth={1} />
                    <text x={-8} y={yPos + 3} textAnchor="end" fontSize="10" fill="black">
                      {formatNumber(meanValue, 6)}
                    </text>
                  </g>
                );
              })}

              {/* Labels */}
              <text x={chartWidth / 2} y={chartHeight + 35} textAnchor="middle" fontSize="12">Iterazione</text>
              <text x={-50} y={chartHeight / 2} textAnchor="middle" fontSize="12" transform={`rotate(-90, -50, ${chartHeight / 2})`}>Stima Media</text>
            </g>
          </svg>
        </div>

        {pctChanges.length > 0 && (
          <div className="ci-chart">
            <h4>Variazione Percentuale della Stima Media</h4>
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

                {/* Percentage change line */}
                <path
                  d={`M ${xScale(iterations[1])} ${yScalePct(pctChanges[0])} ${iterations.slice(2).map((iter, i) =>
                    `L ${xScale(iter)} ${yScalePct(pctChanges[i + 1])}`).join(' ')}`}
                  stroke="red"
                  strokeWidth={1.5}
                  fill="none"
                />

                {/* Percentage change data points with tooltips */}
                {pctChanges.map((pct, i) => (
                  <circle
                    key={`pct-change-${i}`}
                    cx={xScale(iterations[i + 1])}
                    cy={yScalePct(pct)}
                    r={2}
                    fill="red"
                    stroke="white"
                    strokeWidth={1}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => handleMouseEnter(e, `Iterazione: ${iterations[i + 1]}\nVariazione %: ${formatNumber(pct, 2)}%`)}
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
                    <g key={`x-tick-pct-${ratio}`}>
                      <line x1={xPos} y1={chartHeight} x2={xPos} y2={chartHeight + 5} stroke="black" strokeWidth={1} />
                      <text x={xPos} y={chartHeight + 18} textAnchor="middle" fontSize="10" fill="black">
                        {iterValue}
                      </text>
                    </g>
                  );
                })}

                {/* Y-axis tick marks and labels (log scale) */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                  const yPos = ratio * chartHeight;
                  const logRatio = (1 - ratio);
                  const pctValue = Math.pow(safeMaxPctChange + 1, logRatio) - 1;
                  return (
                    <g key={`y-tick-pct-${ratio}`}>
                      <line x1={-5} y1={yPos} x2={0} y2={yPos} stroke="black" strokeWidth={1} />
                      <text x={-8} y={yPos + 3} textAnchor="end" fontSize="10" fill="black">
                        {formatNumber(pctValue, 2)}%
                      </text>
                    </g>
                  );
                })}

                {/* Labels */}
                <text x={chartWidth / 2} y={chartHeight + 35} textAnchor="middle" fontSize="12">Iterazione</text>
                <text x={-55} y={chartHeight / 2} textAnchor="middle" fontSize="12" transform={`rotate(-90, -55, ${chartHeight / 2})`}>Variazione % (log)</text>
              </g>
            </svg>
          </div>
        )}
      </div>
    );
  };

  const renderStatistics = () => {
    const lastPoint = ciHistory[ciHistory.length - 1];

    // Calcola i 4 criteri di convergenza
    const mainCriterion = lastPoint.accepted_error > 0 && lastPoint.CI_width <= lastPoint.accepted_error;

    // Criterio di precisione relativa
    const relativePrecision = lastPoint.mean_estimate > 1e-6
      ? lastPoint.CI_width / lastPoint.mean_estimate
      : lastPoint.CI_width / 1e-5;
    const precisionCriterion = lastPoint.mean_estimate > 1e-6
      ? relativePrecision <= 0.25
      : lastPoint.CI_width <= 1e-5;

    // Criterio di robustezza statistica (stima dell'effective sample size)
    const estimatedSampleSize = lastPoint.iteration * lastPoint.mean_estimate * (1 - lastPoint.mean_estimate);
    const robustnessCriterion = estimatedSampleSize >= 10;

    // Criterio di stabilità (usa gli ultimi 10 punti se disponibili)
    let stabilityCriterion = false;
    if (ciHistory.length >= 10) {
      const recentEstimates = ciHistory.slice(-10).map(p => p.mean_estimate);
      const mean = recentEstimates.reduce((a, b) => a + b, 0) / recentEstimates.length;
      if (mean > 0) {
        const variance = recentEstimates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (recentEstimates.length - 1);
        const coefficientOfVariation = Math.sqrt(variance) / mean;
        stabilityCriterion = coefficientOfVariation < 0.1; // < 10%
      }
    }

    // Determine il tipo di stop
    const maxIterationsReached = lastPoint.iteration >= 50000; // Assumiamo un limite ragionevole
    const overallConverged = mainCriterion;

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
          {/* Criterio principale di stop */}
          <div className={`stat-card convergence-status ${maxIterationsReached ? 'max-iterations' : overallConverged ? 'converged' : 'not-converged'}`}>
            <div className="stat-label">Criterio di Stop</div>
            <div className="stat-value" title={maxIterationsReached ? "Raggiunto limite massimo iterazioni" : overallConverged ? "Convergenza raggiunta tramite criteri CI" : "Convergenza non ancora raggiunta"}>
              {maxIterationsReached ? '🔄 Iterazioni Completate' : overallConverged ? '✓ Convergenza Raggiunta' : '⏳ IN CORSO'}
            </div>
          </div>

          {/* 4 Criteri di convergenza dettagliati */}
          <div className={`stat-card criterion-badge ${mainCriterion ? 'met' : 'not-met'}`}>
            <div className="stat-label">1️⃣ Precisione CI</div>
            <div
              className="stat-value"
              title={`Larghezza CI (${formatNumber(lastPoint.CI_width, 6)}) ${mainCriterion ? '≤' : '>'} Errore Accettabile (${formatNumber(lastPoint.accepted_error, 6)})\n\nQuesto criterio verifica se l'intervallo di confidenza è sufficientemente stretto rispetto alla tolleranza di errore impostata.`}
            >
              {mainCriterion ? '✓ SODDISFATTO' : '✗ NON soddisfatto'}
            </div>
          </div>

          <div className={`stat-card criterion-badge ${precisionCriterion ? 'met' : 'not-met'}`}>
            <div className="stat-label">2️⃣ Precisione Relativa</div>
            <div
              className="stat-value"
              title={`Precisione relativa: ${formatNumber(relativePrecision * 100, 1)}% ${precisionCriterion ? '≤' : '>'} 25%\n\nQuesto criterio verifica che l'errore relativo sia inferiore al 25% della stima media, garantendo una precisione ragionevole.`}
            >
              {precisionCriterion ? '✓ SODDISFATTO' : '✗ NON soddisfatto'}
            </div>
          </div>

          <div className={`stat-card criterion-badge ${robustnessCriterion ? 'met' : 'not-met'}`}>
            <div className="stat-label">3️⃣ Robustezza Statistica</div>
            <div
              className="stat-value"
              title={`Effective Sample Size: ${formatNumber(estimatedSampleSize, 1)} ${robustnessCriterion ? '≥' : '<'} 10\n\nQuesto criterio verifica che ci siano abbastanza "successi ponderati" (n×p×(1-p)) per garantire stime statisticamente robuste.`}
            >
              {robustnessCriterion ? '✓ SODDISFATTO' : '✗ NON soddisfatto'}
            </div>
          </div>

          <div className={`stat-card criterion-badge ${stabilityCriterion ? 'met' : 'not-met'}`}>
            <div className="stat-label">4️⃣ Stabilità Temporale</div>
            <div
              className="stat-value"
              title={`Coefficiente di Variazione: ${ciHistory.length >= 10 ? formatNumber((Math.sqrt(ciHistory.slice(-10).map(p => p.mean_estimate).reduce((sum, val, i, arr) => sum + Math.pow(val - arr.reduce((a, b) => a + b, 0) / arr.length, 2), 0) / 9) / (ciHistory.slice(-10).map(p => p.mean_estimate).reduce((a, b) => a + b, 0) / 10)) * 100, 1) + '%' : 'N/A'} ${stabilityCriterion ? '<' : '≥'} 10%\n\nQuesto criterio verifica che le stime recenti siano stabili nel tempo, con bassa variabilità negli ultimi 10 punti.`}
            >
              {ciHistory.length >= 10 ? (stabilityCriterion ? '✓ SODDISFATTO' : '✗ NON soddisfatto') : 'N/A (dati insufficienti)'}
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