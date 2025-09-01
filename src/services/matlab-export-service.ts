import { FaultTreeModel, BaseEvent, Gate } from '../types/FaultTree';

export interface MatlabExportOptions {
  missionTime: number; // Tm in hours
  filename?: string;
}

export class MatlabExportService {
  
  /**
   * Exports fault tree to MATLAB format with bottom-up ordering
   */
  static async exportToMatlab(model: FaultTreeModel, options: MatlabExportOptions): Promise<void> {
    const matlabCode = this.generateMatlabCode(model, options);
    const dataBlob = new Blob([matlabCode], { type: 'text/plain' });
    
    // Prova a utilizzare l'API File System Access se disponibile
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const defaultName = options.filename || `fault-tree-${new Date().toISOString().split('T')[0]}.m`;
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'MATLAB Files',
            accept: {
              'text/plain': ['.m']
            }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(dataBlob);
        await writable.close();
        return;
      } catch (error) {
        // Se l'utente annulla o c'è un errore, fallback al metodo tradizionale
        console.log('File System Access non disponibile o annullato, uso fallback:', error);
      }
    }
    
    // Fallback al metodo tradizionale
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename || `fault-tree-${new Date().toISOString().split('T')[0]}.m`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Generates MATLAB code with proper bottom-up ordering
   */
  private static generateMatlabCode(model: FaultTreeModel, options: MatlabExportOptions): string {
    let code = "%% Define the Fault Tree Structure %%\n";
    code += `Tm = ${options.missionTime}; %[h]\n\n`;

    // Generate Basic Events
    code += "%% Define BEs %%\n\n";
    model.events.forEach(event => {
      code += this.generateBasicEventCode(event);
    });

    code += "\n%% Define Gates %%\n";
    
    // Get bottom-up ordered gates
    const orderedGates = this.getBottomUpOrdering(model);
    
    orderedGates.forEach(gate => {
      code += this.generateGateCode(gate, model);
    });

    // Find top event
    const topEvent = this.findTopEvent(model);
    if (topEvent) {
      code += `TOP = ${topEvent.name};\n`;
    }

    code += "%% Recall Matlab Script %%\n";
    code += "%verify if the FT Structure is valid (it will modify the value of the variable UNVALID_FT)\n";
    code += "createFTStructure\n";

    return code;
  }

  /**
   * Generates MATLAB code for a Basic Event
   */
  private static generateBasicEventCode(event: BaseEvent): string {
    const name = this.sanitizeMatlabName(event.name);
    
    // Default parameters
    let failureProb = "''";
    let repairProb = "''";
    let failureParams = "[]";
    let repairParams = "[]";

    // Handle failure probability distribution
    if (event.failureProbabilityDistribution) {
      const dist = event.failureProbabilityDistribution;
      switch (dist.type) {
        case 'exponential':
          failureProb = "'exp'";
          failureParams = `[${dist.lambda}]`;
          break;
        case 'weibull':
          failureProb = "'weibull'";
          failureParams = `[${dist.k}, ${dist.lambda}, ${dist.mu}]`;
          break;
        case 'normal':
          failureProb = "'normal'";
          failureParams = `[${dist.mu}, ${dist.sigma}]`;
          break;
        case 'constant':
          failureProb = "'constant'";
          failureParams = `[${dist.probability}]`;
          break;
      }
    } else if (event.failureRate) {
      // Fallback to old failureRate
      failureProb = "'exp'";
      failureParams = `[${event.failureRate}]`;
    }

    // Handle repair probability distribution
    if (event.repairProbabilityDistribution) {
      const dist = event.repairProbabilityDistribution;
      switch (dist.type) {
        case 'exponential':
          repairProb = "'exp'";
          repairParams = `[${dist.lambda}]`;
          break;
        case 'weibull':
          repairProb = "'weibull'";
          repairParams = `[${dist.k}, ${dist.lambda}, ${dist.mu}]`;
          break;
        case 'normal':
          repairProb = "'normal'";
          repairParams = `[${dist.mu}, ${dist.sigma}]`;
          break;
        case 'constant':
          repairProb = "'constant'";
          repairParams = `[${dist.probability}]`;
          break;
      }
    }

    return `${name} = BasicEvent('${name}',${failureProb},${repairProb},${failureParams},${repairParams});\n`;
  }

  /**
   * Generates MATLAB code for a Gate
   */
  private static generateGateCode(gate: Gate, model: FaultTreeModel): string {
    const name = this.sanitizeMatlabName(gate.name);
    const gateType = gate.gateType;
    const isFailureGate = gate.isFailureGate || false;
    
    // Get primary input names
    const primaryInputNames = gate.inputs.map(inputId => {
      const inputElement = this.findElementById(model, inputId);
      return inputElement ? this.sanitizeMatlabName(inputElement.name) : inputId;
    });

    // Handle different gate types
    if (gateType === 'SPARE' || gateType === 'FDEP') {
      // For SPARE and FDEP gates, we need to separate primary and secondary inputs
      const primaryInputs = `[${primaryInputNames.join(', ')}]`;
      
      // Get secondary input names if they exist
      let secondaryInputs = '[]';
      if (gate.secondaryInputs && gate.secondaryInputs.length > 0) {
        const secondaryInputNames = gate.secondaryInputs.map(inputId => {
          const inputElement = this.findElementById(model, inputId);
          return inputElement ? this.sanitizeMatlabName(inputElement.name) : inputId;
        });
        secondaryInputs = `[${secondaryInputNames.join(', ')}]`;
      }
      
      return `${name} = Gate('${name}', '${gateType}', ${isFailureGate ? 'true' : 'false'}, ${primaryInputs}, ${secondaryInputs});\n`;
    } else {
      // Standard gates (AND, OR, SEQ, PAND)
      const inputs = `[${primaryInputNames.join(', ')}]`;
      return `${name} = Gate('${name}', '${gateType}', ${isFailureGate ? 'true' : 'false'}, ${inputs});\n`;
    }
  }

  /**
   * Performs topological sort to get bottom-up ordering of gates
   */
  private static getBottomUpOrdering(model: FaultTreeModel): Gate[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: Gate[] = [];

    const visit = (gateId: string) => {
      if (visited.has(gateId)) return;
      if (visiting.has(gateId)) {
        // Circular dependency detected - handle gracefully
        console.warn(`Circular dependency detected involving gate ${gateId}`);
        return;
      }

      const gate = model.gates.find(g => g.id === gateId);
      if (!gate) return;

      visiting.add(gateId);

      // Visit all input gates first (dependencies)
      gate.inputs.forEach(inputId => {
        const inputGate = model.gates.find(g => g.id === inputId);
        if (inputGate && !visited.has(inputId)) {
          visit(inputId);
        }
      });

      visiting.delete(gateId);
      visited.add(gateId);
      result.push(gate);
    };

    // Visit all gates
    model.gates.forEach(gate => {
      if (!visited.has(gate.id)) {
        visit(gate.id);
      }
    });

    return result;
  }

  /**
   * Finds the top event (gate with no outgoing connections)
   */
  private static findTopEvent(model: FaultTreeModel): Gate | null {
    if (model.topEvent) {
      return model.gates.find(g => g.id === model.topEvent) || null;
    }

    // Find gate that is not an input to any other gate
    const inputGateIds = new Set<string>();
    model.gates.forEach(gate => {
      gate.inputs.forEach(inputId => {
        if (model.gates.some(g => g.id === inputId)) {
          inputGateIds.add(inputId);
        }
      });
    });

    const topGates = model.gates.filter(gate => !inputGateIds.has(gate.id));
    return topGates.length > 0 ? topGates[0] : null;
  }

  /**
   * Finds element by ID in the model
   */
  private static findElementById(model: FaultTreeModel, id: string): BaseEvent | Gate | null {
    const event = model.events.find(e => e.id === id);
    if (event) return event;
    
    const gate = model.gates.find(g => g.id === id);
    if (gate) return gate;
    
    return null;
  }

  /**
   * Sanitizes names for MATLAB variable naming rules
   */
  private static sanitizeMatlabName(name: string): string {
    // Replace spaces and special characters with underscores
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Ensure it starts with a letter
    if (!/^[a-zA-Z]/.test(sanitized)) {
      sanitized = 'E_' + sanitized;
    }
    
    // Remove consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove trailing underscores
    sanitized = sanitized.replace(/_+$/, '');
    
    return sanitized;
  }
}
