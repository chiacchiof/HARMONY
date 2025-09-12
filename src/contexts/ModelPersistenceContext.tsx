import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModelPersistenceContextType {
  faultTreeSnapshot: string | null;
  markovChainSnapshot: string | null;
  saveFaultTreeSnapshot: (model: any) => void;
  saveMarkovChainSnapshot: (model: any) => void;
  getFaultTreeSnapshot: () => any | null;
  getMarkovChainSnapshot: () => any | null;
  clearSnapshots: () => void;
}

const ModelPersistenceContext = createContext<ModelPersistenceContextType | undefined>(undefined);

export const ModelPersistenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [faultTreeSnapshot, setFaultTreeSnapshot] = useState<string | null>(null);
  const [markovChainSnapshot, setMarkovChainSnapshot] = useState<string | null>(null);

  const saveFaultTreeSnapshot = (model: any) => {
    if (model && (model.events?.length > 0 || model.gates?.length > 0)) {
      setFaultTreeSnapshot(JSON.stringify(model));
    }
  };

  const saveMarkovChainSnapshot = (model: any) => {
    if (model && (model.states?.length > 0 || model.transitions?.length > 0)) {
      setMarkovChainSnapshot(JSON.stringify(model));
    }
  };

  const getFaultTreeSnapshot = () => {
    if (faultTreeSnapshot) {
      try {
        return JSON.parse(faultTreeSnapshot);
      } catch (error) {
        console.error('Error parsing fault tree snapshot:', error);
        return null;
      }
    }
    return null;
  };

  const getMarkovChainSnapshot = () => {
    if (markovChainSnapshot) {
      try {
        return JSON.parse(markovChainSnapshot);
      } catch (error) {
        console.error('Error parsing markov chain snapshot:', error);
        return null;
      }
    }
    return null;
  };

  const clearSnapshots = () => {
    setFaultTreeSnapshot(null);
    setMarkovChainSnapshot(null);
  };

  const value: ModelPersistenceContextType = {
    faultTreeSnapshot,
    markovChainSnapshot,
    saveFaultTreeSnapshot,
    saveMarkovChainSnapshot,
    getFaultTreeSnapshot,
    getMarkovChainSnapshot,
    clearSnapshots
  };

  return (
    <ModelPersistenceContext.Provider value={value}>
      {children}
    </ModelPersistenceContext.Provider>
  );
};

export const useModelPersistence = (): ModelPersistenceContextType => {
  const context = useContext(ModelPersistenceContext);
  if (context === undefined) {
    throw new Error('useModelPersistence must be used within a ModelPersistenceProvider');
  }
  return context;
};