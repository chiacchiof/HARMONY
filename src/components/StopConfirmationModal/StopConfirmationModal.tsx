import React from 'react';
import './StopConfirmationModal.css';

interface StopConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  simulationProgress?: number;
}

const StopConfirmationModal: React.FC<StopConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  simulationProgress = 0
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="stop-confirmation-overlay" onClick={onClose}>
      <div className="stop-confirmation-modal" onClick={e => e.stopPropagation()}>
        <div className="stop-confirmation-header">
          <h2>⚠️ Conferma Interruzione</h2>
        </div>

        <div className="stop-confirmation-content">
          <div className="warning-icon">🛑</div>
          
          <div className="confirmation-message">
            <h3>Sei sicuro di voler interrompere la simulazione?</h3>
            
            <div className="simulation-info">
              <div className="progress-info">
                <span className="label">Progresso attuale:</span>
                <div className="mini-progress-bar">
                  <div 
                    className="mini-progress-fill"
                    style={{ width: `${simulationProgress}%` }}
                  ></div>
                  <span className="progress-text">{simulationProgress.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="warning-details">
              <p>⚠️ <strong>Attenzione:</strong></p>
              <ul>
                <li>La simulazione MATLAB verrà terminata immediatamente</li>
                <li>I risultati parziali potrebbero essere perduti</li>
                <li>Dovrai riavviare la simulazione dall'inizio</li>
              </ul>
            </div>

            <div className="recommendation">
              <p>💡 <strong>Suggerimento:</strong> Se la simulazione sta procedendo normalmente, è consigliabile attendere il completamento automatico.</p>
            </div>
          </div>
        </div>

        <div className="stop-confirmation-actions">
          <button 
            className="cancel-button"
            onClick={onClose}
          >
            ↩️ Continua Simulazione
          </button>
          
          <button 
            className="confirm-stop-button"
            onClick={handleConfirm}
          >
            🛑 Sì, Interrompi
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopConfirmationModal;