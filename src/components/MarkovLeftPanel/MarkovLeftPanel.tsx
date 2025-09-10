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
      // In click-to-place mode, clicking State button ensures it's selected for placement
      if (componentToPlace !== 'state') {
        setComponentToPlace('state');
      }
    } else {
      // Normal mode: add state directly to center
      onAddState();
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
                ? 'Instant Add: Click anywhere on canvas to add multiple states'
                : 'Click components to add them to the center'
              }
            </p>
          </div>

          <div className="info-section">
            <h4>Instructions</h4>
            <ul>
              <li>Drag states to move them around</li>
              <li>Connect states by dragging from one to another</li>
              <li>Click on states to edit properties</li>
              <li>Click on transitions to edit probabilities</li>
              <li>Use right-click to delete elements</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkovLeftPanel;