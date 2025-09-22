import React, { useState } from 'react';
import './MenuBar.css';

interface MenuBarProps {
  onSave: () => void | Promise<void>;
  onOpenWithFileSystem: () => void | Promise<void>;
  onExportCode: () => void | Promise<void>;
  onShowSaveModal: () => void;
  onExportXML: () => void | Promise<void>;
  onExportCSV: () => void | Promise<void>;
  onExportMatlab: () => void;
  onShowLLMConfig: () => void;
  onShowSHyFTA?: () => void;
  onShowMSolver?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onNewModel: () => void;
  onClearAllModels?: () => void;
  openedFile?: { filename: string; fileHandle?: FileSystemFileHandle } | null;
  currentEditor?: 'fault-tree' | 'markov-chain';
  onNavigateToFaultTree?: () => void;
  onNavigateToMarkov?: () => void;
  onLogout?: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ 
  onSave, 
  onOpenWithFileSystem,
  onExportCode, 
  onShowSaveModal,
  onExportXML,
  onExportCSV,
  onExportMatlab,
  onShowLLMConfig,
  onShowSHyFTA,
  onShowMSolver,
  isDarkMode,
  onToggleDarkMode,
  onNewModel,
  onClearAllModels,
  openedFile,
  currentEditor,
  onNavigateToFaultTree,
  onNavigateToMarkov,
  onLogout
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);

  const handleSaveClick = () => {
    onShowSaveModal();
    setShowFileMenu(false);
  };

  const handleQuickSave = () => {
    onSave();
    setShowFileMenu(false);
  };

  return (
    <div className={`menu-bar ${isDarkMode ? 'dark-mode' : ''}`}>
              <div className="menu-section">
        <div className="editor-navigation">
          <button 
            className={`editor-nav-button ${currentEditor === 'fault-tree' ? 'active' : ''}`}
            onClick={onNavigateToFaultTree}
          >
            🌳 Fault Tree Editor
          </button>
          <button 
            className={`editor-nav-button ${currentEditor === 'markov-chain' ? 'active' : ''}`}
            onClick={onNavigateToMarkov}
          >
            🔗 Markov Chain Editor
          </button>
        </div>
        {openedFile && (
          <div className="file-info">
            <span>📁 File aperto: {openedFile.filename}</span>
          </div>
        )}
      </div>
      
      <div className="menu-section">
        <div className="menu-dropdown"> 
          <button 
            className="menu-button dropdown-toggle"
            onClick={() => setShowFileMenu(!showFileMenu)}
          >
            📁 File {showFileMenu ? '▼' : '▶'}
          </button>
          
          {showFileMenu && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={onNewModel}>
                🆕 Nuovo
              </button>
              {onClearAllModels && (
                <button className="dropdown-item" onClick={onClearAllModels}>
                  🗑️ Pulisci tutti i modelli
                </button>
              )}
                             <button className="dropdown-item" onClick={onOpenWithFileSystem}>
                 📂 Apri File (.json)
               </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={handleQuickSave}>
                💾 Salvataggio Rapido (JSON)
              </button>
              <button className="dropdown-item" onClick={handleSaveClick}>
                💾 Salva Come... (Nuovo File)
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={onExportXML}>
                📄 Esporta XML
              </button>
              <button className="dropdown-item" onClick={onExportCSV}>
                📊 Esporta CSV
              </button>
              <button className="dropdown-item" onClick={onExportMatlab}>
                🧮 Esporta MATLAB
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={onExportCode}>
                🔧 Esporta Codice
              </button>
            </div>
          )}
        </div>

        <button className="menu-button" onClick={onOpenWithFileSystem}>
          🔓 Apri
        </button>
        
        <button className="menu-button primary" onClick={onSave}>
          💾 Salva {openedFile?.fileHandle ? '(Sovrascrivi)' : '(Nuovo File)'}
        </button>

        <button className="menu-button config" onClick={onShowLLMConfig}>
          ⚙️ LLM
        </button>

        <button className="menu-button dark-toggle" onClick={onToggleDarkMode}>
          {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'}
        </button>

        <button
          className={`menu-button shyfta ${currentEditor !== 'fault-tree' ? 'disabled' : ''}`}
          onClick={currentEditor === 'fault-tree' ? onShowSHyFTA : undefined}
          disabled={currentEditor !== 'fault-tree'}
        >
          🔬 HDFT
        </button>

        <button 
          className={`menu-button msolver ${currentEditor !== 'markov-chain' ? 'disabled' : ''}`}
          onClick={currentEditor === 'markov-chain' ? onShowMSolver : undefined}
          disabled={currentEditor !== 'markov-chain'}
        >
          📊 MSolver
        </button>

        <button className="menu-button logout" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>

      
    </div>
  );
};

export default MenuBar;
