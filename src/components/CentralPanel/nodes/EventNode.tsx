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

  // Format number with up to 3 decimals, trim trailing zeros
  const formatNumber = (n: number) => {
    if (n == null || Number.isNaN(n)) return '';
    return parseFloat(n.toFixed(3)).toString();
  };

  // Helper to get a full parameter string for any distribution
  const getDistributionParamsString = (dist: any) => {
    if (!dist || !dist.type) return null;
    switch (dist.type) {
      case 'exponential':
        return dist.lambda != null ? `(λ=${formatNumber(dist.lambda)})` : null;
      case 'weibull':
        return `(${typeof dist.k !== 'undefined' ? `k=${formatNumber(dist.k)}, ` : ''}${typeof dist.lambda !== 'undefined' ? `λ=${formatNumber(dist.lambda)}` : ''}${typeof dist.mu !== 'undefined' ? `, μ=${formatNumber(dist.mu)}` : ''})`;
      case 'normal':
        return `(${typeof dist.mu !== 'undefined' ? `μ=${formatNumber(dist.mu)}` : ''}${typeof dist.sigma !== 'undefined' ? `, σ=${formatNumber(dist.sigma)}` : ''})`;
      case 'constant':
        return dist.probability != null ? `(p=${formatNumber(dist.probability)})` : null;
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
                  const params = getDistributionParamsString(event.failureProbabilityDistribution);
                  return params ? <span className="dist-param">{` ${params}`}</span> : null;
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
                  const params = getDistributionParamsString(event.repairProbabilityDistribution);
                  return params ? <span className="dist-param">{` ${params}`}</span> : null;
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
