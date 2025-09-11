import React, { useState, useCallback, useEffect } from 'react';
import { MarkovState } from '../../types/MarkovChain';
import './MarkovStateModal.css';

interface MarkovStateModalProps {
  state: MarkovState;
  onSave: (state: MarkovState) => void;
  onClose: () => void;
  isDarkMode: boolean;
  onRemoveTransitions?: (stateId: string) => void;
}

const MarkovStateModal: React.FC<MarkovStateModalProps> = ({
  state,
  onSave,
  onClose,
  isDarkMode,
  onRemoveTransitions
}) => {
  const [name, setName] = useState(state.name);
  const [description, setDescription] = useState(state.description || '');
  const [rewardFunction, setRewardFunction] = useState(state.rewardFunction);
  const [isAbsorbing, setIsAbsorbing] = useState(state.isAbsorbing);
  const [nameError, setNameError] = useState('');
  const [rewardError, setRewardError] = useState('');

  // Validation
  const validateInputs = useCallback(() => {
    let isValid = true;

    // Validate name
    if (!name.trim()) {
      setNameError('State name is required');
      isValid = false;
    } else if (name.trim().length > 50) {
      setNameError('State name must be 50 characters or less');
      isValid = false;
    } else {
      setNameError('');
    }

    // Validate reward function
    if (isNaN(rewardFunction) || rewardFunction < 0) {
      setRewardError('Reward function must be a non-negative number');
      isValid = false;
    } else {
      setRewardError('');
    }

    return isValid;
  }, [name, rewardFunction]);

  // Handle absorbing state toggle
  const handleAbsorbingToggle = useCallback((checked: boolean) => {
    if (checked && onRemoveTransitions) {
      // If setting as absorbing state, remove existing outgoing transitions
      onRemoveTransitions(state.id);
    }
    setIsAbsorbing(checked);
  }, [state.id, onRemoveTransitions]);

  // Handle save
  const handleSave = useCallback(() => {
    if (validateInputs()) {
      const updatedState: MarkovState = {
        ...state,
        name: name.trim(),
        description: description.trim() || undefined,
        rewardFunction,
        isAbsorbing
      };
      onSave(updatedState);
    }
  }, [state, name, description, rewardFunction, isAbsorbing, onSave, validateInputs]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSave, onClose]);

  // Auto-validate on input changes
  useEffect(() => {
    if (name.trim() || rewardFunction !== state.rewardFunction) {
      validateInputs();
    }
  }, [name, rewardFunction, state.rewardFunction, validateInputs]);

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark-mode' : ''}`} onClick={onClose}>
      <div 
        className={`markov-state-modal ${isDarkMode ? 'dark-mode' : ''}`} 
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyPress}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2>Edit State Properties</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="state-name">
              State Name <span className="required">*</span>
            </label>
            <input
              id="state-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter state name (e.g., S1, Working, Failed)"
              className={nameError ? 'error' : ''}
              maxLength={50}
              autoFocus
            />
            {nameError && <span className="error-message">{nameError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="state-description">
              Description
            </label>
            <textarea
              id="state-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of the state"
              rows={3}
              maxLength={500}
            />
            <div className="character-count">
              {description.length}/500
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reward-function">
                Reward Function <span className="required">*</span>
              </label>
              <input
                id="reward-function"
                type="number"
                value={rewardFunction}
                onChange={(e) => setRewardFunction(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                placeholder="1.0"
                className={rewardError ? 'error' : ''}
              />
              {rewardError && <span className="error-message">{rewardError}</span>}
              <div className="help-text">
                The reward value associated with being in this state (default: 1)
              </div>
            </div>

            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isAbsorbing}
                  onChange={(e) => handleAbsorbingToggle(e.target.checked)}
                />
                <span className="toggle-switch"></span>
                Absorbing State
              </label>
              <div className="help-text">
                An absorbing state is one where the process ends (no outgoing transitions)
              </div>
            </div>
          </div>

          <div className="state-preview">
            <h4>Preview</h4>
            <div className={`preview-state ${isAbsorbing ? 'absorbing' : ''}`}>
              <div className="preview-circle">
                <div className="preview-name">{name || 'State'}</div>
                {rewardFunction !== 1 && (
                  <div className="preview-reward">R: {rewardFunction}</div>
                )}
              </div>
              {isAbsorbing && <div className="preview-indicator">Absorbing</div>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="button primary" 
            onClick={handleSave}
            disabled={!!nameError || !!rewardError}
          >
            Save State
          </button>
        </div>

        <div className="keyboard-shortcuts">
          <small>
            Press <kbd>Ctrl+Enter</kbd> to save, <kbd>Esc</kbd> to cancel
          </small>
        </div>
      </div>
    </div>
  );
};

export default MarkovStateModal;