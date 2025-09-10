export interface ModelMetadata {
  modelType: 'fault-tree' | 'markov-chain';
  version: string;
  createdAt: string;
  lastModified: string;
}

export interface FaultTreeModelWithMetadata {
  _metadata: ModelMetadata;
  events: any[];
  gates: any[];
  connections: any[];
}

export interface MarkovChainModelWithMetadata {
  _metadata: ModelMetadata;
  states: any[];
  transitions: any[];
}

export type ModelWithMetadata = FaultTreeModelWithMetadata | MarkovChainModelWithMetadata;

export function createModelMetadata(modelType: 'fault-tree' | 'markov-chain'): ModelMetadata {
  const now = new Date().toISOString();
  return {
    modelType,
    version: '1.0.0',
    createdAt: now,
    lastModified: now
  };
}

export function detectModelType(data: any): 'fault-tree' | 'markov-chain' | 'unknown' {
  if (data && typeof data === 'object') {
    // Check for metadata
    if (data._metadata && data._metadata.modelType) {
      return data._metadata.modelType;
    }
    
    // Fallback detection based on structure
    if (data.events !== undefined && data.gates !== undefined && data.connections !== undefined) {
      return 'fault-tree';
    }
    
    if (data.states !== undefined && data.transitions !== undefined) {
      return 'markov-chain';
    }
  }
  
  return 'unknown';
}