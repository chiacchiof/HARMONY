import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PanelContextValue {
  isRightPanelCollapsed: boolean;
  toggleRightPanel: () => void;
  setRightPanelCollapsed: (isCollapsed: boolean) => void;
}

const PanelContext = createContext<PanelContextValue | undefined>(undefined);

interface PanelProviderProps {
  children: ReactNode;
}

export const PanelProvider: React.FC<PanelProviderProps> = ({ children }) => {
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(() => {
    // Try to load panel preference from localStorage
    const savedPanelState = localStorage.getItem('shiftai-right-panel-collapsed');
    return savedPanelState === 'true';
  });

  // Save panel preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shiftai-right-panel-collapsed', isRightPanelCollapsed ? 'true' : 'false');
  }, [isRightPanelCollapsed]);

  const toggleRightPanel = () => {
    setIsRightPanelCollapsed(prev => !prev);
  };

  const setRightPanelCollapsed = (isCollapsed: boolean) => {
    setIsRightPanelCollapsed(isCollapsed);
  };

  const value: PanelContextValue = {
    isRightPanelCollapsed,
    toggleRightPanel,
    setRightPanelCollapsed
  };

  return (
    <PanelContext.Provider value={value}>
      {children}
    </PanelContext.Provider>
  );
};

export const usePanel = (): PanelContextValue => {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error('usePanel must be used within a PanelProvider');
  }
  return context;
};