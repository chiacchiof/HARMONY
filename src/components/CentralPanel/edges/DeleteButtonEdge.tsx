import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import './DeleteButtonEdge.css';

interface DeleteButtonEdgeData {
  onDelete?: (edgeId: string) => void;
}

const DeleteButtonEdge: React.FC<EdgeProps<DeleteButtonEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="edge-delete-container"
        >
          <button
            className="edge-delete-button"
            onClick={handleDelete}
            title="Elimina collegamento"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default DeleteButtonEdge;
