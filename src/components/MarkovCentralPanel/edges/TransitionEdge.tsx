import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { MarkovTransition } from '../../../types/MarkovChain';
import './TransitionEdge.css';

interface TransitionEdgeData {
  transition: MarkovTransition;
  onTransitionClick: (transition: MarkovTransition) => void;
  onDeleteTransition: (transitionId: string) => void;
  isDarkMode: boolean;
  disableDeletion: boolean;
}

const TransitionEdge: React.FC<EdgeProps<TransitionEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}) => {
  if (!data) return null;

  const { transition, onTransitionClick, onDeleteTransition, isDarkMode, disableDeletion } = data;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTransitionClick(transition);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disableDeletion) {
      onDeleteTransition(transition.id);
    }
  };

  // Format probability distribution for display
  const getProbabilityLabel = () => {
    const dist = transition.probabilityDistribution;
    switch (dist.type) {
      case 'constant':
        return `p=${dist.probability}`;
      case 'exponential':
        return `λ=${dist.lambda}`;
      case 'weibull':
        return `k=${dist.k}, λ=${dist.lambda}`;
      case 'normal':
        return `μ=${dist.mu}, σ=${dist.sigma}`;
      default:
        return 'p=?';
    }
  };

  return (
    <>
      <path
        id={id}
        className={`transition-edge ${isDarkMode ? 'dark-mode' : ''} ${selected ? 'selected' : ''}`}
        d={edgePath}
        onClick={handleClick}
        style={{
          stroke: selected ? '#007bff' : (isDarkMode ? '#ffffff' : '#333333'),
          strokeWidth: selected ? 3 : 2,
          cursor: 'pointer'
        }}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`transition-label ${isDarkMode ? 'dark-mode' : ''}`}
        >
          <div 
            className="label-content"
            onClick={handleClick}
            title={`Transition: ${getProbabilityLabel()}`}
          >
            <div className="probability-text">
              {getProbabilityLabel()}
            </div>
          </div>
          
          {!disableDeletion && (
            <button
              className="delete-transition-button"
              onClick={handleDelete}
              title="Delete Transition"
            >
              ×
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(TransitionEdge);