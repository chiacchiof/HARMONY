import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MarkovState } from '../../../types/MarkovChain';
import './StateNode.css';

interface StateNodeData {
  state: MarkovState;
  onStateClick: (state: MarkovState) => void;
  onDeleteState: (stateId: string) => void;
  isDarkMode: boolean;
  disableDeletion: boolean;
}

const StateNode: React.FC<NodeProps<StateNodeData>> = ({ 
  data, 
  selected 
}) => {
  const { state, onStateClick, onDeleteState, isDarkMode, disableDeletion } = data;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStateClick(state);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disableDeletion) {
      onDeleteState(state.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disableDeletion) {
      onDeleteState(state.id);
    }
  };

  return (
    <div 
      className={`state-node ${isDarkMode ? 'dark-mode' : ''} ${selected ? 'selected' : ''} ${state.isAbsorbing ? 'absorbing' : ''}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ 
          background: isDarkMode ? '#ffffff' : '#333333',
          border: '2px solid transparent',
          width: '10px',
          height: '10px'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ 
          background: isDarkMode ? '#ffffff' : '#333333',
          border: '2px solid transparent',
          width: '10px',
          height: '10px'
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          background: isDarkMode ? '#ffffff' : '#333333',
          border: '2px solid transparent',
          width: '10px',
          height: '10px'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ 
          background: isDarkMode ? '#ffffff' : '#333333',
          border: '2px solid transparent',
          width: '10px',
          height: '10px'
        }}
      />

      {/* State circle */}
      <div className="state-circle drag-handle">
        <div className="state-content">
          <div className="state-name">{state.name}</div>
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