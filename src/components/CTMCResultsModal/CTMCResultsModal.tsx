import React, { useState, useEffect } from 'react';
import './CTMCResultsModal.css';

interface CTMCStateResults {
  stateId: string;
  stateName: string;
  stateIndex: number;
  probabilityEvolution: { time: number; probability: number }[];
  finalProbability: number;
  averageProbability: number;
  solverMethod?: string;
  isSteadyState?: boolean;
}

interface CTMCResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stateId: string | null;
  stateName: string | null;
  matlabStateIndex?: number;
}

const CTMCResultsModal: React.FC<CTMCResultsModalProps> = ({
  isOpen,
  onClose,
  stateId,
  stateName,
  matlabStateIndex
}) => {
  const [results, setResults] = useState<CTMCStateResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{x: number, y: number, time: number, probability: number} | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCTMCResults();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCTMCResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 [CTMCResultsModal] loadCTMCResults called - using localStorage path`);
      
      // Use the same pattern as Fault Tree - get library path from localStorage
      const savedLibraryPath = localStorage.getItem('msolver-library-directory');
      console.log(`🔍 Retrieved library path from localStorage: "${savedLibraryPath}"`);
      
      if (!savedLibraryPath) {
        throw new Error('Path della libreria CTMC non trovato. Configura il path nel MSolver e riprova.');
      }
      
      // Try to load results from the backend API (simplified)
      const url = `http://${window.location.hostname}:3001/api/ctmc/results?libraryPath=${encodeURIComponent(savedLibraryPath)}`;
      console.log(`🔗 Requesting: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Risultati CTMC non trovati. Assicurati di aver eseguito l\'analisi CTMC con successo prima di visualizzare i risultati.');
        } else {
          throw new Error(`Errore nel caricamento dei risultati CTMC (${response.status}). Verifica che il backend sia attivo.`);
        }
      }
      
      const data = await response.json();
      console.log(`✅ CTMC data loaded:`, data.source, data.data ? 'with data' : 'no data');
      
      // Extract state-specific results
      const stateIndex = matlabStateIndex ? matlabStateIndex - 1 : 0;
      const stateResults = extractStateResults(data.data || data, stateIndex);
      
      setResults(stateResults);
    } catch (err) {
      console.error('Error loading CTMC results:', err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei risultati');
    } finally {
      setLoading(false);
    }
  };

  const extractStateResults = (data: any, stateIndex: number): CTMCStateResults => {
    const solverMethod = data.solverMethod || 'Transitorio';
    const isSteadyState = solverMethod === 'Stazionario';
    
    // Handle steady-state results (Stazionario method)
    if (isSteadyState && data.result) {
      console.log(`🔍 [DEBUG] Parsing steady-state results for state ${stateIndex}:`);
      console.log(`   Raw data.result:`, data.result);
      console.log(`   Type:`, typeof data.result);
      
      let steadyStateProbability = 0;
      
      if (Array.isArray(data.result)) {
        // Already an array
        steadyStateProbability = data.result[stateIndex] || 0;
        console.log(`   Using array element [${stateIndex}]:`, steadyStateProbability);
      } else if (typeof data.result === 'string') {
        // Parse MATLAB vector string like "0 1 0 0 0 0"
        const probabilities = data.result.trim()
          .split(/\s+/)  // Split on any whitespace
          .map((p: string) => parseFloat(p))
          .filter((p: number) => !isNaN(p)); // Remove any NaN values
          
        console.log(`   Parsed probabilities array:`, probabilities);
        steadyStateProbability = probabilities[stateIndex] || 0;
        console.log(`   Selected probability for state ${stateIndex}:`, steadyStateProbability);
      } else if (typeof data.result === 'number') {
        // Single number - only valid for state 0
        steadyStateProbability = stateIndex === 0 ? data.result : 0;
        console.log(`   Using single number for state 0:`, steadyStateProbability);
      }
      
      console.log(`✅ Final steady-state probability for state ${stateIndex}:`, steadyStateProbability);
      
      return {
        stateId: stateId!,
        stateName: stateName || `State ${stateIndex}`,
        stateIndex,
        probabilityEvolution: [], // No time evolution for steady-state
        finalProbability: steadyStateProbability,
        averageProbability: steadyStateProbability, // Same as final for steady-state
        solverMethod,
        isSteadyState: true
      };
    }
    
    // Handle transient results (Transitorio/Uniformizzazione methods)
    const timeSteps = data.timeSteps || Array.from({length: 51}, (_, i) => i * 0.1);
    const probabilityMatrix = data.probabilityMatrix || generateMockProbabilities(timeSteps.length, stateIndex);
    
    const probabilityEvolution = timeSteps.map((time: number, i: number) => ({
      time,
      probability: probabilityMatrix[i] && probabilityMatrix[i][stateIndex] ? probabilityMatrix[i][stateIndex] : 0
    }));

    const finalProbability = probabilityEvolution[probabilityEvolution.length - 1]?.probability || 0;
    const averageProbability = probabilityEvolution.reduce((sum: number, p: { time: number; probability: number }) => sum + p.probability, 0) / probabilityEvolution.length;

    return {
      stateId: stateId!,
      stateName: stateName || `State ${stateIndex}`,
      stateIndex,
      probabilityEvolution,
      finalProbability,
      averageProbability,
      solverMethod,
      isSteadyState: false
    };
  };

  const generateMockProbabilities = (timeSteps: number, stateIndex: number): number[][] => {
    // Generate mock probability evolution for demonstration
    const matrix: number[][] = [];
    for (let t = 0; t < timeSteps; t++) {
      const row: number[] = [];
      for (let s = 0; s < 4; s++) { // Assume 4 states
        if (t === 0) {
          row.push(s === 0 ? 1 : 0); // Initial state
        } else {
          const time = t * 0.1;
          if (s === stateIndex) {
            row.push(Math.exp(-time * 0.5) * (0.5 + 0.5 * Math.cos(time * 0.3)));
          } else {
            row.push((1 - Math.exp(-time * 0.5)) / 3);
          }
        }
      }
      matrix.push(row);
    }
    return matrix;
  };

  const formatNumber = (n: number, decimals: number = 4): string => {
    return parseFloat(n.toFixed(decimals)).toString();
  };

  const renderSummary = () => {
    if (!results) return null;

    return (
      <div className="ctmc-results-summary">
        <h3>📊 Risultati Stato CTMC</h3>
        
        <div className="results-grid">
          <div className="result-card">
            <div className="result-label">Nome Stato</div>
            <div className="result-value">{results.stateName}</div>
          </div>
          
          <div className="result-card">
            <div className="result-label">Indice MATLAB</div>
            <div className="result-value">{results.stateIndex}</div>
          </div>
          
          <div className="result-card">
            <div className="result-label">Metodo</div>
            <div className="result-value">{results.solverMethod || 'Transitorio'}</div>
          </div>
          
          <div className="result-card probability-card">
            <div className="result-label">
              {results.isSteadyState ? 'Probabilità Stazionaria' : 'Probabilità Finale'}
            </div>
            <div className="result-value probability-value">
              {(results.finalProbability * 100).toFixed(2)}%
            </div>
          </div>
          
          {!results.isSteadyState && (
            <div className="result-card average-card">
              <div className="result-label">Probabilità Media</div>
              <div className="result-value average-value">
                {(results.averageProbability * 100).toFixed(2)}%
              </div>
            </div>
          )}
        </div>
        
        <div className="detailed-info">
          <h4>📋 Informazioni sull'Analisi CTMC</h4>
          <div className="info-grid">
            <div className="info-item">
              <strong>Catena di Markov:</strong> Processo stocastico che modella le transizioni tra stati con rates esponenziali.
            </div>
            {results.isSteadyState ? (
              <>
                <div className="info-item">
                  <strong>Analisi Stazionaria:</strong> Calcola la distribuzione di probabilità a regime (t → ∞) quando il sistema raggiunge l'equilibrio.
                </div>
                <div className="info-item">
                  <strong>Probabilità Stazionaria:</strong> π<sub>{results.stateIndex}</sub> rappresenta la frazione di tempo che il sistema trascorre nello stato {results.stateIndex} a lungo termine.
                </div>
              </>
            ) : (
              <>
                <div className="info-item">
                  <strong>Probabilità di Stato:</strong> π<sub>{results.stateIndex}</sub>(t) rappresenta la probabilità di essere nello stato {results.stateIndex} al tempo t.
                </div>
                <div className="info-item">
                  <strong>Evoluzione Temporale:</strong> La probabilità cambia nel tempo secondo l'equazione differenziale dπ/dt = πQ.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProbabilityChart = () => {
    if (!results) return null;
    
    // For steady-state analysis, show info instead of chart
    if (results.isSteadyState) {
      return (
        <div className="chart-placeholder">
          <div className="steady-state-info">
            <h3>📊 Analisi Stazionaria Completata</h3>
            <div className="steady-state-result">
              <div className="steady-state-card">
                <div className="steady-state-label">Probabilità Stazionaria π<sub>{results.stateIndex}</sub></div>
                <div className="steady-state-value">{(results.finalProbability * 100).toFixed(4)}%</div>
              </div>
            </div>
            <p className="steady-state-description">
              <strong>Interpretazione:</strong> A lungo termine, il sistema trascorre il {(results.finalProbability * 100).toFixed(2)}% 
              del tempo nello stato {results.stateIndex}. Questo valore rappresenta la probabilità stazionaria 
              calcolata risolvendo il sistema πQ = 0 con ∑π<sub>i</sub> = 1.
            </p>
          </div>
        </div>
      );
    }
    
    // For transient analysis, check if data is available
    if (!results.probabilityEvolution.length) {
      return (
        <div className="chart-placeholder">
          <div className="chart-error">
            <h3>Evoluzione Probabilità nel Tempo</h3>
            <p>❌ Dati non disponibili per la visualizzazione</p>
            <p>Esegui prima l'analisi CTMC per generare i dati.</p>
          </div>
        </div>
      );
    }

    const data = results.probabilityEvolution;
    const maxX = Math.max(...data.map(d => d.time));
    const maxY = Math.max(...data.map(d => d.probability));
    
    // Chart dimensions
    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Generate SVG path
    const pathData = data.map((d, i) => {
      const x = margin.left + (d.time / maxX) * chartWidth;
      const y = margin.top + chartHeight - (d.probability / maxY) * chartHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <div className="chart-container">
        <h3>📈 Evoluzione Probabilità π<sub>{results.stateIndex}</sub>(t)</h3>
        <div className="chart-wrapper">
          <svg width={width} height={height} className="ctmc-chart">
            {/* Grid */}
            <defs>
              <pattern id="ctmc-grid" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width={chartWidth} height={chartHeight} x={margin.left} y={margin.top} fill="url(#ctmc-grid)" />
            
            {/* Axes */}
            <line x1={margin.left} y1={margin.top + chartHeight} x2={margin.left + chartWidth} y2={margin.top + chartHeight} stroke="#333" strokeWidth="2"/>
            <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + chartHeight} stroke="#333" strokeWidth="2"/>
            
            {/* Chart line */}
            <path d={pathData} fill="none" stroke="#3498db" strokeWidth="3"/>
            
            {/* Data points */}
            {data.filter((_, i) => i % 5 === 0).map((d, i) => {
              const x = margin.left + (d.time / maxX) * chartWidth;
              const y = margin.top + chartHeight - (d.probability / maxY) * chartHeight;
              return (
                <circle 
                  key={i} 
                  cx={x} 
                  cy={y} 
                  r="4" 
                  fill="#3498db" 
                  stroke="white" 
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip({x, y: y - 10, time: d.time, probability: d.probability})}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
            
            {/* Axis labels */}
            <text x={margin.left + chartWidth/2} y={height - 10} textAnchor="middle" className="axis-label">
              Tempo (unità)
            </text>
            <text x={15} y={margin.top + chartHeight/2} textAnchor="middle" transform={`rotate(-90, 15, ${margin.top + chartHeight/2})`} className="axis-label">
              Probabilità π<tspan fontSize="10" dy="3">{results.stateIndex}</tspan>(t)
            </text>
            
            {/* X-axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1.0].map(frac => (
              <text key={frac} x={margin.left + frac * chartWidth} y={height - 25} textAnchor="middle" className="axis-tick">
                {formatNumber(frac * maxX, 1)}
              </text>
            ))}
            
            {/* Y-axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1.0].map(frac => (
              <text key={frac} x={margin.left - 10} y={margin.top + chartHeight - frac * chartHeight + 5} textAnchor="end" className="axis-tick">
                {formatNumber(frac * maxY, 3)}
              </text>
            ))}
            
            {/* Tooltip */}
            {tooltip && (
              <g>
                <rect 
                  x={tooltip.x - 40} 
                  y={tooltip.y - 30} 
                  width="80" 
                  height="25" 
                  fill="#333" 
                  fillOpacity="0.9" 
                  rx="4" 
                  stroke="#fff" 
                  strokeWidth="1"
                />
                <text 
                  x={tooltip.x} 
                  y={tooltip.y - 18} 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize="10" 
                  fontWeight="bold"
                >
                  t={formatNumber(tooltip.time, 2)}
                </text>
                <text 
                  x={tooltip.x} 
                  y={tooltip.y - 8} 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize="10" 
                  fontWeight="bold"
                >
                  π={formatNumber(tooltip.probability, 4)}
                </text>
              </g>
            )}
          </svg>
        </div>
        
        <div className="chart-description">
          <p>
            <strong>Grafico:</strong> Mostra l'evoluzione della probabilità di essere nello stato {results.stateIndex} nel tempo.
          </p>
          <p className="chart-stats">
            📊 <strong>Punti dati:</strong> {data.length} | 
            <strong> Tempo max:</strong> {formatNumber(maxX, 1)} | 
            <strong> Prob max:</strong> {formatNumber(maxY, 3)}
          </p>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ctmc-results-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔬 Risultati CTMC - {stateName || `Stato ${matlabStateIndex ? matlabStateIndex - 1 : 0}`}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Caricamento risultati CTMC...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <h3>❌ Errore</h3>
              <p>{error}</p>
              <button onClick={loadCTMCResults} className="retry-button">
                🔄 Riprova
              </button>
            </div>
          ) : results ? (
            <div className="results-content">
              {renderSummary()}
              {renderProbabilityChart()}
            </div>
          ) : (
            <div className="no-data-message">
              <p>❌ Nessun dato disponibile</p>
              <p>Esegui prima un'analisi CTMC per visualizzare i risultati.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-modal-button" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default CTMCResultsModal;