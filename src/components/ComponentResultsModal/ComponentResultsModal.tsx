import React, { useState, useEffect } from 'react';
import { ComponentSimulationResults, MatlabResultsService } from '../../services/matlab-results-service';
import './ComponentResultsModal.css';

interface ComponentResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  elementId: string | null;
}

const ComponentResultsModal: React.FC<ComponentResultsModalProps> = ({
  isOpen,
  onClose,
  elementId
}) => {
  const [results, setResults] = useState<ComponentSimulationResults | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'cdf' | 'pdf'>('summary');
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    if (isOpen && elementId) {
      const componentResults = MatlabResultsService.getComponentResults(elementId);
      setResults(componentResults);
    }
  }, [isOpen, elementId]);

  if (!isOpen || !results) return null;

  const formatNumber = (n: number, decimals: number = 3): string => {
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

  const renderSummary = () => (
    <div className="results-summary">
      <h3>📊 Sommario Risultati</h3>
      
      <div className="results-grid">
        <div className="result-card">
          <div className="result-label">Componente</div>
          <div className="result-value">{results.componentName}</div>
        </div>
        
        <div className="result-card">
          <div className="result-label">Tipo</div>
          <div className="result-value">
            {results.componentType === 'event' ? '⬜ Evento Base' : '🔗 Porta'}
          </div>
        </div>
        
        <div className="result-card reliability-card">
          <div className="result-label">Affidabilità</div>
          <div className="result-value reliability-value">
            {(results.reliability * 100).toFixed(2)}%
          </div>
        </div>
        
        <div className="result-card unreliability-card">
          <div className="result-label">Inaffidabilità</div>
          <div className="result-value unreliability-value">
            {(results.unreliability * 100).toFixed(2)}%
          </div>
        </div>
        
        <div className="result-card">
          <div className="result-label">Iterazioni Guastate</div>
          <div className="result-value">{results.nFailures}</div>
        </div>
        
        <div className="result-card">
          <div className="result-label">Iterazioni Totali</div>
          <div className="result-value">{results.totalIterations}</div>
        </div>
      </div>
      
      <div className="detailed-info">
        <h4>📋 Informazioni Dettagliate</h4>
        <div className="info-grid">
          <div className="info-item">
            <strong>Affidabilità R(t):</strong> La probabilità che il componente funzioni correttamente per tutto il tempo di missione.
          </div>
          <div className="info-item">
            <strong>Calcolo:</strong> R = (Iterazioni senza guasto) / (Iterazioni totali) = {results.totalIterations - results.nFailures}/{results.totalIterations}
          </div>
          <div className="info-item">
            <strong>Tempo di Guasto:</strong> Per ogni iterazione viene registrato il tempo di primo guasto (∞ se mai guastato).
          </div>
        </div>
      </div>
    </div>
  );

  const renderChart = (type: 'cdf' | 'pdf') => {
    const data = type === 'cdf' ? results.cdfData : results.pdfData;
    const title = type === 'cdf' ? 'Funzione di Distribuzione Cumulativa (CDF)' : 'Funzione di Densità di Probabilità (PDF)';
    const yLabel = type === 'cdf' ? 'Probabilità Cumulativa' : 'Densità';
    
    console.log(`🔍 [DEBUG] Rendering ${type.toUpperCase()} chart for ${results.componentName}`);
    console.log(`  📊 Data available:`, !!data);
    console.log(`  📈 Data length:`, data?.length);
    console.log(`  📋 First 3 data points:`, data?.slice(0, 3));
    
    if (!data || data.length === 0) {
      console.log(`❌ [DEBUG] No data available for ${type.toUpperCase()} chart`);
      return (
        <div className="chart-placeholder">
          <div className="chart-error">
            <h3>{title}</h3>
            <p>❌ Dati non disponibili per la visualizzazione</p>
            <p>I dati per il grafico {type.toUpperCase()} non sono stati generati correttamente.</p>
          </div>
        </div>
      );
    }

    // Trova i valori min/max per il grafico
    const maxX = Math.max(...data.map(d => d.time));
    const maxY = Math.max(...data.map(d => type === 'cdf' ? (d as any).probability : (d as any).density));
    
    // Dimensioni del grafico
    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Genera i punti del path SVG
    const pathData = data.map((d, i) => {
      const x = margin.left + (d.time / maxX) * chartWidth;
      const y = margin.top + chartHeight - ((type === 'cdf' ? (d as any).probability : (d as any).density) / maxY) * chartHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="chart-wrapper">
          <svg width={width} height={height} className="reliability-chart">
            {/* Griglia */}
            <defs>
              <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width={chartWidth} height={chartHeight} x={margin.left} y={margin.top} fill="url(#grid)" />
            
            {/* Assi */}
            <line x1={margin.left} y1={margin.top + chartHeight} x2={margin.left + chartWidth} y2={margin.top + chartHeight} stroke="#333" strokeWidth="2"/>
            <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + chartHeight} stroke="#333" strokeWidth="2"/>
            
            {/* Linea del grafico */}
            <path d={pathData} fill="none" stroke={type === 'cdf' ? "#007bff" : "#e74c3c"} strokeWidth="1.5"/>

            {/* Punti dati interattivi con tooltip */}
            {data.map((d, i) => {
              const x = margin.left + (d.time / maxX) * chartWidth;
              const y = margin.top + chartHeight - ((type === 'cdf' ? (d as any).probability : (d as any).density) / maxY) * chartHeight;
              const yValue = type === 'cdf' ? (d as any).probability : (d as any).density;
              const yLabel = type === 'cdf' ? 'Probabilità' : 'Densità';

              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={1.5}
                  fill={type === 'cdf' ? "#007bff" : "#e74c3c"}
                  style={{ cursor: 'pointer', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                  onMouseEnter={(e) => handleMouseEnter(e, `Tempo: ${formatNumber(d.time, 1)} ore\n${yLabel}: ${formatNumber(yValue, type === 'cdf' ? 4 : 6)}`)}
                  onMouseLeave={handleMouseLeave}
                  onMouseMove={handleMouseMove}
                />
              );
            })}
            
            {/* Etichette assi */}
            <text x={margin.left + chartWidth/2} y={height - 10} textAnchor="middle" className="axis-label">
              Tempo (ore)
            </text>
            <text x={15} y={margin.top + chartHeight/2} textAnchor="middle" transform={`rotate(-90, 15, ${margin.top + chartHeight/2})`} className="axis-label">
              {yLabel}
            </text>
            
            {/* Valori sull'asse X */}
            {[0, 0.25, 0.5, 0.75, 1.0].map(frac => (
              <text key={frac} x={margin.left + frac * chartWidth} y={height - 25} textAnchor="middle" className="axis-tick">
                {formatNumber(frac * maxX, 0)}
              </text>
            ))}
            
            {/* Valori sull'asse Y */}
            {[0, 0.25, 0.5, 0.75, 1.0].map(frac => (
              <text key={frac} x={margin.left - 10} y={margin.top + chartHeight - frac * chartHeight + 5} textAnchor="end" className="axis-tick">
                {formatNumber(frac * maxY, type === 'cdf' ? 2 : 4)}
              </text>
            ))}
          </svg>
        </div>
        
        <div className="chart-description">
          <p>
            <strong>{type === 'cdf' ? 'CDF' : 'PDF'}:</strong> {
              type === 'cdf' 
                ? 'Mostra la probabilità che il componente si guasti entro un tempo t.'
                : 'Mostra la densità di probabilità di guasto in funzione del tempo.'
            }
          </p>
          <p className="chart-stats">
            📊 <strong>Punti dati:</strong> {data.length} | 
            <strong> Max X:</strong> {formatNumber(maxX)} ore | 
            <strong> Max Y:</strong> {formatNumber(maxY, type === 'cdf' ? 3 : 6)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="component-results-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📈 Risultati Simulazione - {results.componentName}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📊 Sommario
          </button>
          <button 
            className={`tab-button ${activeTab === 'cdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('cdf')}
          >
            📈 CDF
          </button>
          <button 
            className={`tab-button ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            📊 PDF
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'summary' && renderSummary()}
          {activeTab === 'cdf' && renderChart('cdf')}
          {activeTab === 'pdf' && renderChart('pdf')}
        </div>

        <div className="modal-footer">
          <button className="close-modal-button" onClick={onClose}>
            Chiudi
          </button>
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

export default ComponentResultsModal;