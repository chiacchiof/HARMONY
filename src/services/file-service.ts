import { FaultTreeModel } from '../types/FaultTree';

export interface FileExportOptions {
  format: 'json' | 'xml' | 'csv';
  filename?: string;
  includeMetadata?: boolean;
}

export class FileService {
  
  /**
   * Salva il fault tree in formato JSON con selezione cartella
   */
  static async saveFaultTree(model: FaultTreeModel, filename?: string): Promise<void> {
    const dataStr = JSON.stringify(model, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Prova a utilizzare l'API File System Access se disponibile
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const defaultName = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.json`;
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'JSON Files',
            accept: {
              'application/json': ['.json']
            }
          }]
        });
        
        // Utilizza l'API corretta per la scrittura
        if ('createWritable' in fileHandle) {
          const writable = await (fileHandle as any).createWritable();
          await writable.write(dataBlob);
          await writable.close();
        } else if ('createSyncAccessHandle' in fileHandle) {
          const accessHandle = await (fileHandle as any).createSyncAccessHandle();
          const buffer = await dataBlob.arrayBuffer();
          accessHandle.write(buffer, { at: 0 });
          accessHandle.close();
        } else {
          // Fallback per browser non supportati
          throw new Error('API File System Access non supportata');
        }
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
    link.download = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Sovrascrive un file esistente usando l'API File System Access
   */
  static async overwriteExistingFile(model: FaultTreeModel, fileHandle: FileSystemFileHandle): Promise<void> {
    const dataStr = JSON.stringify(model, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    try {
      // Utilizza l'API corretta per la scrittura
      if ('createWritable' in fileHandle) {
        // API moderna (Chrome 86+)
        const writable = await (fileHandle as any).createWritable();
        await writable.write(dataBlob);
        await writable.close();
      } else if ('createSyncAccessHandle' in fileHandle) {
        // API alternativa per alcuni browser
        const accessHandle = await (fileHandle as any).createSyncAccessHandle();
        const buffer = await dataBlob.arrayBuffer();
        accessHandle.write(buffer, { at: 0 });
        accessHandle.close();
      } else {
        // Fallback: crea un nuovo file con lo stesso nome
        const writable = await (fileHandle as any).createWritable();
        await writable.write(dataBlob);
        await writable.close();
      }
    } catch (error) {
      // Se fallisce l'API File System Access, usa il metodo tradizionale
      console.log('File System Access fallito, uso fallback:', error);
      
      // Fallback al metodo tradizionale
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fault-tree-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      throw new Error(`Errore durante la sovrascrittura del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
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
   * Esporta in formato XML con selezione cartella
   */
  static async exportToXML(model: FaultTreeModel, filename?: string): Promise<void> {
    const xmlContent = this.generateXML(model);
    const dataBlob = new Blob([xmlContent], { type: 'application/xml' });
    
    // Prova a utilizzare l'API File System Access se disponibile
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const defaultName = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.xml`;
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'XML Files',
            accept: {
              'application/xml': ['.xml']
            }
          }]
        });
        
        // Utilizza l'API corretta per la scrittura
        if ('createWritable' in fileHandle) {
          const writable = await (fileHandle as any).createWritable();
          await writable.write(dataBlob);
          await writable.close();
        } else if ('createSyncAccessHandle' in fileHandle) {
          const accessHandle = await (fileHandle as any).createSyncAccessHandle();
          const buffer = await dataBlob.arrayBuffer();
          accessHandle.write(buffer, { at: 0 });
          accessHandle.close();
        } else {
          // Fallback per browser non supportati
          throw new Error('API File System Access non supportata');
        }
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
    link.download = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Esporta in formato CSV con selezione cartella
   */
  static async exportToCSV(model: FaultTreeModel, filename?: string): Promise<void> {
    const csvContent = this.generateCSV(model);
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    
    // Prova a utilizzare l'API File System Access se disponibile
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const defaultName = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.csv`;
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'CSV Files',
            accept: {
              'text/csv': ['.csv']
            }
          }]
        });
        
        // Utilizza l'API corretta per la scrittura
        if ('createWritable' in fileHandle) {
          const writable = await (fileHandle as any).createWritable();
          await writable.write(dataBlob);
          await writable.close();
        } else if ('createSyncAccessHandle' in fileHandle) {
          const accessHandle = await (fileHandle as any).createSyncAccessHandle();
          const buffer = await dataBlob.arrayBuffer();
          accessHandle.write(buffer, { at: 0 });
          accessHandle.close();
        } else {
          // Fallback per browser non supportati
          throw new Error('API File System Access non supportata');
        }
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
    link.download = filename || `fault-tree-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Esporta codice in formato testo con selezione cartella
   */
  static async exportCode(codeContent: string, filename?: string): Promise<void> {
    const dataBlob = new Blob([codeContent], { type: 'text/plain' });
    
    // Prova a utilizzare l'API File System Access se disponibile
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const defaultName = filename || `fault-tree-code-${new Date().toISOString().split('T')[0]}.txt`;
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt']
            }
          }]
        });
        
        // Utilizza l'API corretta per la scrittura
        if ('createWritable' in fileHandle) {
          const writable = await (fileHandle as any).createWritable();
          await writable.write(dataBlob);
          await writable.close();
        } else if ('createSyncAccessHandle' in fileHandle) {
          const accessHandle = await (fileHandle as any).createSyncAccessHandle();
          const buffer = await dataBlob.arrayBuffer();
          accessHandle.write(buffer, { at: 0 });
          accessHandle.close();
        } else {
          // Fallback per browser non supportati
          throw new Error('API File System Access non supportata');
        }
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
    link.download = filename || `fault-tree-code-${new Date().toISOString().split('T')[0]}.txt`;
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
