import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LLMProviders, loadLLMConfig, saveLLMConfig } from '../config/llm-config';

interface LLMContextType {
  llmConfig: LLMProviders;
  updateLLMConfig: (newConfig: LLMProviders) => void;
  showLLMConfigModal: boolean;
  setShowLLMConfigModal: (show: boolean) => void;
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

  const updateLLMConfig = useCallback((newConfig: LLMProviders) => {
    setLlmConfig(newConfig);
    saveLLMConfig(newConfig);
  }, []);

  const value: LLMContextType = {
    llmConfig,
    updateLLMConfig,
    showLLMConfigModal,
    setShowLLMConfigModal
  };

  return (
    <LLMContext.Provider value={value}>
      {children}
    </LLMContext.Provider>
  );
};