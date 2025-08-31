import React, { useState } from 'react';
import { FaultTreeModel } from '../../types/FaultTree';
import { MatlabExportService } from '../../services/matlab-export-service';
import './MatlabExportModal.css';

interface MatlabExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  faultTreeModel: FaultTreeModel;
  missionTime?: number;
}

const MatlabExportModal: React.FC<MatlabExportModalProps> = ({ 
  isOpen, 
  onClose, 
  faultTreeModel, 
  missionTime = 500 
}) => {
  const [filename, setFilename] = useState(`fault-tree-${new Date().toISOString().split('T')[0]}.m`);
  const [tm, setTm] = useState(missionTime);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!filename.trim()) {
      alert('Inserisci un nome file valido');
      return;
    }

    if (tm <= 0) {
      alert('Il tempo di missione deve essere maggiore di 0');
      return;
    }

    setIsExporting(true);
    
    try {
      // Validate model has elements
      if (faultTreeModel.events.length === 0 && faultTreeModel.gates.length === 0) {
        alert('Il modello di fault tree è vuoto. Aggiungi almeno un evento base o una porta.');
        return;
      }

      // Export to MATLAB
      await MatlabExportService.exportToMatlab(faultTreeModel, {
        missionTime: tm,
        filename: filename.endsWith('.m') ? filename : `${filename}.m`
      });

      alert('File MATLAB esportato con successo!');
      onClose();
    } catch (error) {
      alert(`Errore durante l'esportazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="matlab-export-modal-overlay" onClick={onClose}>
      <div className="matlab-export-modal" onClick={e => e.stopPropagation()}>
        <div className="matlab-export-modal-header">
          <h2>🧮 Esporta MATLAB</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="matlab-export-modal-content">
          <div className="export-info">
            <h3>📊 Informazioni Modello</h3>
            <div className="model-stats">
              <div className="stat-item">
                <span className="stat-label">Eventi Base:</span>
                <span className="stat-value">{faultTreeModel.events.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Porte:</span>
                <span className="stat-value">{faultTreeModel.gates.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Connessioni:</span>
                <span className="stat-value">{faultTreeModel.connections.length}</span>
              </div>
            </div>
          </div>

          <div className="export-options">
            <div className="form-group">
              <label htmlFor="filename">📁 Nome File:</label>
              <input
                id="filename"
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="fault-tree.m"
              />
            </div>

            <div className="form-group">
              <label htmlFor="missionTime">⏱️ Tempo di Missione (Tm) [h]:</label>
              <input
                id="missionTime"
                type="number"
                value={tm}
                onChange={(e) => setTm(Number(e.target.value))}
                placeholder="500"
                min="0"
                step="0.1"
              />
              <small className="form-help">
                Tempo di missione in ore per l'analisi del fault tree
              </small>
            </div>
          </div>

          <div className="export-preview">
            <h4>📋 Anteprima Struttura</h4>
            <div className="preview-content">
              <p><strong>Formato MATLAB:</strong> Bottom-up ordering</p>
              <p><strong>Eventi Base:</strong> BasicEvent('nome', 'failure_prob', 'repair_prob', [params_failure], [params_repair])</p>
              <p><strong>Porte:</strong> Gate('nome', 'tipo', false, [inputs])</p>
              <p><strong>Porte SPARE/FDEP:</strong> Gate('nome', 'tipo', false, [primary_inputs], [secondary_inputs])</p>
            </div>
          </div>
        </div>

        <div className="matlab-export-modal-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isExporting}
          >
            Annulla
          </button>
          <button 
            className="export-button primary" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Esportazione...' : '🧮 Esporta MATLAB'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatlabExportModal;
