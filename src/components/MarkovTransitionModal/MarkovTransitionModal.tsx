import React, { useState, useCallback, useEffect } from 'react';
import { MarkovTransition } from '../../types/MarkovChain';
import { DistributionType, ProbabilityDistribution } from '../../types/FaultTree';
import './MarkovTransitionModal.css';

interface MarkovTransitionModalProps {
  transition: MarkovTransition;
  onSave: (transition: MarkovTransition) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

const MarkovTransitionModal: React.FC<MarkovTransitionModalProps> = ({
  transition,
  onSave,
  onClose,
  isDarkMode
}) => {
  const [distributionType, setDistributionType] = useState<DistributionType>(
    transition.probabilityDistribution.type
  );

  // Distribution parameters
  const [constant, setConstant] = useState(
    transition.probabilityDistribution.type === 'constant'
      ? transition.probabilityDistribution.probability
      : 0.5
  );
  const [lambda, setLambda] = useState(
    transition.probabilityDistribution.type === 'exponential'
      ? transition.probabilityDistribution.lambda
      : 1.0
  );
  const [weibullK, setWeibullK] = useState(
    transition.probabilityDistribution.type === 'weibull'
      ? transition.probabilityDistribution.k
      : 1.0
  );
  const [weibullLambda, setWeibullLambda] = useState(
    transition.probabilityDistribution.type === 'weibull'
      ? transition.probabilityDistribution.lambda
      : 1.0
  );
  const [weibullMu, setWeibullMu] = useState(
    transition.probabilityDistribution.type === 'weibull'
      ? transition.probabilityDistribution.mu
      : 0.0
  );
  const [normalMu, setNormalMu] = useState(
    transition.probabilityDistribution.type === 'normal'
      ? transition.probabilityDistribution.mu
      : 0.0
  );
  const [normalSigma, setNormalSigma] = useState(
    transition.probabilityDistribution.type === 'normal'
      ? transition.probabilityDistribution.sigma
      : 1.0
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validateInputs = useCallback(() => {
    const newErrors: Record<string, string> = {};

    switch (distributionType) {
      case 'constant':
        if (constant < 0 || constant > 1) {
          newErrors.constant = 'Probability must be between 0 and 1';
        }
        break;
      case 'exponential':
        if (lambda <= 0) {
          newErrors.lambda = 'Lambda must be positive';
        }
        break;
      case 'weibull':
        if (weibullK <= 0) {
          newErrors.weibullK = 'Shape parameter (k) must be positive';
        }
        if (weibullLambda <= 0) {
          newErrors.weibullLambda = 'Scale parameter (λ) must be positive';
        }
        break;
      case 'normal':
        if (normalSigma <= 0) {
          newErrors.normalSigma = 'Standard deviation (σ) must be positive';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [distributionType, constant, lambda, weibullK, weibullLambda, normalSigma]);

  // Handle save
  const handleSave = useCallback(() => {
    if (validateInputs()) {
      let probabilityDistribution: ProbabilityDistribution;

      switch (distributionType) {
        case 'constant':
          probabilityDistribution = {
            type: 'constant',
            probability: constant
          };
          break;
        case 'exponential':
          probabilityDistribution = {
            type: 'exponential',
            lambda: lambda
          };
          break;
        case 'weibull':
          probabilityDistribution = {
            type: 'weibull',
            k: weibullK,
            lambda: weibullLambda,
            mu: weibullMu
          };
          break;
        case 'normal':
          probabilityDistribution = {
            type: 'normal',
            mu: normalMu,
            sigma: normalSigma
          };
          break;
        default:
          return;
      }

      const updatedTransition: MarkovTransition = {
        ...transition,
        probabilityDistribution
      };

      onSave(updatedTransition);
    }
  }, [transition, distributionType, constant, lambda, weibullK, weibullLambda, weibullMu, normalMu, normalSigma, validateInputs, onSave]);

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
    validateInputs();
  }, [validateInputs]);

  const getDistributionDescription = (type: DistributionType) => {
    switch (type) {
      case 'constant':
        return 'Fixed probability value between 0 and 1';
      case 'exponential':
        return 'Exponential distribution with rate parameter λ';
      case 'weibull':
        return 'Weibull distribution with shape k, scale λ, and location μ';
      case 'normal':
        return 'Normal distribution with mean μ and standard deviation σ';
    }
  };

  const renderDistributionParameters = () => {
    switch (distributionType) {
      case 'constant':
        return (
          <div className="form-group">
            <label htmlFor="constant">
              Probability <span className="required">*</span>
            </label>
            <input
              id="constant"
              type="number"
              value={constant}
              onChange={(e) => setConstant(parseFloat(e.target.value) || 0)}
              min="0"
              max="1"
              step="0.01"
              className={errors.constant ? 'error' : ''}
            />
            {errors.constant && <span className="error-message">{errors.constant}</span>}
            <div className="help-text">
              Constant probability value (0 ≤ p ≤ 1)
            </div>
          </div>
        );

      case 'exponential':
        return (
          <div className="form-group">
            <label htmlFor="lambda">
              Rate Parameter (λ) <span className="required">*</span>
            </label>
            <input
              id="lambda"
              type="number"
              value={lambda}
              onChange={(e) => setLambda(parseFloat(e.target.value) || 0)}
              min="0.001"
              step="0.1"
              className={errors.lambda ? 'error' : ''}
            />
            {errors.lambda && <span className="error-message">{errors.lambda}</span>}
            <div className="help-text">
              Rate parameter λ {'>'} 0 (events per unit time)
            </div>
          </div>
        );

      case 'weibull':
        return (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="weibull-k">
                  Shape (k) <span className="required">*</span>
                </label>
                <input
                  id="weibull-k"
                  type="number"
                  value={weibullK}
                  onChange={(e) => setWeibullK(parseFloat(e.target.value) || 0)}
                  min="0.001"
                  step="0.1"
                  className={errors.weibullK ? 'error' : ''}
                />
                {errors.weibullK && <span className="error-message">{errors.weibullK}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="weibull-lambda">
                  Scale (λ) <span className="required">*</span>
                </label>
                <input
                  id="weibull-lambda"
                  type="number"
                  value={weibullLambda}
                  onChange={(e) => setWeibullLambda(parseFloat(e.target.value) || 0)}
                  min="0.001"
                  step="0.1"
                  className={errors.weibullLambda ? 'error' : ''}
                />
                {errors.weibullLambda && <span className="error-message">{errors.weibullLambda}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="weibull-mu">
                Location (μ)
              </label>
              <input
                id="weibull-mu"
                type="number"
                value={weibullMu}
                onChange={(e) => setWeibullMu(parseFloat(e.target.value) || 0)}
                step="0.1"
              />
              <div className="help-text">
                Location parameter μ (shift along time axis)
              </div>
            </div>
          </>
        );

      case 'normal':
        return (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="normal-mu">
                Mean (μ)
              </label>
              <input
                id="normal-mu"
                type="number"
                value={normalMu}
                onChange={(e) => setNormalMu(parseFloat(e.target.value) || 0)}
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="normal-sigma">
                Std Dev (σ) <span className="required">*</span>
              </label>
              <input
                id="normal-sigma"
                type="number"
                value={normalSigma}
                onChange={(e) => setNormalSigma(parseFloat(e.target.value) || 0)}
                min="0.001"
                step="0.1"
                className={errors.normalSigma ? 'error' : ''}
              />
              {errors.normalSigma && <span className="error-message">{errors.normalSigma}</span>}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark-mode' : ''}`} onClick={onClose}>
      <div 
        className={`markov-transition-modal ${isDarkMode ? 'dark-mode' : ''}`} 
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyPress}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2>Edit Transition Properties</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="distribution-type">
              Probability Distribution <span className="required">*</span>
            </label>
            <select
              id="distribution-type"
              value={distributionType}
              onChange={(e) => setDistributionType(e.target.value as DistributionType)}
            >
              <option value="constant">Constant</option>
              <option value="exponential">Exponential</option>
              <option value="weibull">Weibull</option>
              <option value="normal">Normal</option>
            </select>
            <div className="help-text">
              {getDistributionDescription(distributionType)}
            </div>
          </div>

          {renderDistributionParameters()}

          <div className="transition-info">
            <h4>Transition Information</h4>
            <div className="info-row">
              <span className="label">From State:</span>
              <span className="value">{transition.source}</span>
            </div>
            <div className="info-row">
              <span className="label">To State:</span>
              <span className="value">{transition.target}</span>
            </div>
            <div className="info-row">
              <span className="label">Distribution:</span>
              <span className="value">{distributionType}</span>
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
            disabled={Object.keys(errors).length > 0}
          >
            Save Transition
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

export default MarkovTransitionModal;