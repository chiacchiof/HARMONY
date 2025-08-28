import React, { useRef } from 'react';
import './MenuBar.css';

interface MenuBarProps {
  onSave: () => void;
  onOpen: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCode: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onSave, onOpen, onExportCode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="menu-bar">
      <div className="menu-section">
        <span className="menu-title">Dynamic Fault Tree Editor</span>
      </div>
      
      <div className="menu-section">
        <button className="menu-button" onClick={handleOpenClick}>
          📁 Apri
        </button>
        <button className="menu-button" onClick={onSave}>
          💾 Salva
        </button>
        <button className="menu-button" onClick={onExportCode}>
          📄 Esporta Codice
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={onOpen}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default MenuBar;
