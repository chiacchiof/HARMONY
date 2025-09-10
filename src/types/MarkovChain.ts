import { ProbabilityDistribution } from './FaultTree';

export interface MarkovState {
  id: string;
  type: 'state';
  name: string;
  description?: string;
  position: { x: number; y: number };
  rewardFunction: number; // Default 1
  isAbsorbing: boolean; // Default false
  parameters?: Record<string, any>;
}

export interface MarkovTransition {
  id: string;
  type: 'transition';
  source: string; // ID dello stato sorgente
  target: string; // ID dello stato target
  sourceHandle?: string; // Handle specifico dello stato sorgente (es. "handle-3")
  targetHandle?: string; // Handle specifico dello stato target (es. "handle-9")
  probabilityDistribution: ProbabilityDistribution;
  parameters?: Record<string, any>;
}

export interface MarkovChainModel {
  states: MarkovState[];
  transitions: MarkovTransition[];
  initialState?: string; // ID dello stato iniziale
}

export interface MarkovChainMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}