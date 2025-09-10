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