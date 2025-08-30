import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BaseEvent } from '../../../types/FaultTree';
import './EventNode.css';

interface EventNodeData {
  event: BaseEvent;
  onClick: () => void;
  onDelete?: (elementId: string) => void;
}

// Helper per troncare il testo a 30 caratteri
const truncateText = (text: string, maxLength: number = 20): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

const EventNode: React.FC<NodeProps<EventNodeData>> = ({ data }) => {
  const { event, onClick, onDelete } = data;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(event.id);
    }
  };

  // Helper to map distribution type to short label
  const getDistributionLabel = (dist: any) => {
    if (!dist || !dist.type) return null;
    switch (dist.type) {
      case 'exponential':
        return 'exp';
      case 'weibull':
        return 'wei';
      case 'normal':
        return 'gauss';
      case 'constant':
        return 'const';
      default:
        return dist.type;
    }
  };

  // Helper to get a primary parameter for distribution
  const getDistributionParam = (dist: any) => {
    if (!dist || !dist.type) return null;
    switch (dist.type) {
      case 'exponential':
        return dist.lambda != null ? dist.lambda : null;
      case 'weibull':
        return dist.lambda != null ? dist.lambda : null; // show scale for weibull
      case 'normal':
        return dist.mu != null ? dist.mu : null; // show mean for normal
      case 'constant':
        return dist.probability != null ? dist.probability : null;
      default:
        return null;
    }
  };

  return (
    <div className="event-node" onClick={onClick}>
      <Handle
        type="source"
        position={Position.Top}
        className="event-handle"
      />
      
      {onDelete && (
        <button 
          className="delete-button" 
          onClick={handleDelete}
          title="Elimina evento"
        >
          ×
        </button>
      )}
      
      <div className="event-content">
        <div className="event-info">
          <div 
            className="event-name"
            title={event.name}
          >
            <span className="inline-dot" />
            {truncateText(event.name)}
          </div>
          {event.description && (
            <div 
              className="event-description" 
              title={event.description}
            >
              {truncateText(event.description, 25)}
            </div>
          )}
          {event.failureRate && (
            <div className="event-rate">λ = {event.failureRate}</div>
          )}
          {/* Show failure distribution label + primary parameter */}
          {event.failureProbabilityDistribution && (
            <div className="event-distribution">
              <span className="dist-icon">⚠️</span>
              <span className="dist-label">
                {getDistributionLabel(event.failureProbabilityDistribution)}
                {(() => {
                  const p = getDistributionParam(event.failureProbabilityDistribution);
                  return p != null ? <span className="dist-param">{` (${p})`}</span> : null;
                })()}
              </span>
            </div>
          )}
          {/* If repair distribution exists, show wrench icon and its distribution */}
          {event.repairProbabilityDistribution && (
            <div className="event-repair">
              <span className="repair-icon">🔧</span>
              <span className="dist-label">
                {getDistributionLabel(event.repairProbabilityDistribution)}
                {(() => {
                  const p = getDistributionParam(event.repairProbabilityDistribution);
                  return p != null ? <span className="dist-param">{` (${p})`}</span> : null;
                })()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventNode;
