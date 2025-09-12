import React from 'react';
import './MarkovLeftPanel.css';

interface MarkovLeftPanelProps {
  onAddState: () => void;
  clickToPlaceMode: boolean;
  onToggleClickToPlace: () => void;
  componentToPlace: 'state' | null;
  setComponentToPlace: (component: 'state' | null) => void;
  isDarkMode: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const MarkovLeftPanel: React.FC<MarkovLeftPanelProps> = ({
  onAddState,
  clickToPlaceMode,
  onToggleClickToPlace,
  componentToPlace,
  setComponentToPlace,
  isDarkMode,
  isCollapsed,
  onToggleCollapse
}) => {
  const handleStateClick = () => {
    if (clickToPlaceMode) {
      // In click-to-place mode, toggle selection
      if (componentToPlace === 'state') {
        setComponentToPlace(null); // Deselect if already selected
      } else {
        setComponentToPlace('state'); // Select if not selected
      }
    } else {
      // Force user to enable Click to Place Mode first
      onToggleClickToPlace(); // Enable click to place mode
      setComponentToPlace('state'); // And select state for placement
    }
  };

  return (
    <div className={`markov-left-panel ${isDarkMode ? 'dark-mode' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <div className="header-content">
          <h3>🔗 Componenti Markov</h3>
          <button 
            className="collapse-toggle"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Mostra pannello" : "Nascondi pannello"}
          >
            {isCollapsed ? '▶' : '◀'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="panel-content">
          <div className="component-section">
            <h4>States</h4>
            <div className="components-grid">
              <div 
                className={`component-item ${componentToPlace === 'state' ? 'selected' : ''}`}
                onClick={handleStateClick}
                title="Add State"
              >
                <div className="state-icon">
                  <div className="state-circle">S</div>
                </div>
                <span>State</span>
              </div>
            </div>
          </div>

          <div className="mode-section">
            <div className="mode-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={clickToPlaceMode}
                  onChange={onToggleClickToPlace}
                />
                <span>Click to Place Mode</span>
              </label>
            </div>
            <p className="mode-description">
              {clickToPlaceMode 
                ? componentToPlace === 'state' 
                  ? '🎯 State selected: Click canvas to place states, click State button to deselect'
                  : '📋 Click State button to select, then click canvas to place'
                : '⚠️ Click State button to enable Click to Place Mode automatically'
              }
            </p>
          </div>

          <div className="info-section">
            <h4>Instructions</h4>
            <ul>
              <li>Click State button to enable placement mode</li>
              <li>Click canvas to place states where you want</li>
              <li>Drag states to move them around</li>
              <li>Connect states by dragging from one to another</li>
              <li>Click on states/transitions to edit properties</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkovLeftPanel;