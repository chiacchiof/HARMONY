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
  onShowSHyFTA: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onNewModel: () => void;
  openedFile?: { filename: string; fileHandle?: FileSystemFileHandle } | null;
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
  isDarkMode,
  onToggleDarkMode,
  onNewModel,
  openedFile
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
          <span className="menu-title">🌳 Dynamic Fault Tree Editor</span>
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

        <button className="menu-button shyfta" onClick={onShowSHyFTA}>
          🔬 SHyFTA
        </button>

        <button className="menu-button dark-toggle" onClick={onToggleDarkMode}>
          {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'}
        </button>
      </div>

      
    </div>
  );
};

export default MenuBar;
