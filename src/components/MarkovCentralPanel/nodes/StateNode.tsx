import React, { memo, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MarkovState } from '../../../types/MarkovChain';
import './StateNode.css';

interface StateNodeData {
  state: MarkovState;
  onStateClick: (state: MarkovState) => void;
  onDeleteState: (stateId: string) => void;
  onViewResults: (stateId: string) => void;
  isDarkMode: boolean;
  disableDeletion: boolean;
  matlabStateIndex?: number; // Index used in MATLAB (1-based)
}

const StateNode: React.FC<NodeProps<StateNodeData>> = ({ 
  data, 
  selected 
}) => {
  const { state, onStateClick, onDeleteState, onViewResults, isDarkMode, disableDeletion, matlabStateIndex } = data;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onStateClick(state);
  }, [onStateClick, state]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disableDeletion) {
      onDeleteState(state.id);
    }
  }, [disableDeletion, onDeleteState, state.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!disableDeletion) {
      onDeleteState(state.id);
    }
  }, [disableDeletion, onDeleteState, state.id]);

  const handleViewResults = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onViewResults(state.id);
  }, [onViewResults, state.id]);

  // Generate 12 handles positioned like clock hours
  const clockHandles = useMemo(() => {
    const handles = [];
    const radius = 45; // State circle radius (90px / 2)
    const handleSize = 14; // Larger handles for better usability

    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180); // -90 to start from top (12 o'clock)
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      handles.push(
        <Handle
          key={`${state.id}-handle-${i}`}
          type="source"
          position={Position.Top}
          id={`handle-${i}`}
          style={{
            position: 'absolute',
            left: `calc(50% + ${x}px - ${handleSize/2}px)`,
            top: `calc(50% + ${y}px - ${handleSize/2}px)`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            background: isDarkMode ? '#4CAF50' : '#28a745',
            border: `2px solid ${isDarkMode ? '#ffffff' : '#ffffff'}`,
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transform: 'none',
            zIndex: 10,
          }}
        />
      );

      // Also add as target
      handles.push(
        <Handle
          key={`${state.id}-target-${i}`}
          type="target"
          position={Position.Top}
          id={`target-${i}`}
          style={{
            position: 'absolute',
            left: `calc(50% + ${x}px - ${handleSize/2}px)`,
            top: `calc(50% + ${y}px - ${handleSize/2}px)`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            background: isDarkMode ? '#4CAF50' : '#28a745',
            border: `2px solid ${isDarkMode ? '#ffffff' : '#ffffff'}`,
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transform: 'none',
            zIndex: 9,
          }}
        />
      );
    }
    return handles;
  }, [state.id, isDarkMode]);

  return (
    <div 
      className={`state-node ${isDarkMode ? 'dark-mode' : ''} ${selected ? 'selected' : ''} ${state.isAbsorbing ? 'absorbing' : ''} ${state.isInitial ? 'initial' : ''}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* 12 Clock-positioned handles */}
      {clockHandles}

      {/* State circle */}
      <div className="state-circle drag-handle">
        <div className="state-content">
          <div className="state-name">{state.name}</div>
          <div className="state-id">Id: {matlabStateIndex !== undefined ? matlabStateIndex - 1 : parseInt(state.id.replace('state-', '')) || 0}</div>
          {state.rewardFunction !== 1 && (
            <div className="state-reward">R: {state.rewardFunction}</div>
          )}
        </div>
      </div>

      {/* Absorbing state indicator */}
      {state.isAbsorbing && (
        <div className="absorbing-indicator" title="Absorbing State">
          <div className="absorbing-ring"></div>
        </div>
      )}

      {/* Initial state indicator */}
      {state.isInitial && (
        <div className="initial-indicator" title="Initial State">
          <div className="initial-arrow">⇒</div>
        </div>
      )}

      {/* Results viewer button */}
      <button 
        className="results-button"
        onClick={handleViewResults}
        title="View CTMC Results"
      >
        📊
      </button>

      {/* Delete button */}
      {!disableDeletion && (
        <button 
          className="delete-button"
          onClick={handleDelete}
          title="Delete State"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default memo(StateNode);