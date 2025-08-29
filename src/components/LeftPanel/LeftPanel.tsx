import React from 'react';
import { GateType } from '../../types/FaultTree';
import './LeftPanel.css';

interface LeftPanelProps {
  onAddBaseEvent: () => void;
  onAddGate: (gateType: GateType) => void;
  clickToPlaceMode: boolean;
  onToggleClickToPlace: () => void;
  componentToPlace: {
    type: 'event' | 'gate';
    gateType?: GateType;
  } | null;
  isDarkMode: boolean;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ 
  onAddBaseEvent, 
  onAddGate, 
  clickToPlaceMode, 
  onToggleClickToPlace, 
  componentToPlace,
  isDarkMode
}) => {
  const gateTypes: { type: GateType; label: string; description: string; icon: string }[] = [
    { type: 'AND', label: 'AND', description: 'Porta AND - Tutti gli input devono verificarsi', icon: '∧' },
    { type: 'OR', label: 'OR', description: 'Porta OR - Almeno un input deve verificarsi', icon: '∨' },
    { type: 'PAND', label: 'PAND', description: 'Porta AND Prioritaria - Input in sequenza specifica', icon: '⊕' },
    { type: 'SPARE', label: 'SPARE', description: 'Porta SPARE - Ridondanza con spare', icon: '⟲' },
    { type: 'SEQ', label: 'SEQ', description: 'Porta Sequenziale - Input in ordine temporale', icon: '→' },
    { type: 'FDEP', label: 'FDEP', description: 'Dipendenza Funzionale', icon: '⟹' }
  ];

  return (
    <div className={`left-panel ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="panel-header">
        <h3>Componenti</h3>
        
        {/* Toggle per modalità click-to-place */}
        <div className="placement-mode-toggle">
          <label className="toggle-container">
            <input
              type="checkbox"
              checked={clickToPlaceMode}
              onChange={onToggleClickToPlace}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">
              {clickToPlaceMode ? '📍 Click to Place' : '🎯 Instant Add'}
            </span>
          </label>
        </div>
        
        {/* Feedback componente selezionato */}
        {componentToPlace && (
          <div className="component-selected">
            <span>🎯 Selezionato: </span>
            <strong>
              {componentToPlace.type === 'event' 
                ? 'Evento Base' 
                : `Porta ${componentToPlace.gateType}`}
            </strong>
            <br />
            <small>Clicca sul diagramma per posizionare (rimane selezionato)</small>
          </div>
        )}
      </div>
      
      <div className="component-section">
        <h4>Eventi Base</h4>
        <button 
          className={`component-button event-button ${
            componentToPlace?.type === 'event' ? 'selected' : ''
          }`}
          onClick={onAddBaseEvent}
          title={clickToPlaceMode ? "Seleziona per posizionamento" : "Aggiungi Evento Base"}
        >
          <div className="component-icon">⬜</div>
          <div className="component-label">Evento Base</div>
          {componentToPlace?.type === 'event' && (
            <div className="selection-indicator">✓</div>
          )}
        </button>
      </div>

      <div className="component-section">
        <h4>Porte Logiche</h4>
        <div className="gates-grid">
          {gateTypes.map((gate) => (
            <button
              key={gate.type}
              className={`component-button gate-button ${
                componentToPlace?.type === 'gate' && componentToPlace?.gateType === gate.type ? 'selected' : ''
              }`}
              onClick={() => onAddGate(gate.type)}
              title={clickToPlaceMode ? `Seleziona ${gate.label} per posizionamento` : gate.description}
            >
              <div className="component-icon">{gate.icon}</div>
              <div className="component-label">{gate.label}</div>
              {componentToPlace?.type === 'gate' && componentToPlace?.gateType === gate.type && (
                <div className="selection-indicator">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="component-section">
        <h4>Istruzioni</h4>
        <div className="instructions">
          {clickToPlaceMode ? (
            <>
              <p>📍 <strong>Modalità Click-to-Place:</strong></p>
              <p>• Clicca un componente per selezionarlo</p>
              <p>• Clicca sul diagramma per posizionarlo (centrato)</p>
              <p>• Il componente rimane selezionato per più posizionamenti</p>
              <p>• Disattiva la modalità per deselezionare</p>
            </>
          ) : (
            <>
              <p>🎯 <strong>Modalità Instant Add:</strong></p>
              <p>• Clicca sui componenti per aggiungerli subito</p>
              <p>• Posizione casuale automatica</p>
              <p>• Trascina per riposizionare</p>
            </>
          )}
          <p>• Clicca su un componente per modificarne i parametri</p>
          <p>• Collega gli elementi alle porte trascinando</p>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
