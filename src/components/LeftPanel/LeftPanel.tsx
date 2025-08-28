import React from 'react';
import { GateType } from '../../types/FaultTree';
import './LeftPanel.css';

interface LeftPanelProps {
  onAddBaseEvent: () => void;
  onAddGate: (gateType: GateType) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ onAddBaseEvent, onAddGate }) => {
  const gateTypes: { type: GateType; label: string; description: string; icon: string }[] = [
    { type: 'AND', label: 'AND', description: 'Porta AND - Tutti gli input devono verificarsi', icon: '∧' },
    { type: 'OR', label: 'OR', description: 'Porta OR - Almeno un input deve verificarsi', icon: '∨' },
    { type: 'PAND', label: 'PAND', description: 'Porta AND Prioritaria - Input in sequenza specifica', icon: '⊕' },
    { type: 'SPARE', label: 'SPARE', description: 'Porta SPARE - Ridondanza con spare', icon: '⟲' },
    { type: 'SEQ', label: 'SEQ', description: 'Porta Sequenziale - Input in ordine temporale', icon: '→' },
    { type: 'FDEP', label: 'FDEP', description: 'Dipendenza Funzionale', icon: '⟹' }
  ];

  return (
    <div className="left-panel">
      <div className="panel-header">
        <h3>Componenti</h3>
      </div>
      
      <div className="component-section">
        <h4>Eventi Base</h4>
        <button 
          className="component-button event-button"
          onClick={onAddBaseEvent}
          title="Aggiungi Evento Base"
        >
          <div className="component-icon">⬜</div>
          <div className="component-label">Evento Base</div>
        </button>
      </div>

      <div className="component-section">
        <h4>Porte Logiche</h4>
        <div className="gates-grid">
          {gateTypes.map((gate) => (
            <button
              key={gate.type}
              className="component-button gate-button"
              onClick={() => onAddGate(gate.type)}
              title={gate.description}
            >
              <div className="component-icon">{gate.icon}</div>
              <div className="component-label">{gate.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="component-section">
        <h4>Istruzioni</h4>
        <div className="instructions">
          <p>• Clicca sui componenti per aggiungerli al diagramma</p>
          <p>• Trascina i componenti per posizionarli</p>
          <p>• Clicca su un componente per modificarne i parametri</p>
          <p>• Collega gli elementi alle porte trascinando</p>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
