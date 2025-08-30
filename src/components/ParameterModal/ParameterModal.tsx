import React, { useState, useEffect } from 'react';
import { BaseEvent, Gate, ProbabilityDistribution, DistributionType } from '../../types/FaultTree';
import './ParameterModal.css';

interface ParameterModalProps {
  element: BaseEvent | Gate;
  onSave: (element: BaseEvent | Gate) => void;
  onClose: () => void;
  faultTreeModel?: { events: BaseEvent[], gates: Gate[] }; // Per ottenere i nomi degli elementi collegati
}

const ParameterModal: React.FC<ParameterModalProps> = ({ element, onSave, onClose, faultTreeModel }) => {
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

  // Stato per le distribuzioni di probabilità
  const [failureDistributionType, setFailureDistributionType] = useState<DistributionType>('exponential');
  const [failureDistributionParams, setFailureDistributionParams] = useState<Record<string, string>>({});
  const [repairDistributionType, setRepairDistributionType] = useState<DistributionType>('exponential');
  const [repairDistributionParams, setRepairDistributionParams] = useState<Record<string, string>>({});
  
  // Stato per gestire riparazione opzionale
  const [isRepairEnabled, setIsRepairEnabled] = useState<boolean>(false);

  // Campi specifici per porte
  const [gateFields, setGateFields] = useState({
    priority: '',
    delay: '',
    spareType: '',
    switchingTime: ''
  });

  // Stato per Failure Gate checkbox
  const [isFailureGate, setIsFailureGate] = useState(false);

  // Stato per gestione input primari/secondari (solo per SPARE e FDEP)
  const [primaryInputs, setPrimaryInputs] = useState<string[]>([]);
  const [secondaryInputs, setSecondaryInputs] = useState<string[]>([]);

  useEffect(() => {
    if (element.parameters) {
      if (element.type === 'basic-event') {
        setEventFields(prev => ({ ...prev, ...element.parameters }));
      } else {
        setGateFields(prev => ({ ...prev, ...element.parameters }));
      }
    }

    // Inizializza i campi specifici delle porte
    if (element.type === 'gate') {
      const gate = element as Gate;
      setIsFailureGate(gate.isFailureGate || false);
      setPrimaryInputs(gate.inputs || []);
      setSecondaryInputs(gate.secondaryInputs || []);
    }

    // Inizializza le distribuzioni di probabilità se presenti
    if (element.type === 'basic-event') {
      const baseEvent = element as BaseEvent;
      
      // Distribuzione di guasto
      if (baseEvent.failureProbabilityDistribution) {
        setFailureDistributionType(baseEvent.failureProbabilityDistribution.type);
        switch (baseEvent.failureProbabilityDistribution.type) {
          case 'exponential':
            setFailureDistributionParams({ lambda: baseEvent.failureProbabilityDistribution.lambda.toString() });
            break;
          case 'weibull':
            setFailureDistributionParams({ 
              k: baseEvent.failureProbabilityDistribution.k.toString(),
              lambda: baseEvent.failureProbabilityDistribution.lambda.toString(),
              mu: baseEvent.failureProbabilityDistribution.mu.toString()
            });
            break;
          case 'normal':
            setFailureDistributionParams({ 
              mu: baseEvent.failureProbabilityDistribution.mu.toString(),
              sigma: baseEvent.failureProbabilityDistribution.sigma.toString()
            });
            break;
          case 'constant':
            setFailureDistributionParams({ probability: baseEvent.failureProbabilityDistribution.probability.toString() });
            break;
        }
      }

      // Distribuzione di riparazione
      if (baseEvent.repairProbabilityDistribution) {
        setIsRepairEnabled(true);
        setRepairDistributionType(baseEvent.repairProbabilityDistribution.type);
        switch (baseEvent.repairProbabilityDistribution.type) {
          case 'exponential':
            setRepairDistributionParams({ lambda: baseEvent.repairProbabilityDistribution.lambda.toString() });
            break;
          case 'weibull':
            setRepairDistributionParams({ 
              k: baseEvent.repairProbabilityDistribution.k.toString(),
              lambda: baseEvent.repairProbabilityDistribution.lambda.toString(),
              mu: baseEvent.repairProbabilityDistribution.mu.toString()
            });
            break;
          case 'normal':
            setRepairDistributionParams({ 
              mu: baseEvent.repairProbabilityDistribution.mu.toString(),
              sigma: baseEvent.repairProbabilityDistribution.sigma.toString()
            });
            break;
          case 'constant':
            setRepairDistributionParams({ probability: baseEvent.repairProbabilityDistribution.probability.toString() });
            break;
        }
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

      // Crea la distribuzione di probabilità di guasto
      let failureProbabilityDistribution: ProbabilityDistribution;
      switch (failureDistributionType) {
        case 'exponential':
          failureProbabilityDistribution = {
            type: 'exponential',
            lambda: parseFloat(failureDistributionParams.lambda) || 0
          };
          break;
        case 'weibull':
          failureProbabilityDistribution = {
            type: 'weibull',
            k: parseFloat(failureDistributionParams.k) || 1,
            lambda: parseFloat(failureDistributionParams.lambda) || 1,
            mu: parseFloat(failureDistributionParams.mu) || 0
          };
          break;
        case 'normal':
          failureProbabilityDistribution = {
            type: 'normal',
            mu: parseFloat(failureDistributionParams.mu) || 0,
            sigma: parseFloat(failureDistributionParams.sigma) || 1
          };
          break;
        case 'constant':
          failureProbabilityDistribution = {
            type: 'constant',
            probability: parseFloat(failureDistributionParams.probability) || 0
          };
          break;
        default:
          failureProbabilityDistribution = {
            type: 'exponential',
            lambda: parseFloat(failureDistributionParams.lambda) || 0
          };
      }

      (updatedElement as BaseEvent).failureProbabilityDistribution = failureProbabilityDistribution;

      // Crea la distribuzione di probabilità di riparazione solo se abilitata
      if (isRepairEnabled) {
        let repairProbabilityDistribution: ProbabilityDistribution;
        switch (repairDistributionType) {
          case 'exponential':
            repairProbabilityDistribution = {
              type: 'exponential',
              lambda: parseFloat(repairDistributionParams.lambda) || 0
            };
            break;
          case 'weibull':
            repairProbabilityDistribution = {
              type: 'weibull',
              k: parseFloat(repairDistributionParams.k) || 1,
              lambda: parseFloat(repairDistributionParams.lambda) || 1,
              mu: parseFloat(repairDistributionParams.mu) || 0
            };
            break;
          case 'normal':
            repairProbabilityDistribution = {
              type: 'normal',
              mu: parseFloat(repairDistributionParams.mu) || 0,
              sigma: parseFloat(repairDistributionParams.sigma) || 1
            };
            break;
          case 'constant':
            repairProbabilityDistribution = {
              type: 'constant',
              probability: parseFloat(repairDistributionParams.probability) || 0
            };
            break;
          default:
            repairProbabilityDistribution = {
              type: 'exponential',
              lambda: parseFloat(repairDistributionParams.lambda) || 0
            };
        }
        (updatedElement as BaseEvent).repairProbabilityDistribution = repairProbabilityDistribution;
      } else {
        // Rimuovi la distribuzione di riparazione se disabilitata
        (updatedElement as BaseEvent).repairProbabilityDistribution = undefined;
      }
    } else if (element.type === 'gate') {
      // Aggiorna i campi specifici delle porte
      (updatedElement as Gate).isFailureGate = isFailureGate;
      (updatedElement as Gate).inputs = primaryInputs;
      (updatedElement as Gate).secondaryInputs = secondaryInputs;
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

  const handleFailureDistributionTypeChange = (type: DistributionType) => {
    setFailureDistributionType(type);
    setFailureDistributionParams({});
  };

  const handleFailureDistributionParamChange = (param: string, value: string) => {
    setFailureDistributionParams(prev => ({ ...prev, [param]: value }));
  };

  const handleRepairDistributionTypeChange = (type: DistributionType) => {
    setRepairDistributionType(type);
    setRepairDistributionParams({});
  };

  const handleRepairDistributionParamChange = (param: string, value: string) => {
    setRepairDistributionParams(prev => ({ ...prev, [param]: value }));
  };

  const handleRepairEnabledChange = (enabled: boolean) => {
    setIsRepairEnabled(enabled);
    if (!enabled) {
      setRepairDistributionParams({});
    }
  };

  // Funzioni per gestire input primari/secondari
  const moveInputToPrimary = (inputId: string) => {
    setSecondaryInputs(prev => prev.filter(id => id !== inputId));
    setPrimaryInputs(prev => [...prev, inputId]);
  };

  const moveInputToSecondary = (inputId: string) => {
    setPrimaryInputs(prev => prev.filter(id => id !== inputId));
    setSecondaryInputs(prev => [...prev, inputId]);
  };

  // Reordering helpers
  const movePrimaryUp = (inputId: string) => {
    setPrimaryInputs(prev => {
      const idx = prev.indexOf(inputId);
      if (idx <= 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const movePrimaryDown = (inputId: string) => {
    setPrimaryInputs(prev => {
      const idx = prev.indexOf(inputId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const moveSecondaryUp = (inputId: string) => {
    setSecondaryInputs(prev => {
      const idx = prev.indexOf(inputId);
      if (idx <= 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const moveSecondaryDown = (inputId: string) => {
    setSecondaryInputs(prev => {
      const idx = prev.indexOf(inputId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  // Funzione per ottenere il nome dell'elemento dato il suo ID
  const getElementName = (elementId: string): string => {
    if (!faultTreeModel) return elementId;
    
    const event = faultTreeModel.events.find(e => e.id === elementId);
    if (event) return event.name;
    
    const gate = faultTreeModel.gates.find(g => g.id === elementId);
    if (gate) return gate.name;
    
    return elementId;
  };

  const getDistributionLabel = (type: DistributionType): string => {
    switch (type) {
      case 'exponential':
        return 'Distribuzione Esponenziale';
      case 'weibull':
        return 'Distribuzione di Weibull (3 parametri)';
      case 'normal':
        return 'Distribuzione Normale (2 parametri)';
      case 'constant':
        return 'Probabilità Costante';
      default:
        return 'Distribuzione Esponenziale';
    }
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
            <>
              {/* Sezione Probabilità di Guasto */}
              <div className="form-section">
                <h4>Probabilità di Guasto</h4>
                <div className="form-group">
                  <label>Tipo di Distribuzione:</label>
                  <select
                    value={failureDistributionType}
                    onChange={(e) => handleFailureDistributionTypeChange(e.target.value as DistributionType)}
                    className="form-select"
                  >
                    <option value="exponential">Distribuzione Esponenziale</option>
                    <option value="weibull">Distribuzione di Weibull (3 parametri)</option>
                    <option value="normal">Distribuzione Normale (2 parametri)</option>
                    <option value="constant">Probabilità Costante</option>
                  </select>
                  <span className="form-help">{getDistributionLabel(failureDistributionType)}</span>
                </div>

                {/* Parametri Distribuzione Esponenziale */}
                {failureDistributionType === 'exponential' && (
                  <div className="distribution-params">
                    <div className="form-group">
                      <label>Tasso di Guasto (λ):</label>
                      <input
                        type="text"
                        value={failureDistributionParams.lambda || ''}
                        onChange={(e) => handleFailureDistributionParamChange('lambda', e.target.value)}
                        className="form-input"
                        placeholder="es. 0.001"
                      />
                      <span className="form-help">Unità: h⁻¹ (ore alla meno 1)</span>
                    </div>
                  </div>
                )}

                {/* Parametri Distribuzione di Weibull */}
                {failureDistributionType === 'weibull' && (
                  <div className="distribution-params">
                    <div className="form-group">
                      <label>Parametro di Forma (k):</label>
                      <input
                        type="text"
                        value={failureDistributionParams.k || ''}
                        onChange={(e) => handleFailureDistributionParamChange('k', e.target.value)}
                        className="form-input"
                        placeholder="es. 2.0"
                      />
                      <span className="form-help">Adimensionale</span>
                    </div>
                    <div className="form-group">
                      <label>Parametro di Scala (λ):</label>
                      <input
                        type="text"
                        value={failureDistributionParams.lambda || ''}
                        onChange={(e) => handleFailureDistributionParamChange('lambda', e.target.value)}
                        className="form-input"
                        placeholder="es. 1000"
                      />
                      <span className="form-help">Unità: h (ore)</span>
                    </div>
                    <div className="form-group">
                      <label>Parametro di Posizione (μ):</label>
                      <input
                        type="text"
                        value={failureDistributionParams.mu || ''}
                        onChange={(e) => handleFailureDistributionParamChange('mu', e.target.value)}
                        className="form-input"
                        placeholder="es. 0"
                      />
                      <span className="form-help">Unità: h (ore)</span>
                    </div>
                  </div>
                )}

                {/* Parametri Distribuzione Normale */}
                {failureDistributionType === 'normal' && (
                  <div className="distribution-params">
                    <div className="form-group">
                      <label>Media (μ):</label>
                      <input
                        type="text"
                        value={failureDistributionParams.mu || ''}
                        onChange={(e) => handleFailureDistributionParamChange('mu', e.target.value)}
                        className="form-input"
                        placeholder="es. 8760"
                      />
                      <span className="form-help">Unità: h (ore)</span>
                    </div>
                    <div className="form-group">
                      <label>Deviazione Standard (σ):</label>
                      <input
                        type="text"
                        value={failureDistributionParams.sigma || ''}
                        onChange={(e) => handleFailureDistributionParamChange('sigma', e.target.value)}
                        className="form-input"
                        placeholder="es. 1000"
                      />
                      <span className="form-help">Unità: h (ore)</span>
                    </div>
                  </div>
                )}

                {/* Parametri Probabilità Costante */}
                {failureDistributionType === 'constant' && (
                  <div className="distribution-params">
                    <div className="form-group">
                      <label>Probabilità Costante:</label>
                      <input
                        type="text"
                        value={failureDistributionParams.probability || ''}
                        onChange={(e) => handleFailureDistributionParamChange('probability', e.target.value)}
                        className="form-input"
                        placeholder="es. 0.001"
                      />
                      <span className="form-help">Adimensionale (0-1)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sezione Probabilità di Riparazione */}
              <div className="form-section">
                <h4>
                  <label className="section-checkbox">
                    <input
                      type="checkbox"
                      checked={isRepairEnabled}
                      onChange={(e) => handleRepairEnabledChange(e.target.checked)}
                    />
                    Probabilità di Riparazione
                  </label>
                </h4>
                
                {isRepairEnabled && (
                  <>
                    <div className="form-group">
                      <label>Tipo di Distribuzione:</label>
                      <select
                        value={repairDistributionType}
                        onChange={(e) => handleRepairDistributionTypeChange(e.target.value as DistributionType)}
                        className="form-select"
                      >
                        <option value="exponential">Distribuzione Esponenziale</option>
                        <option value="weibull">Distribuzione di Weibull (3 parametri)</option>
                        <option value="normal">Distribuzione Normale (2 parametri)</option>
                        <option value="constant">Probabilità Costante</option>
                      </select>
                      <span className="form-help">{getDistributionLabel(repairDistributionType)}</span>
                    </div>

                    {/* Parametri Distribuzione Esponenziale */}
                    {repairDistributionType === 'exponential' && (
                      <div className="distribution-params">
                        <div className="form-group">
                          <label>Tasso di Riparazione (μ):</label>
                          <input
                            type="text"
                            value={repairDistributionParams.lambda || ''}
                            onChange={(e) => handleRepairDistributionParamChange('lambda', e.target.value)}
                            className="form-input"
                            placeholder="es. 0.1"
                          />
                          <span className="form-help">Unità: h⁻¹ (ore alla meno 1)</span>
                        </div>
                      </div>
                    )}

                    {/* Parametri Distribuzione di Weibull */}
                    {repairDistributionType === 'weibull' && (
                      <div className="distribution-params">
                        <div className="form-group">
                          <label>Parametro di Forma (k):</label>
                          <input
                            type="text"
                            value={repairDistributionParams.k || ''}
                            onChange={(e) => handleRepairDistributionParamChange('k', e.target.value)}
                            className="form-input"
                            placeholder="es. 2.0"
                          />
                          <span className="form-help">Adimensionale</span>
                        </div>
                        <div className="form-group">
                          <label>Parametro di Scala (λ):</label>
                          <input
                            type="text"
                            value={repairDistributionParams.lambda || ''}
                            onChange={(e) => handleRepairDistributionParamChange('lambda', e.target.value)}
                            className="form-input"
                            placeholder="es. 100"
                          />
                          <span className="form-help">Unità: h (ore)</span>
                        </div>
                        <div className="form-group">
                          <label>Parametro di Posizione (μ):</label>
                          <input
                            type="text"
                            value={repairDistributionParams.mu || ''}
                            onChange={(e) => handleRepairDistributionParamChange('mu', e.target.value)}
                            className="form-input"
                            placeholder="es. 0"
                          />
                          <span className="form-help">Unità: h (ore)</span>
                        </div>
                      </div>
                    )}

                    {/* Parametri Distribuzione Normale */}
                    {repairDistributionType === 'normal' && (
                      <div className="distribution-params">
                        <div className="form-group">
                          <label>Media (μ):</label>
                          <input
                            type="text"
                            value={repairDistributionParams.mu || ''}
                            onChange={(e) => handleRepairDistributionParamChange('mu', e.target.value)}
                            className="form-input"
                            placeholder="es. 24"
                          />
                          <span className="form-help">Unità: h (ore)</span>
                        </div>
                        <div className="form-group">
                          <label>Deviazione Standard (σ):</label>
                          <input
                            type="text"
                            value={repairDistributionParams.sigma || ''}
                            onChange={(e) => handleRepairDistributionParamChange('sigma', e.target.value)}
                            className="form-input"
                            placeholder="es. 4"
                          />
                          <span className="form-help">Unità: h (ore)</span>
                        </div>
                      </div>
                    )}

                    {/* Parametri Probabilità Costante */}
                    {repairDistributionType === 'constant' && (
                      <div className="distribution-params">
                        <div className="form-group">
                          <label>Probabilità Costante:</label>
                          <input
                            type="text"
                            value={repairDistributionParams.probability || ''}
                            onChange={(e) => handleRepairDistributionParamChange('probability', e.target.value)}
                            className="form-input"
                            placeholder="es. 0.8"
                          />
                          <span className="form-help">Adimensionale (0-1)</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Sezione Altri Parametri */}
              <div className="form-section">
                <h4>Altri Parametri</h4>
                <div className="form-group">
                  <label>Fattore di Dormancy:</label>
                  <input
                    type="text"
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
                    type="text"
                    value={eventFields.testInterval}
                    onChange={(e) => handleEventFieldChange('testInterval', e.target.value)}
                    className="form-input"
                    placeholder="es. 720"
                  />
                  <span className="form-help">Ore tra i test</span>
                </div>
              </div>
            </>
          )}

          {/* Campi specifici per porte */}
          {element.type === 'gate' && (
            <>
              {/* Sezione Failure Gate */}
              <div className="form-section">
                <h4>Configurazione Porta {(element as Gate).gateType}</h4>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isFailureGate}
                      onChange={(e) => setIsFailureGate(e.target.checked)}
                      className="form-checkbox"
                    />
                    <span className="checkbox-text">Failure Gate</span>
                  </label>
                  <span className="form-help">
                    Indica se questa porta rappresenta un guasto (default: false)
                  </span>
                </div>
              </div>

              {/* Sezione Input Primari/Secondari per SPARE e FDEP */}
              {((element as Gate).gateType === 'SPARE' || (element as Gate).gateType === 'FDEP') && (
                <div className="form-section">
                  <h4>Gestione Input - {(element as Gate).gateType}</h4>
                  <p className="section-description">
                    Per le porte {(element as Gate).gateType}, è possibile distinguere tra input primari e secondari.
                    Trascina gli elementi tra le due liste per configurarli.
                  </p>
                  
                  <div className="input-management">
                    <div className="input-list">
                      <h5>🔵 Input Primari ({primaryInputs.length})</h5>
                      <div className="input-items">
                        {primaryInputs.map((inputId, idx) => (
                          <div key={inputId} className="input-item primary">
                            <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                              <button
                                type="button"
                                className="move-button"
                                onClick={() => movePrimaryUp(inputId)}
                                title="Sposta su"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="move-button"
                                onClick={() => movePrimaryDown(inputId)}
                                title="Sposta giù"
                              >
                                ▼
                              </button>
                              <span className="input-name">{getElementName(inputId)}</span>
                            </div>
                            <div>
                              <button
                                type="button"
                                className="move-button"
                                onClick={() => moveInputToSecondary(inputId)}
                                title="Sposta a secondari"
                              >
                                ➡️
                              </button>
                            </div>
                          </div>
                        ))}
                        {primaryInputs.length === 0 && (
                          <div className="empty-list">Nessun input primario</div>
                        )}
                      </div>
                    </div>

                    <div className="input-list">
                      <h5>🟡 Input Secondari ({secondaryInputs.length})</h5>
                      <div className="input-items">
                        {secondaryInputs.map((inputId) => (
                          <div key={inputId} className="input-item secondary">
                            <div>
                              <button
                                type="button"
                                className="move-button"
                                onClick={() => moveInputToPrimary(inputId)}
                                title="Sposta a primari"
                              >
                                ⬅️
                              </button>
                            </div>
                            <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                              <span className="input-name">{getElementName(inputId)}</span>
                              <button
                                type="button"
                                className="move-button"
                                onClick={() => moveSecondaryUp(inputId)}
                                title="Sposta su"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="move-button"
                                onClick={() => moveSecondaryDown(inputId)}
                                title="Sposta giù"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        ))}
                        {secondaryInputs.length === 0 && (
                          <div className="empty-list">Nessun input secondario</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-section">
                <h4>Altri Parametri</h4>
                
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
            </>
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
