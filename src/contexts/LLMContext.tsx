import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LLMProviders, loadLLMConfig, saveLLMConfig } from '../config/llm-config';

interface LLMContextType {
  llmConfig: LLMProviders;
  updateLLMConfig: (newConfig: LLMProviders) => void;
  showLLMConfigModal: boolean;
  setShowLLMConfigModal: (show: boolean) => void;
  currentProvider: string;
  setCurrentProvider: (provider: string) => void;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

export const useLLMConfig = () => {
  const context = useContext(LLMContext);
  if (context === undefined) {
    throw new Error('useLLMConfig must be used within a LLMProvider');
  }
  return context;
};

interface LLMProviderProps {
  children: ReactNode;
}

export const LLMProvider: React.FC<LLMProviderProps> = ({ children }) => {
  const [llmConfig, setLlmConfig] = useState<LLMProviders>(loadLLMConfig());
  const [showLLMConfigModal, setShowLLMConfigModal] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>(
    localStorage.getItem('selectedLLMProvider') || 'local'
  );

  const updateLLMConfig = useCallback((newConfig: LLMProviders) => {
    setLlmConfig(newConfig);
    saveLLMConfig(newConfig);
  }, []);

  const handleSetCurrentProvider = useCallback((provider: string) => {
    setCurrentProvider(provider);
    localStorage.setItem('selectedLLMProvider', provider);
  }, []);

  const value: LLMContextType = {
    llmConfig,
    updateLLMConfig,
    showLLMConfigModal,
    setShowLLMConfigModal,
    currentProvider,
    setCurrentProvider: handleSetCurrentProvider
  };

  return (
    <LLMContext.Provider value={value}>
      {children}
    </LLMContext.Provider>
  );
};