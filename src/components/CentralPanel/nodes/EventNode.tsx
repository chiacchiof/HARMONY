import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BaseEvent } from '../../../types/FaultTree';
import './EventNode.css';

interface EventNodeData {
  event: BaseEvent;
  onClick: () => void;
  onDelete?: (elementId: string) => void;
}

const EventNode: React.FC<NodeProps<EventNodeData>> = ({ data }) => {
  const { event, onClick, onDelete } = data;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(event.id);
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
        <div className="event-icon">⬜</div>
        <div className="event-info">
          <div className="event-name">{event.name}</div>
          {event.description && (
            <div 
              className="event-description" 
              title={event.description}
            >
              {event.description}
            </div>
          )}
          {event.failureRate && (
            <div className="event-rate">λ = {event.failureRate}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventNode;
