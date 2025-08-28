export type GateType = 'AND' | 'OR' | 'PAND' | 'SPARE' | 'SEQ' | 'FDEP';

export interface BaseEvent {
  id: string;
  type: 'basic-event';
  name: string;
  description?: string;
  failureRate?: number;
  position: { x: number; y: number };
  parameters?: Record<string, any>;
}

export interface Gate {
  id: string;
  type: 'gate';
  gateType: GateType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  inputs: string[]; // IDs degli eventi di input
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
