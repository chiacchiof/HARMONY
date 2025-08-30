export type GateType = 'AND' | 'OR' | 'PAND' | 'SPARE' | 'SEQ' | 'FDEP';

// Probability distribution types
export type DistributionType = 'exponential' | 'weibull' | 'normal' | 'constant';

export interface ExponentialDistribution {
  type: 'exponential';
  lambda: number; // Tasso di guasto (h⁻¹)
}

export interface WeibullDistribution {
  type: 'weibull';
  k: number; // Parametro di forma (adimensionale)
  lambda: number; // Parametro di scala (h)
  mu: number; // Parametro di posizione (h)
}

export interface NormalDistribution {
  type: 'normal';
  mu: number; // Media (h)
  sigma: number; // Deviazione standard (h)
}

export interface ConstantDistribution {
  type: 'constant';
  probability: number; // Probabilità costante (adimensionale)
}

export type ProbabilityDistribution = 
  | ExponentialDistribution 
  | WeibullDistribution 
  | NormalDistribution 
  | ConstantDistribution;

export interface BaseEvent {
  id: string;
  type: 'basic-event';
  name: string;
  description?: string;
  failureRate?: number; // Mantenuto per retrocompatibilità
  position: { x: number; y: number };
  parameters?: Record<string, any>;
  // Distribuzioni di probabilità
  failureProbabilityDistribution?: ProbabilityDistribution;
  repairProbabilityDistribution?: ProbabilityDistribution;
}

export interface Gate {
  id: string;
  type: 'gate';
  gateType: GateType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  inputs: string[]; // IDs degli eventi di input (primary inputs for SPARE/FDEP)
  secondaryInputs?: string[]; // IDs degli eventi secondari (for SPARE/FDEP gates)
  parameters?: Record<string, any>;
}

export interface Connection {
  id: string;
  source: string; // ID dell'elemento sorgente
  target: string; // ID della porta target
  type: 'connection';
}

export interface FaultTreeModel {
  events: BaseEvent[];
  gates: Gate[];
  connections: Connection[];
  topEvent?: string; // ID del top event
}

export interface ElementParameters {
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}
