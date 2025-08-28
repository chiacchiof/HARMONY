import React, { useState, useEffect } from 'react';
import { BaseEvent, Gate } from '../../types/FaultTree';
import './ParameterModal.css';

interface ParameterModalProps {
  element: BaseEvent | Gate;
  onSave: (element: BaseEvent | Gate) => void;
  onClose: () => void;
}

const ParameterModal: React.FC<ParameterModalProps> = ({ element, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: element.name,
    description: element.description || '',
    ...element.parameters
  });

  // Campi specifici per eventi base
  const [eventFields, setEventFields] = useState({
    failureRate: element.type === 'basic-event' ? (element as BaseEvent).failureRate || '' : '',
    repairRate: '',
    dormancyFactor: '',
    testInterval: ''
  });

  // Campi specifici per porte
  const [gateFields, setGateFields] = useState({
    priority: '',
    delay: '',
    spareType: '',
    switchingTime: ''
  });

  useEffect(() => {
    if (element.parameters) {
      if (element.type === 'basic-event') {
        setEventFields(prev => ({ ...prev, ...element.parameters }));
      } else {
        setGateFields(prev => ({ ...prev, ...element.parameters }));
      }
    }
  }, [element]);

  const handleSave = () => {
    const updatedElement = {
      ...element,
      name: formData.name,
      description: formData.description,
      parameters: element.type === 'basic-event' ? eventFields : gateFields
    };

    if (element.type === 'basic-event') {
      (updatedElement as BaseEvent).failureRate = eventFields.failureRate ? 
        parseFloat(eventFields.failureRate.toString()) : undefined;
    }

    onSave(updatedElement);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEventFieldChange = (field: string, value: string) => {
    setEventFields(prev => ({ ...prev, [field]: value }));
  };

  const handleGateFieldChange = (field: string, value: string) => {
    setGateFields(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="parameter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {element.type === 'basic-event' ? '⬜ Parametri Evento Base' : 
             `${(element as Gate).gateType === 'AND' ? '∧' :
               (element as Gate).gateType === 'OR' ? '∨' :
               (element as Gate).gateType === 'PAND' ? '⊕' :
               (element as Gate).gateType === 'SPARE' ? '⟲' :
               (element as Gate).gateType === 'SEQ' ? '→' : '⟹'} Parametri Porta ${(element as Gate).gateType}`}
          </h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* Campi comuni */}
          <div className="form-section">
            <h4>Informazioni Generali</h4>
            <div className="form-group">
              <label>Nome:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Descrizione:</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="form-textarea"
                rows={3}
              />
            </div>
          </div>

          {/* Campi specifici per eventi base */}
          {element.type === 'basic-event' && (
            <div className="form-section">
              <h4>Parametri di Affidabilità</h4>
              <div className="form-group">
                <label>Tasso di Guasto (λ):</label>
                <input
                  type="number"
                  step="any"
                  value={eventFields.failureRate}
                  onChange={(e) => handleEventFieldChange('failureRate', e.target.value)}
                  className="form-input"
                  placeholder="es. 0.001"
                />
                <span className="form-help">Guasti per unità di tempo</span>
              </div>
              <div className="form-group">
                <label>Tasso di Riparazione (μ):</label>
                <input
                  type="number"
                  step="any"
                  value={eventFields.repairRate}
                  onChange={(e) => handleEventFieldChange('repairRate', e.target.value)}
                  className="form-input"
                  placeholder="es. 0.1"
                />
                <span className="form-help">Riparazioni per unità di tempo</span>
              </div>
              <div className="form-group">
                <label>Fattore di Dormancy:</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="1"
                  value={eventFields.dormancyFactor}
                  onChange={(e) => handleEventFieldChange('dormancyFactor', e.target.value)}
                  className="form-input"
                  placeholder="es. 0.5"
                />
                <span className="form-help">Valore tra 0 e 1</span>
              </div>
              <div className="form-group">
                <label>Intervallo di Test:</label>
                <input
                  type="number"
                  step="any"
                  value={eventFields.testInterval}
                  onChange={(e) => handleEventFieldChange('testInterval', e.target.value)}
                  className="form-input"
                  placeholder="es. 720"
                />
                <span className="form-help">Ore tra i test</span>
              </div>
            </div>
          )}

          {/* Campi specifici per porte */}
          {element.type === 'gate' && (
            <div className="form-section">
              <h4>Parametri Porta {(element as Gate).gateType}</h4>
              
              {((element as Gate).gateType === 'PAND' || (element as Gate).gateType === 'SEQ') && (
                <div className="form-group">
                  <label>Priorità/Ordine:</label>
                  <input
                    type="text"
                    value={gateFields.priority}
                    onChange={(e) => handleGateFieldChange('priority', e.target.value)}
                    className="form-input"
                    placeholder="es. A,B,C"
                  />
                  <span className="form-help">Ordine degli eventi separati da virgola</span>
                </div>
              )}

              {(element as Gate).gateType === 'SPARE' && (
                <>
                  <div className="form-group">
                    <label>Tipo di Spare:</label>
                    <select
                      value={gateFields.spareType}
                      onChange={(e) => handleGateFieldChange('spareType', e.target.value)}
                      className="form-select"
                    >
                      <option value="">Seleziona tipo</option>
                      <option value="cold">Cold Spare</option>
                      <option value="warm">Warm Spare</option>
                      <option value="hot">Hot Spare</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tempo di Commutazione:</label>
                    <input
                      type="number"
                      step="any"
                      value={gateFields.switchingTime}
                      onChange={(e) => handleGateFieldChange('switchingTime', e.target.value)}
                      className="form-input"
                      placeholder="es. 0.1"
                    />
                    <span className="form-help">Tempo per attivare lo spare (ore)</span>
                  </div>
                </>
              )}

              {(element as Gate).gateType === 'FDEP' && (
                <div className="form-group">
                  <label>Ritardo di Propagazione:</label>
                  <input
                    type="number"
                    step="any"
                    value={gateFields.delay}
                    onChange={(e) => handleGateFieldChange('delay', e.target.value)}
                    className="form-input"
                    placeholder="es. 0.01"
                  />
                  <span className="form-help">Ritardo nella propagazione del guasto</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Annulla
          </button>
          <button className="save-button" onClick={handleSave}>
            Salva
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParameterModal;
