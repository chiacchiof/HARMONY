import { FaultTreeModel } from '../types/FaultTree';

export interface FileExportOptions {
  format: 'json' | 'xml' | 'csv';
  filename?: string;
  includeMetadata?: boolean;
}

export class FileService {
  
  /**
   * Salva il fault tree in formato JSON
   */
  static saveFaultTree(model: FaultTreeModel, filename?: string): void {
    const dataStr = JSON.stringify(model, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Apre un file JSON e restituisce il modello
   */
  static async openFaultTree(file: File): Promise<FaultTreeModel> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const model = JSON.parse(content) as FaultTreeModel;
          
          // Validazione base del modello
          if (!model.events || !model.gates || !model.connections) {
            throw new Error('Formato file non valido: mancano eventi, porte o connessioni');
          }
          
          resolve(model);
        } catch (error) {
          reject(new Error(`Errore nel parsing del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Errore nella lettura del file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Esporta in formato XML
   */
  static exportToXML(model: FaultTreeModel, filename?: string): void {
    const xmlContent = this.generateXML(model);
    const dataBlob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Esporta in formato CSV
   */
  static exportToCSV(model: FaultTreeModel, filename?: string): void {
    const csvContent = this.generateCSV(model);
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Genera XML dal modello
   */
  private static generateXML(model: FaultTreeModel): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<faultTree>\n';
    
    // Eventi base
    xml += '  <events>\n';
    model.events.forEach(event => {
      xml += `    <event id="${event.id}" type="${event.type}">\n`;
      xml += `      <name>${this.escapeXML(event.name)}</name>\n`;
      if (event.description) {
        xml += `      <description>${this.escapeXML(event.description)}</description>\n`;
      }
      if (event.failureRate) {
        xml += `      <failureRate>${event.failureRate}</failureRate>\n`;
      }
      if (event.failureProbabilityDistribution) {
        xml += `      <failureProbabilityDistribution type="${event.failureProbabilityDistribution.type}">\n`;
        switch (event.failureProbabilityDistribution.type) {
          case 'exponential':
            xml += `        <lambda>${event.failureProbabilityDistribution.lambda}</lambda>\n`;
            break;
          case 'weibull':
            xml += `        <k>${event.failureProbabilityDistribution.k}</k>\n`;
            xml += `        <lambda>${event.failureProbabilityDistribution.lambda}</lambda>\n`;
            xml += `        <mu>${event.failureProbabilityDistribution.mu}</mu>\n`;
            break;
          case 'normal':
            xml += `        <mu>${event.failureProbabilityDistribution.mu}</mu>\n`;
            xml += `        <sigma>${event.failureProbabilityDistribution.sigma}</sigma>\n`;
            break;
          case 'constant':
            xml += `        <probability>${event.failureProbabilityDistribution.probability}</probability>\n`;
            break;
        }
        xml += `      </failureProbabilityDistribution>\n`;
      }
      if (event.repairProbabilityDistribution) {
        xml += `      <repairProbabilityDistribution type="${event.repairProbabilityDistribution.type}">\n`;
        switch (event.repairProbabilityDistribution.type) {
          case 'exponential':
            xml += `        <lambda>${event.repairProbabilityDistribution.lambda}</lambda>\n`;
            break;
          case 'weibull':
            xml += `        <k>${event.repairProbabilityDistribution.k}</k>\n`;
            xml += `        <lambda>${event.repairProbabilityDistribution.lambda}</lambda>\n`;
            xml += `        <mu>${event.repairProbabilityDistribution.mu}</mu>\n`;
            break;
          case 'normal':
            xml += `        <mu>${event.repairProbabilityDistribution.mu}</mu>\n`;
            xml += `        <sigma>${event.repairProbabilityDistribution.sigma}</sigma>\n`;
            break;
          case 'constant':
            xml += `        <probability>${event.repairProbabilityDistribution.probability}</probability>\n`;
            break;
        }
        xml += `      </repairProbabilityDistribution>\n`;
      }
      xml += `      <position x="${event.position.x}" y="${event.position.y}" />\n`;
      xml += '    </event>\n';
    });
    xml += '  </events>\n';
    
    // Porte
    xml += '  <gates>\n';
    model.gates.forEach(gate => {
      xml += `    <gate id="${gate.id}" type="${gate.type}" gateType="${gate.gateType}">\n`;
      xml += `      <name>${this.escapeXML(gate.name)}</name>\n`;
      if (gate.description) {
        xml += `      <description>${this.escapeXML(gate.description)}</description>\n`;
      }
      xml += `      <position x="${gate.position.x}" y="${gate.position.y}" />\n`;
      xml += '      <inputs>\n';
      gate.inputs.forEach(input => {
        xml += `        <input>${input}</input>\n`;
      });
      xml += '      </inputs>\n';
      xml += '    </gate>\n';
    });
    xml += '  </gates>\n';
    
    // Connessioni
    xml += '  <connections>\n';
    model.connections.forEach(conn => {
      xml += `    <connection id="${conn.id}" source="${conn.source}" target="${conn.target}" type="${conn.type}" />\n`;
    });
    xml += '  </connections>\n';
    
    if (model.topEvent) {
      xml += `  <topEvent>${model.topEvent}</topEvent>\n`;
    }
    
    xml += '</faultTree>';
    return xml;
  }

  /**
   * Genera CSV dal modello
   */
  private static generateCSV(model: FaultTreeModel): string {
    let csv = 'Element Type,ID,Name,Description,Position X,Position Y,Failure Distribution,Repair Distribution,Additional Info\n';
    
    // Eventi
    model.events.forEach(event => {
      let failureDistributionInfo = '';
      let repairDistributionInfo = '';
      let additionalInfo = '';
      
      if (event.failureProbabilityDistribution) {
        const params = [];
        switch (event.failureProbabilityDistribution.type) {
          case 'exponential':
            params.push(`lambda: ${event.failureProbabilityDistribution.lambda} h⁻¹`);
            break;
          case 'weibull':
            params.push(`k: ${event.failureProbabilityDistribution.k}`);
            params.push(`lambda: ${event.failureProbabilityDistribution.lambda} h`);
            params.push(`mu: ${event.failureProbabilityDistribution.mu} h`);
            break;
          case 'normal':
            params.push(`mu: ${event.failureProbabilityDistribution.mu} h`);
            params.push(`sigma: ${event.failureProbabilityDistribution.sigma} h`);
            break;
          case 'constant':
            params.push(`probability: ${event.failureProbabilityDistribution.probability}`);
            break;
        }
        failureDistributionInfo = `${event.failureProbabilityDistribution.type}: ${params.join('; ')}`;
      }

      if (event.repairProbabilityDistribution) {
        const params = [];
        switch (event.repairProbabilityDistribution.type) {
          case 'exponential':
            params.push(`lambda: ${event.repairProbabilityDistribution.lambda} h⁻¹`);
            break;
          case 'weibull':
            params.push(`k: ${event.repairProbabilityDistribution.k}`);
            params.push(`lambda: ${event.repairProbabilityDistribution.lambda} h`);
            params.push(`mu: ${event.repairProbabilityDistribution.mu} h`);
            break;
          case 'normal':
            params.push(`mu: ${event.repairProbabilityDistribution.mu} h`);
            params.push(`sigma: ${event.repairProbabilityDistribution.sigma} h`);
            break;
          case 'constant':
            params.push(`probability: ${event.repairProbabilityDistribution.probability}`);
            break;
        }
        repairDistributionInfo = `${event.repairProbabilityDistribution.type}: ${params.join('; ')}`;
      }
      
      if (event.failureRate) {
        additionalInfo = `Failure Rate: ${event.failureRate}`;
      }
      
      csv += `Event,${event.id},"${event.name}","${event.description || ''}",${event.position.x},${event.position.y},"${failureDistributionInfo}","${repairDistributionInfo}","${additionalInfo}"\n`;
    });
    
    // Porte
    model.gates.forEach(gate => {
      csv += `Gate,${gate.id},"${gate.name}","${gate.description || ''}",${gate.position.x},${gate.position.y},"","","Type: ${gate.gateType}, Inputs: ${gate.inputs.length}"\n`;
    });
    
    // Connessioni
    csv += '\nConnections\n';
    csv += 'Source,Target,Type\n';
    model.connections.forEach(conn => {
      csv += `${conn.source},${conn.target},${conn.type}\n`;
    });
    
    return csv;
  }

  /**
   * Escape caratteri speciali per XML
   */
  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Valida il modello del fault tree
   */
  static validateModel(model: FaultTreeModel): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!model.events || model.events.length === 0) {
      errors.push('Il modello deve contenere almeno un evento base');
    }
    
    if (!model.gates || model.gates.length === 0) {
      errors.push('Il modello deve contenere almeno una porta');
    }
    
    if (!model.connections || model.connections.length === 0) {
      errors.push('Il modello deve contenere almeno una connessione');
    }
    
    // Verifica che tutti gli ID nelle connessioni esistano
    const allIds = new Set([
      ...model.events.map(e => e.id),
      ...model.gates.map(g => g.id)
    ]);
    
    model.connections.forEach(conn => {
      if (!allIds.has(conn.source)) {
        errors.push(`Connessione con source ID '${conn.source}' non trovato`);
      }
      if (!allIds.has(conn.target)) {
        errors.push(`Connessione con target ID '${conn.target}' non trovato`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera un nome file predefinito
   */
  static generateDefaultFilename(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `fault-tree-${dateStr}-${timeStr}`;
  }
}
