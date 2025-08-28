import { FaultTreeModel } from './FaultTree';

export interface ChatIntegrationProps {
  onGenerateFaultTree?: (model: FaultTreeModel) => void;
  onModifyFaultTree?: (modifications: FaultTreeModification[]) => void;
  currentFaultTree?: FaultTreeModel;
}

export interface FaultTreeModification {
  type: 'add' | 'remove' | 'update';
  elementType: 'event' | 'gate' | 'connection';
  elementId?: string;
  data?: any;
}

export interface GenerationStatus {
  isGenerating: boolean;
  progress?: number;
  message?: string;
}

export interface ChatbotCommand {
  type: 'generate' | 'modify' | 'analyze' | 'export';
  parameters: Record<string, any>;
  description: string;
}
