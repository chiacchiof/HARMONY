import React, { useRef, useState } from 'react';
import './MenuBar.css';

interface MenuBarProps {
  onSave: () => void | Promise<void>;
  onOpen: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onOpenWithFileSystem: () => void | Promise<void>;
  onExportCode: () => void | Promise<void>;
  onShowSaveModal: () => void;
  onExportXML: () => void | Promise<void>;
  onExportCSV: () => void | Promise<void>;
  onExportMatlab: () => void;
  onShowLLMConfig: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onNewModel: () => void;
  openedFile?: { filename: string; fileHandle?: FileSystemFileHandle } | null;
}

const MenuBar: React.FC<MenuBarProps> = ({ 
  onSave, 
  onOpen, 
  onOpenWithFileSystem,
  onExportCode, 
  onShowSaveModal,
  onExportXML,
  onExportCSV,
  onExportMatlab,
  onShowLLMConfig,
  isDarkMode,
  onToggleDarkMode,
  onNewModel,
  openedFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const handleOpenClick = () => {
    fileInputRef.current?.click();
    setShowFileMenu(false);
  };

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
          <div className="feature-notice">
            <span>💡 <strong>Apri (File System)</strong>: Sovrascrittura diretta | <strong>Apri (Tradizionale)</strong>: File explorer | <strong>Salva</strong>: Sovrascrive se file aperto, altrimenti file explorer</span>
          </div>
          {openedFile && (
            <div className="file-info">
              <span>📁 File aperto: {openedFile.filename}</span>
              {openedFile.fileHandle && (
                <span className="save-mode-indicator">💾 Modalità Sovrascrittura</span>
              )}
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
              <button className="dropdown-item" onClick={handleOpenClick}>
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

        <button className="menu-button" onClick={handleOpenClick}>
          📂 Apri (Tradizionale)
        </button>
        
        <button className="menu-button" onClick={onOpenWithFileSystem}>
          🔓 Apri (File System)
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.xml,.csv"
        onChange={onOpen}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default MenuBar;
