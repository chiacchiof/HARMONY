import React, { useState } from 'react';
import { FileService, FileExportOptions } from '../../services/file-service';
import { FaultTreeModel } from '../../types/FaultTree';
import './SaveModal.css';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  faultTreeModel: FaultTreeModel;
}

const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, faultTreeModel }) => {
  const [filename, setFilename] = useState(FileService.generateDefaultFilename());
  const [format, setFormat] = useState<'json' | 'xml' | 'csv'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!filename.trim()) {
      alert('Inserisci un nome file valido');
      return;
    }

    setIsSaving(true);
    
    try {
      // Validazione del modello
      const validation = FileService.validateModel(faultTreeModel);
      if (!validation.isValid) {
        alert(`Errore di validazione:\n${validation.errors.join('\n')}`);
        return;
      }

      // Salvataggio in base al formato
      switch (format) {
        case 'json':
          await FileService.saveFaultTree(faultTreeModel, `${filename}.json`);
          break;
        case 'xml':
          await FileService.exportToXML(faultTreeModel, `${filename}.xml`);
          break;
        case 'csv':
          await FileService.exportToCSV(faultTreeModel, `${filename}.csv`);
          break;
      }

      alert('File salvato con successo!');
      onClose();
    } catch (error) {
      alert(`Errore durante il salvataggio: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSave = async () => {
    try {
      await FileService.saveFaultTree(faultTreeModel);
      onClose();
    } catch (error) {
      alert(`Errore durante il salvataggio rapido: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  };

  const handleClose = () => {
    // Reset dello stato quando si chiude il modal
    setFilename(FileService.generateDefaultFilename());
    setFormat('json');
    setIncludeMetadata(true);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="save-modal-overlay" onClick={handleClose}>
      <div className="save-modal" onClick={(e) => e.stopPropagation()}>
        <div className="save-modal-header">
          <h2>💾 Salva Fault Tree</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="save-modal-content">
          <div className="info-message">
            <p>💡 <strong>Nuovo!</strong> Ora puoi scegliere la cartella di destinazione e modificare il nome file per tutti i tipi di salvataggio.</p>
          </div>

          <div className="form-group">
            <label htmlFor="filename">Nome File:</label>
            <input
              id="filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Inserisci nome file"
              className="filename-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="format">Formato:</label>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'json' | 'xml' | 'csv')}
              className="format-select"
            >
              <option value="json">JSON (.json)</option>
              <option value="xml">XML (.xml)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
              />
              Includi metadati (data, versione, ecc.)
            </label>
          </div>

          <div className="file-info">
            <h4>Informazioni File:</h4>
            <ul>
              <li>📊 Eventi: {faultTreeModel.events.length}</li>
              <li>🔌 Porte: {faultTreeModel.gates.length}</li>
              <li>🔗 Connessioni: {faultTreeModel.connections.length}</li>
              <li>📁 Formato: {format.toUpperCase()}</li>
            </ul>
          </div>
        </div>

        <div className="save-modal-actions">
          <button 
            className="save-button primary" 
            onClick={handleSave}
            disabled={isSaving || !filename.trim()}
          >
            {isSaving ? '⏳ Salvando...' : '💾 Salva'}
          </button>
          
          <button 
            className="save-button secondary" 
            onClick={handleQuickSave}
            disabled={isSaving}
          >
            🚀 Salvataggio Rapido (JSON)
          </button>
          
          <button 
            className="cancel-button" 
            onClick={handleClose}
            disabled={isSaving}
          >
            ❌ Annulla
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveModal;
