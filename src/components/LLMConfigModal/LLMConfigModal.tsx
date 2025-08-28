import React, { useState, useEffect } from 'react';
import { LLMProviders, LLMConfig, defaultLLMConfig, saveLLMConfig, validateLLMConfig } from '../../config/llm-config';
import './LLMConfigModal.css';

interface LLMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange: (config: LLMProviders) => void;
}

const LLMConfigModal: React.FC<LLMConfigModalProps> = ({ isOpen, onClose, onConfigChange }) => {
  const [config, setConfig] = useState<LLMProviders>(defaultLLMConfig);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<string>('openai');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      // Carica la configurazione salvata
      const saved = localStorage.getItem('llm-config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig({ ...defaultLLMConfig, ...parsed });
        } catch (error) {
          console.warn('Errore nel caricamento configurazione LLM:', error);
        }
      }
      // Reset stati
      setErrors({});
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleConfigChange = (provider: keyof LLMProviders, field: keyof LLMConfig, value: any) => {
    const newConfig = {
      ...config,
      [provider]: {
        ...config[provider],
        [field]: value
      }
    };
    setConfig(newConfig);
    
    // Valida la configurazione
    const providerErrors = validateLLMConfig(newConfig[provider]);
    setErrors(prev => ({
      ...prev,
      [provider]: providerErrors
    }));
  };

  const handleSave = () => {
    console.log('Saving config:', config);
    
    // Valida solo i provider abilitati
    const allErrors: Record<string, string[]> = {};
    let hasBlockingErrors = false;

    Object.entries(config).forEach(([provider, providerConfig]) => {
      // Valida solo se il provider è abilitato
      if (providerConfig.enabled) {
        const providerErrors = validateLLMConfig(providerConfig);
        console.log(`Provider ${provider} errors:`, providerErrors);
        if (providerErrors.length > 0) {
          allErrors[provider] = providerErrors;
          // Solo i provider esterni abilitati causano errori bloccanti
          if (provider !== 'local') {
            hasBlockingErrors = true;
          }
        }
      }
    });

    // Controlla se c'è almeno un provider utilizzabile
    const hasValidProvider = Object.values(config).some(provider => {
      if (!provider.enabled) return false;
      if (provider.provider === 'local') return true;
      return provider.apiKey && provider.apiKey.trim() !== '';
    });

    if (hasBlockingErrors && !hasValidProvider) {
      console.log('Validation errors prevent saving:', allErrors);
      setErrors(allErrors);
      return;
    }

    console.log('Saving configuration...');
    // Salva la configurazione
    saveLLMConfig(config);
    onConfigChange(config);
    
    // Mostra messaggio di successo
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    setConfig(defaultLLMConfig);
    setErrors({});
  };

  const renderProviderConfig = (providerKey: keyof LLMProviders) => {
    const provider = config[providerKey];
    const providerErrors = errors[providerKey] || [];

    return (
      <div className="provider-config">
        <div className="provider-header">
          <h3>{getProviderDisplayName(providerKey)}</h3>
          <label className="enabled-toggle">
            <input
              type="checkbox"
              checked={provider.enabled}
              onChange={(e) => handleConfigChange(providerKey, 'enabled', e.target.checked)}
            />
            Abilitato
          </label>
        </div>

        <div className="config-fields">
          <div className="field-group">
            <label>API Key:</label>
            <input
              type="password"
              value={provider.apiKey}
              onChange={(e) => handleConfigChange(providerKey, 'apiKey', e.target.value)}
              placeholder={`Inserisci API Key per ${getProviderDisplayName(providerKey)}`}
              disabled={providerKey === 'local'}
            />
            {providerKey === 'local' && (
              <span className="field-help">Non richiesto per il modello locale</span>
            )}
          </div>

          <div className="field-group">
            <label>Modello:</label>
            <input
              type="text"
              value={provider.model}
              onChange={(e) => handleConfigChange(providerKey, 'model', e.target.value)}
              placeholder="Nome del modello"
            />
          </div>

          <div className="field-group">
            <label>Base URL:</label>
            <input
              type="text"
              value={provider.baseUrl || ''}
              onChange={(e) => handleConfigChange(providerKey, 'baseUrl', e.target.value)}
              placeholder="URL base dell'API"
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>Temperatura:</label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={provider.temperature || 0.7}
                onChange={(e) => handleConfigChange(providerKey, 'temperature', parseFloat(e.target.value))}
              />
              <span className="field-help">0.0 - 2.0</span>
            </div>

            <div className="field-group">
              <label>Max Tokens:</label>
              <input
                type="number"
                min="1"
                value={provider.maxTokens || 1000}
                onChange={(e) => handleConfigChange(providerKey, 'maxTokens', parseInt(e.target.value))}
              />
            </div>
          </div>

          {providerErrors.length > 0 && (
            <div className="error-list">
              {providerErrors.map((error, index) => (
                <div key={index} className="error-item">
                  ⚠️ {error}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getProviderDisplayName = (provider: string): string => {
    const names = {
      openai: 'OpenAI (GPT)',
      anthropic: 'Anthropic (Claude)',
      gemini: 'Google Gemini',
      grok: 'Grok (xAI)',
      local: 'Modello Locale'
    };
    return names[provider as keyof typeof names] || provider;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="llm-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Configurazione LLM</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="tabs">
            {Object.keys(config).map((provider) => (
              <button
                key={provider}
                className={`tab ${activeTab === provider ? 'active' : ''}`}
                onClick={() => setActiveTab(provider)}
              >
                {getProviderDisplayName(provider)}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {renderProviderConfig(activeTab as keyof LLMProviders)}
          </div>

          <div className="config-info">
            <h4>💡 Informazioni sui Provider</h4>
            <div className="info-grid">
              <div className="info-item">
                <strong>OpenAI:</strong> GPT-4, GPT-3.5-turbo
              </div>
              <div className="info-item">
                <strong>Anthropic:</strong> Claude-3 Haiku, Sonnet, Opus
              </div>
              <div className="info-item">
                <strong>Gemini:</strong> Gemini 1.5 Flash, Pro
              </div>
              <div className="info-item">
                <strong>Grok:</strong> Grok-beta (xAI)
              </div>
              <div className="info-item">
                <strong>Locale:</strong> Ollama, LM Studio, etc.
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="reset-button" onClick={handleReset}>
            🔄 Reset
          </button>
          <div className="footer-buttons">
            {saveSuccess && (
              <div className="save-success">
                ✅ Configurazione salvata!
              </div>
            )}
            <button className="cancel-button" onClick={onClose}>
              Annulla
            </button>
            <button className="save-button" onClick={handleSave} disabled={saveSuccess}>
              {saveSuccess ? '✅ Salvato!' : '💾 Salva Configurazione'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMConfigModal;
