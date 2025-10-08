import { FaultTreeModel, BaseEvent, Gate, GateType, Connection } from '../types/FaultTree';

export interface FaultTreeGenerationRequest {
  description: string;
  topEvent?: string;
  systemType?: string;
  components?: string[];
}

export interface GeneratedElement {
  type: 'event' | 'gate';
  // Optional id provided by the LLM to avoid ambiguous name->id mapping
  id?: string;
  name: string;
  description?: string;
  gateType?: GateType;
  failureRate?: number;
  position?: { x: number; y: number };
  inputs?: string[];
  parameters?: Record<string, any>;
  // Distribuzioni di probabilità opzionali
  failureProbabilityDistribution?: any;
  repairProbabilityDistribution?: any;
}

export interface FaultTreeGenerationResult {
  elements: GeneratedElement[];
  connections: Array<{ source: string; target: string }>;
  topEvent?: string;
  description: string;
}

export class FaultTreeGenerator {
  
  /**
   * Parsing del comando LLM per estrarre struttura fault tree
   */
  static parseLLMResponse(llmResponse: string): FaultTreeGenerationResult | null {
    try {
      console.log('Parsing LLM response:', llmResponse.substring(0, 500) + '...');

      // 1) Cerca JSON in triple backticks con tag json
      const jsonFenceMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/i);
      if (jsonFenceMatch) {
        try {
          const jsonContent = jsonFenceMatch[1].trim();
          const parsed = JSON.parse(jsonContent);

          // Controlla se è nel formato alternativo (con nodes/children)
          if (parsed.nodes && Array.isArray(parsed.nodes)) {
            console.log('Detected alternative JSON format with nodes/children');
            return this.convertAlternativeFormat(parsed);
          }

          return this.tryParseJSON(jsonContent, 'JSON fence with tag');
        } catch (e) {
          console.log('Failed to parse JSON fence with tag, trying repair...');
          const repaired = this.repairJSON(jsonFenceMatch[1].trim());
          if (repaired) {
            return this.tryParseJSON(repaired, 'Repaired JSON fence');
          }
        }
      }

      // 2) Cerca blocchi fenced generici ``` ... ```
      const genericFenceMatch = llmResponse.match(/```([\s\S]*?)```/);
      if (genericFenceMatch) {
        try {
          const content = genericFenceMatch[1].trim();
          // Prova come JSON diretto
          if (content.startsWith('{') && content.endsWith('}')) {
            return this.tryParseJSON(content, 'Generic fence as JSON');
          }
        } catch (e) {
          console.log('Failed to parse generic fence as JSON');
        }
      }

      // 3) Estrai il primo oggetto JSON bilanciato { ... } nella risposta
      const extractedJson = this.extractFirstJsonObject(llmResponse);
      if (extractedJson) {
        const parsed = this.tryParseJSON(extractedJson, 'Extracted balanced JSON');
        if (parsed) return parsed;
        
        // Prova a riparare il JSON estratto
        const repaired = this.repairJSON(extractedJson);
        if (repaired) {
          return this.tryParseJSON(repaired, 'Repaired extracted JSON');
        }
      }

      // 4) Prova a parsare l'intera risposta come JSON (alcuni provider ritornano raw JSON)
      const trimmed = llmResponse.trim();
      try {
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          return this.tryParseJSON(trimmed, 'Full response as JSON');
        }
      } catch (e) {
        console.log('Failed to parse full response as JSON');
      }

      // 5) Cerca pattern JSON multipli e prova ognuno
      const jsonObjects = this.extractAllJsonObjects(llmResponse);
      for (const jsonObj of jsonObjects) {
        const parsed = this.tryParseJSON(jsonObj, 'Multiple JSON objects');
        if (parsed && this.validateFaultTreeResult(parsed)) {
          return parsed;
        }
      }

      // 6) Fallback: parsing testuale strutturato migliorato
      console.log('Falling back to structured text parsing');
      return this.parseStructuredResponse(llmResponse);
    } catch (error) {
      console.error('Errore nel parsing della risposta LLM:', error);
      return null;
    }
  }

  /**
   * Prova a parsare JSON e valida il risultato
   */
  private static tryParseJSON(jsonString: string, source: string): FaultTreeGenerationResult | null {
    try {
      const parsed = JSON.parse(jsonString);
      console.log(`Successfully parsed JSON from ${source}`);
      
      if (this.validateFaultTreeResult(parsed)) {
        return parsed;
      } else {
        console.log(`Parsed JSON from ${source} failed validation`);
        return null;
      }
    } catch (e) {
      console.log(`Failed to parse JSON from ${source}:`, e);
      return null;
    }
  }

  /**
   * Converte formato alternativo (nodes/children) nel formato standard
   */
  private static convertAlternativeFormat(parsed: any): FaultTreeGenerationResult | null {
    try {
      const elements: GeneratedElement[] = [];
      const connections: Array<{ source: string; target: string }> = [];
      let topEvent: string | undefined;

      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        return null;
      }

      // Converti i nodi nel formato standard
      parsed.nodes.forEach((node: any) => {
        if (node.type === 'BASIC' || node.type === 'basic' || node.type === 'event') {
          // Evento base
          elements.push({
            type: 'event',
            id: node.id,
            name: node.label || node.name || node.id,
            description: node.description,
            failureRate: node.probability || node.failureRate || 0.001
          });
        } else if (node.type === 'AND' || node.type === 'OR' || node.type === 'PAND' ||
                   node.type === 'SPARE' || node.type === 'SEQ' || node.type === 'FDEP' ||
                   node.type === 'gate') {
          // Gate
          elements.push({
            type: 'gate',
            id: node.id,
            name: node.label || node.name || node.id,
            description: node.description,
            gateType: (node.type === 'gate' ? 'OR' : node.type) as GateType
          });

          // Se ha children, crea le connessioni
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((childId: string) => {
              connections.push({
                source: childId,
                target: node.id
              });
            });
          }
        }
      });

      // Il top event è specificato o è il primo nodo
      topEvent = parsed.top_event || parsed.topEvent || (parsed.nodes.length > 0 ? parsed.nodes[0].id : undefined);

      const description = parsed.description || parsed.system || 'Fault tree generated from alternative format';

      return {
        elements,
        connections,
        topEvent,
        description
      };
    } catch (error) {
      console.error('Error converting alternative format:', error);
      return null;
    }
  }

  /**
   * Valida che il risultato sia un FaultTreeGenerationResult valido
   */
  private static validateFaultTreeResult(obj: any): boolean {
    return obj &&
           typeof obj === 'object' &&
           Array.isArray(obj.elements) &&
           Array.isArray(obj.connections) &&
           obj.elements.length > 0;
  }

  /**
   * Estrae il primo oggetto JSON bilanciato
   */
  private static extractFirstJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    if (start === -1) return null;
    
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (ch === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            return text.substring(start, i + 1);
          }
        }
      }
    }
    return null;
  }

  /**
   * Estrae tutti gli oggetti JSON possibili dalla risposta
   */
  private static extractAllJsonObjects(text: string): string[] {
    const objects: string[] = [];
    let searchStart = 0;
    
    while (searchStart < text.length) {
      const start = text.indexOf('{', searchStart);
      if (start === -1) break;
      
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let foundEnd = false;
      
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (ch === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              objects.push(text.substring(start, i + 1));
              searchStart = i + 1;
              foundEnd = true;
              break;
            }
          }
        }
      }
      
      if (!foundEnd) {
        searchStart = start + 1;
      }
    }
    
    return objects;
  }

  /**
   * Tenta di riparare JSON malformato
   */
  private static repairJSON(jsonString: string): string | null {
    try {
      let repaired = jsonString.trim();
      
      // Rimuovi commenti // e /* */
      repaired = repaired.replace(/\/\/.*$/gm, '');
      repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Fixa virgole mancanti o extra
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1'); // Rimuovi virgole prima di } o ]
      repaired = repaired.replace(/([}\]])(\s*)([{"])/g, '$1,$2$3'); // Aggiungi virgole mancanti
      
      // Fixa virgolette mancanti per le chiavi
      repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      
      // Prova a parsare il JSON riparato
      JSON.parse(repaired);
      return repaired;
    } catch (e) {
      console.log('Failed to repair JSON:', e);
      return null;
    }
  }

    /**
   * Prettify/normalize the LLM generation result to match SW naming conventions.
   * - Prefix original LLM name into description: "OriginalName: Description"
   * - Rename basic events to BE_X and gates to GateType_Y
   * - Ensure connections and topEvent reference the new names/ids
   */
  private static prettifyLLMResult(result: FaultTreeGenerationResult): FaultTreeGenerationResult {
    
    const beCount = { value: 0 };
    const gateCounts: Record<string, number> = {};
    const nameToId = new Map<string, string>();

    const newElements = result.elements.map(el => {
      if (el.type === 'event') {
        beCount.value += 1;
        const newName = `BE_${beCount.value}`;
        // Aggregate original name into description
        const newDescription = el.name + (el.description ? `: ${el.description}` : '');
        const newId = el.id && el.id.length > 0 ? el.id : newName;
        nameToId.set(el.name, newId);
        nameToId.set(newName, newId);

        return {
          ...el,
          id: newId,
          name: newName,
          description: newDescription
        };
      } else {
        const gateType = el.gateType || 'GATE';
        gateCounts[gateType] = (gateCounts[gateType] || 0) + 1;
        const newName = `${gateType}_${gateCounts[gateType]}`;
        const newDescription = el.name + (el.description ? `: ${el.description}` : '');
        const newId = el.id && el.id.length > 0 ? el.id : newName;
        nameToId.set(el.name, newId);
        nameToId.set(newName, newId);

        return {
          ...el,
          id: newId,
          name: newName,
          description: newDescription
        };
      }
    });


    // Remap connections to use new ids if possible
    const newConnections = result.connections.map(conn => {
      const sourceId = nameToId.get(conn.source) || conn.source;
      const targetId = nameToId.get(conn.target) || conn.target;
      return { source: sourceId, target: targetId };
    }).filter(c => c.source && c.target);


    // Remap/decide topEvent
    let newTopEvent: string | undefined = undefined;
    if (result.topEvent) {
      newTopEvent = nameToId.get(result.topEvent) || nameToId.get(result.topEvent?.toString().toLowerCase() || '') || result.topEvent;
    }

    // If topEvent not provided by LLM, infer it: choose a gate that is not target of any connection
    if (!newTopEvent) {
      const gateElements = newElements.filter(e => e.type === 'gate');
      const connectionTargets = new Set(newConnections.map(c => c.target));
      
      const candidate = gateElements.find(g => g.id && !connectionTargets.has(g.id));
      if (candidate) {
        newTopEvent = candidate.id;
      } else {
        // Fallback: prendi la prima gate disponibile
        const firstGate = gateElements.find(g => g.id);
        if (firstGate) {
          newTopEvent = firstGate.id;
        }
      }
    }
    
    // VALIDAZIONE: assicurati che il top event sia sempre una gate
    if (newTopEvent) {
      const topEventElement = newElements.find(e => e.id === newTopEvent);
      if (topEventElement && topEventElement.type === 'event') {
        const gateElements = newElements.filter(e => e.type === 'gate');
        const connectionTargets = new Set(newConnections.map(c => c.target));
        
        const candidate = gateElements.find(g => g.id && !connectionTargets.has(g.id));
        if (candidate) {
          newTopEvent = candidate.id;
        } else {
          const firstGate = gateElements.find(g => g.id);
          if (firstGate) {
            newTopEvent = firstGate.id;
          }
        }
      }
    }

    return {
      ...result,
      elements: newElements,
      connections: newConnections,
      topEvent: newTopEvent
    };
  }

  /**
   * Parsing di formato strutturato testuale migliorato
   */
  private static parseStructuredResponse(response: string): FaultTreeGenerationResult | null {
    try {
      console.log('Attempting structured text parsing...');
      const elements: GeneratedElement[] = [];
      const connections: Array<{ source: string; target: string }> = [];
      let topEvent: string | undefined;
      let description = 'Fault tree generato automaticamente';

      const lines = response.split('\n').map(line => line.trim()).filter(line => line);
      
      let currentSection = '';
      
      for (const line of lines) {
        // Identifica sezioni con pattern più flessibili
        if (this.matchesPattern(line, ['top event', 'evento principale', 'root cause'])) {
          topEvent = this.extractValue(line);
          continue;
        }
        
        if (this.matchesPattern(line, ['description', 'descrizione', 'sistema'])) {
          const desc = this.extractValue(line);
          if (desc) description = desc;
          continue;
        }
        
        if (this.matchesPattern(line, ['eventi base', 'basic events', 'eventi', 'events'])) {
          currentSection = 'events';
          continue;
        }
        
        if (this.matchesPattern(line, ['porte', 'gates', 'porte logiche', 'logic gates'])) {
          currentSection = 'gates';
          continue;
        }
        
        if (this.matchesPattern(line, ['connessioni', 'connections', 'collegamenti', 'links'])) {
          currentSection = 'connections';
          continue;
        }

        // Parsing elementi in base alla sezione
        if (currentSection === 'events') {
          const event = this.parseEventLine(line);
          if (event) elements.push(event);
        }
        
        if (currentSection === 'gates') {
          const gate = this.parseGateLine(line);
          if (gate) elements.push(gate);
        }
        
        if (currentSection === 'connections') {
          const connection = this.parseConnectionLine(line);
          if (connection) connections.push(connection);
        }

        // Prova anche a parsare pattern inline
        const inlineElements = this.parseInlineElements(line);
        elements.push(...inlineElements);

        const inlineConnections = this.parseInlineConnections(line);
        connections.push(...inlineConnections);
      }

      // Se non abbiamo trovato elementi, prova pattern alternativi
      if (elements.length === 0) {
        return this.parseAlternativeFormats(response);
      }

      // Deduplicazione elementi
      const uniqueElements = this.deduplicateElements(elements);
      const uniqueConnections = this.deduplicateConnections(connections);

      return {
        elements: uniqueElements,
        connections: uniqueConnections,
        topEvent,
        description
      };
    } catch (error) {
      console.error('Error in structured text parsing:', error);
      return null;
    }
  }

  /**
   * Verifica se una linea corrisponde a uno dei pattern
   */
  private static matchesPattern(line: string, patterns: string[]): boolean {
    const lowerLine = line.toLowerCase();
    return patterns.some(pattern => lowerLine.includes(pattern.toLowerCase()));
  }

  /**
   * Estrae il valore dopo i due punti o uguale
   */
  private static extractValue(line: string): string | undefined {
    const colonMatch = line.split(':')[1]?.trim();
    if (colonMatch) return colonMatch;
    
    const equalMatch = line.split('=')[1]?.trim();
    if (equalMatch) return equalMatch;
    
    return undefined;
  }

  /**
   * Parsing avanzato di linee eventi
   */
  private static parseEventLine(line: string): GeneratedElement | null {
    // Pattern: - EventName (rate: 0.001)
    const advancedMatch = line.match(/^[-*•]\s*(.+?)\s*\(rate:\s*([\d.]+)\)/i);
    if (advancedMatch) {
      return {
        type: 'event',
        name: advancedMatch[1].trim(),
        failureRate: parseFloat(advancedMatch[2])
      };
    }

    // Pattern semplice: - EventName
    const simpleMatch = line.match(/^[-*•]\s*(.+)/);
    if (simpleMatch) {
      return {
        type: 'event',
        name: simpleMatch[1].trim(),
        failureRate: 0.001
      };
    }

    return null;
  }

  /**
   * Parsing avanzato di linee gates
   */
  private static parseGateLine(line: string): GeneratedElement | null {
    // Pattern: - GateName (AND|OR|PAND|SPARE|SEQ|FDEP)
    const gateMatch = line.match(/^[-*•]\s*(.+?)\s*\((AND|OR|PAND|SPARE|SEQ|FDEP)\)/i);
    if (gateMatch) {
      return {
        type: 'gate',
        name: gateMatch[1].trim(),
        gateType: gateMatch[2].toUpperCase() as GateType
      };
    }

    // Pattern alternativo: AND Gate: GateName
    const altMatch = line.match(/^(AND|OR|PAND|SPARE|SEQ|FDEP)\s+gate:\s*(.+)/i);
    if (altMatch) {
      return {
        type: 'gate',
        name: altMatch[2].trim(),
        gateType: altMatch[1].toUpperCase() as GateType
      };
    }

    return null;
  }

  /**
   * Parsing avanzato di linee connessioni
   */
  private static parseConnectionLine(line: string): { source: string; target: string } | null {
    // Pattern: Source -> Target
    const arrowMatch = line.match(/^[-*•]?\s*(.+?)\s*->\s*(.+)/);
    if (arrowMatch) {
      return {
        source: arrowMatch[1].trim(),
        target: arrowMatch[2].trim()
      };
    }

    // Pattern alternativo: Source connects to Target
    const connectsMatch = line.match(/(.+?)\s+connects?\s+to\s+(.+)/i);
    if (connectsMatch) {
      return {
        source: connectsMatch[1].trim(),
        target: connectsMatch[2].trim()
      };
    }

    return null;
  }

  /**
   * Parsing elementi inline nel testo
   */
  private static parseInlineElements(line: string): GeneratedElement[] {
    const elements: GeneratedElement[] = [];
    
    // Cerca pattern come "Event: EventName" o "Gate: GateName (TYPE)"
    const eventMatches = line.match(/Event:\s*([^,\n]+)/gi);
    if (eventMatches) {
      eventMatches.forEach(match => {
        const name = match.replace(/Event:\s*/i, '').trim();
        if (name) {
          elements.push({
            type: 'event',
            name,
            failureRate: 0.001
          });
        }
      });
    }

    const gateMatches = line.match(/Gate:\s*([^,\n]+?)(?:\s*\(([^)]+)\))?/gi);
    if (gateMatches) {
      gateMatches.forEach(match => {
        const parts = match.replace(/Gate:\s*/i, '').trim();
        const gateTypeMatch = parts.match(/^(.+?)\s*\(([^)]+)\)/);
        if (gateTypeMatch) {
          const gateType = gateTypeMatch[2].toUpperCase();
          if (['AND', 'OR', 'PAND', 'SPARE', 'SEQ', 'FDEP'].includes(gateType)) {
            elements.push({
              type: 'gate',
              name: gateTypeMatch[1].trim(),
              gateType: gateType as GateType
            });
          }
        }
      });
    }

    return elements;
  }

  /**
   * Parsing connessioni inline nel testo
   */
  private static parseInlineConnections(line: string): Array<{ source: string; target: string }> {
    const connections: Array<{ source: string; target: string }> = [];
    
    // Pattern: "A -> B" o "A connects to B"
    const arrowMatches = line.match(/([^->\n]+)\s*->\s*([^->\n]+)/g);
    if (arrowMatches) {
      arrowMatches.forEach(match => {
        const [source, target] = match.split('->').map(s => s.trim());
        if (source && target) {
          connections.push({ source, target });
        }
      });
    }

    return connections;
  }

  /**
   * Prova formati alternativi quando il parsing standard fallisce
   */
  private static parseAlternativeFormats(response: string): FaultTreeGenerationResult | null {
    console.log('Trying alternative parsing formats...');
    
    // Cerca pattern di fault tree descrittivo
    const elements: GeneratedElement[] = [];
    const connections: Array<{ source: string; target: string }> = [];
    
    // Estrai tutti i nomi che sembrano componenti
    const componentMatches = response.match(/[A-Za-z][A-Za-z0-9\s_-]*(?=\s*(fail|fault|error|guasto))/gi);
    if (componentMatches) {
      componentMatches.forEach(comp => {
        elements.push({
          type: 'event',
          name: comp.trim() + ' Failure',
          failureRate: 0.001
        });
      });
    }

    // Se abbiamo ancora elementi insufficienti, crea un esempio base
    if (elements.length < 2) {
      return {
        elements: [
          {
            type: 'event',
            name: 'Component A Failure',
            failureRate: 0.001
          },
          {
            type: 'event', 
            name: 'Component B Failure',
            failureRate: 0.001
          },
          {
            type: 'gate',
            name: 'System Failure',
            gateType: 'OR'
          }
        ],
        connections: [
          { source: 'Component A Failure', target: 'System Failure' },
          { source: 'Component B Failure', target: 'System Failure' }
        ],
        topEvent: 'System Failure',
        description: 'Fault tree generato da parsing testuale'
      };
    }

    return {
      elements,
      connections,
      description: 'Fault tree generato da parsing alternativo'
    };
  }

  /**
   * Rimuove elementi duplicati
   */
  private static deduplicateElements(elements: GeneratedElement[]): GeneratedElement[] {
    const seen = new Set<string>();
    return elements.filter(el => {
      const key = `${el.type}-${el.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Rimuove connessioni duplicate
   */
  private static deduplicateConnections(connections: Array<{ source: string; target: string }>): Array<{ source: string; target: string }> {
    const seen = new Set<string>();
    return connections.filter(conn => {
      const key = `${conn.source}->${conn.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Converte il risultato generato in un modello FaultTree
   */
  static generateFaultTreeModel(
    generationResult: FaultTreeGenerationResult,
    startPosition: { x: number; y: number } = { x: 100, y: 100 }
  ): FaultTreeModel {
    // Normalizza e rende i nomi compatibili con il SW prima di creare il modello
    generationResult = this.prettifyLLMResult(generationResult);
    const events: BaseEvent[] = [];
    const gates: Gate[] = [];
    const connections: Connection[] = [];

    // Crea mappa per IDs (supporta lookup normalizzato per name/id)
    const elementIds = new Map<string, string>();
    const normalizeKey = (s: string) => s.trim().toLowerCase();
    
    // Crea mappa per posizioni degli elementi
    const elementPositions = new Map<string, { x: number; y: number }>();

    // Algoritmo di layout gerarchico intelligente
    const layout = this.calculateHierarchicalLayout(generationResult, startPosition);

    // Genera eventi base (posizionati in basso)
    generationResult.elements
      .filter(el => el.type === 'event')
      .forEach((element, index) => {
        // Prefer an ID provided by the LLM, otherwise generate one
        const assignedId = element.id && element.id.length > 0 ? element.id : `event-${Date.now()}-${index}`;
        // Map both name and optional LLM id to the assignedId to support lookups by either
        elementIds.set(element.name, assignedId);
        elementIds.set(normalizeKey(element.name), assignedId);
        if (element.id && element.id.length > 0) {
          elementIds.set(element.id, assignedId);
          elementIds.set(normalizeKey(element.id), assignedId);
        }

        const position = layout.events[element.name] || { 
          x: startPosition.x + (index % 4) * 180, 
          y: startPosition.y + 400 
        };

        const baseEvent: BaseEvent = {
          id: assignedId,
          type: 'basic-event',
          name: element.name,
          description: element.description,
          failureRate: element.failureRate || 0.001,
          position,
          parameters: element.parameters || {}
        };

        // Mappa le distribuzioni di probabilità se presenti
        if (element.failureProbabilityDistribution) {
          baseEvent.failureProbabilityDistribution = element.failureProbabilityDistribution;
        }

        if (element.repairProbabilityDistribution) {
          baseEvent.repairProbabilityDistribution = element.repairProbabilityDistribution;
        }

        events.push(baseEvent);
        
        elementPositions.set(element.name, position);
      });

    // Genera porte (posizionate sopra gli eventi)
    generationResult.elements
      .filter(el => el.type === 'gate')
      .forEach((element, index) => {
        // Prefer an ID provided by the LLM, otherwise generate one
        const assignedId = element.id && element.id.length > 0 ? element.id : `gate-${Date.now()}-${index}`;
        elementIds.set(element.name, assignedId);
        elementIds.set(normalizeKey(element.name), assignedId);
        if (element.id && element.id.length > 0) {
          elementIds.set(element.id, assignedId);
          elementIds.set(normalizeKey(element.id), assignedId);
        }

        const position = layout.gates[element.name] || { 
          x: startPosition.x + (index % 3) * 250, 
          y: startPosition.y + 200 
        };

        gates.push({
          id: assignedId,
          type: 'gate',
          gateType: element.gateType || 'OR',
          name: element.name,
          description: element.description,
          position,
          inputs: [],
          parameters: element.parameters || {}
        });

        elementPositions.set(element.name, position);
      });

    // Crea connessioni — supporta sia names che ids nel risultato LLM
    generationResult.connections.forEach((conn, index) => {
      // Skip malformed connection entries
      if (!conn || !conn.source || !conn.target) {
        return;
      }

      // Risolvi source/target cercando prima la mappa per id/nome, poi con chiave normalizzata
      const resolvedSource = elementIds.get(conn.source) || elementIds.get(normalizeKey(conn.source));
      const resolvedTarget = elementIds.get(conn.target) || elementIds.get(normalizeKey(conn.target));

      // Use resolved ids if available, otherwise fall back to the raw values
      const sourceId = resolvedSource || conn.source;
      const targetId = resolvedTarget || conn.target;

      // Verify that resolved IDs correspond to actual created elements (events or gates)
      const sourceExists = events.some(e => e.id === sourceId) || gates.some(g => g.id === sourceId);
      const targetExists = events.some(e => e.id === targetId) || gates.some(g => g.id === targetId);

      if (!sourceExists || !targetExists) {
        return;
      }

      connections.push({
        id: `connection-${Date.now()}-${index}`,
        source: sourceId,
        target: targetId,
        type: 'connection'
      });

      // Aggiorna inputs della gate target
      const targetGate = gates.find(g => g.id === targetId);
      if (targetGate && !targetGate.inputs.includes(sourceId)) {
        targetGate.inputs.push(sourceId);
      }
    });

    // Risolvi topEvent se fornito come name o come id
    let resolvedTopEvent: string | undefined;
    if (generationResult.topEvent) {
      resolvedTopEvent = elementIds.get(generationResult.topEvent) || elementIds.get(normalizeKey(generationResult.topEvent)) || generationResult.topEvent;
    }

    // Se la LLM non ha fornito il topEvent, cerca di inferirlo: seleziona la prima gate senza incoming connections
    if (!resolvedTopEvent) {
      const gateWithNoIncoming = gates.find(g => !connections.some(conn => conn.target === g.id));
      if (gateWithNoIncoming) {
        resolvedTopEvent = gateWithNoIncoming.id;
      } else {
        // Fallback: prendi la prima gate disponibile
        const firstGate = gates.find(g => g.id);
        if (firstGate) {
          resolvedTopEvent = firstGate.id;
        }
      }
    }

    // Imposta la flag isTopEvent sulla gate corrispondente (assicurati che sia univoca)
    if (resolvedTopEvent) {
      gates.forEach(g => {
        g.isTopEvent = g.id === resolvedTopEvent;
      });
    }

    return {
      events,
      gates,
      connections,
      topEvent: resolvedTopEvent
    };
  }

  /**
   * Calcola layout gerarchico intelligente per posizionare elementi
   */
  private static calculateHierarchicalLayout(
    generationResult: FaultTreeGenerationResult,
    startPosition: { x: number; y: number }
  ): { events: Record<string, { x: number; y: number }>, gates: Record<string, { x: number; y: number }> } {
    const layout = {
      events: {} as Record<string, { x: number; y: number }>,
      gates: {} as Record<string, { x: number; y: number }>
    };

    const events = generationResult.elements.filter(el => el.type === 'event');
    const gates = generationResult.elements.filter(el => el.type === 'gate');

    // Usa layout semplificato e robusto
    const simpleLayout = this.calculateSimpleLayout(events, gates, startPosition);
    layout.events = simpleLayout.events;
    layout.gates = simpleLayout.gates;

    return layout;
  }

  /**
   * Layout semplificato e robusto per posizionare elementi
   */
  private static calculateSimpleLayout(
    events: GeneratedElement[],
    gates: GeneratedElement[],
    startPosition: { x: number; y: number }
  ): { events: Record<string, { x: number; y: number }>, gates: Record<string, { x: number; y: number }> } {
    const layout = {
      events: {} as Record<string, { x: number; y: number }>,
      gates: {} as Record<string, { x: number; y: number }>
    };

    // Posiziona le gate in alto
    gates.forEach((gate, index) => {
      const x = startPosition.x + (index % 3) * 250;
      const y = startPosition.y + 100;
      layout.gates[gate.name] = { x, y };
    });

    // Posiziona gli eventi in basso
    events.forEach((event, index) => {
      const x = startPosition.x + (index % 4) * 180;
      const y = startPosition.y + 300;
      layout.events[event.name] = { x, y };
    });

    return layout;
  }

  /**
   * Genera prompt specializzato per creazione fault tree
   */
  static createFaultTreePrompt(request: FaultTreeGenerationRequest): string {
    let prompt = `You are an expert in Dynamic Fault Tree Analysis. Generate a fault tree for the following system.

**SYSTEM**: ${request.description}`;

    if (request.topEvent) {
      prompt += `\n**TOP EVENT**: ${request.topEvent}`;
    }

    if (request.systemType) {
      prompt += `\n**SYSTEM TYPE**: ${request.systemType}`;
    }

    if (request.components && request.components.length > 0) {
      prompt += `\n**COMPONENTS**: ${request.components.join(', ')}`;
    }

    prompt += `

CRITICAL: You MUST respond with ONLY valid JSON in the exact format shown below. Do NOT include any explanatory text before or after the JSON.

Your response must be a single JSON object with this structure:

\`\`\`json
{
  "description": "Fault tree description",
  "topEvent": "gate-1",
  "elements": [
    {
      "type": "event",
      "id": "event-1",
      "name": "Component A Failure",
      "description": "Detailed failure description",
      "failureRate": 0.001
    },
    {
      "type": "event",
      "id": "event-2",
      "name": "Component B Failure",
      "description": "Detailed failure description",
      "failureRate": 0.002
    },
    {
      "type": "gate",
      "id": "gate-1",
      "name": "Main System Failure",
      "gateType": "OR",
      "description": "System fails when any component fails"
    }
  ],
  "connections": [
    {
      "source": "event-1",
      "target": "gate-1"
    },
    {
      "source": "event-2",
      "target": "gate-1"
    }
  ]
}
\`\`\`

**MANDATORY JSON RULES**:
1. **STRICT FORMAT**: Use exactly the JSON format shown above
2. **UNIQUE IDS**: Each element must have a unique ID (event-1, event-2, gate-1, etc.)
3. **TOP EVENT**: Must always be the ID of a GATE, never an event
4. **GATE TYPES**: Use only: "AND", "OR", "PAND", "SPARE", "SEQ", "FDEP"
5. **CONNECTIONS**: Always use element IDs, never names
6. **SYNTAX**: Ensure valid JSON (commas, quotes, balanced brackets)
7. **NO COMMENTS**: Do not include comments in JSON
8. **JSON ONLY**: Your entire response must be valid JSON with no text before or after

**FAULT TREE STRUCTURE**:
- Start from top event (main gate) and work downward
- Base events represent fundamental failures
- Gates represent combination logic
- Use AND for simultaneous failures, OR for alternative failures
- Consider redundancies and temporal dependencies appropriate to the system

RESPOND WITH ONLY THE JSON OBJECT.`;

    return prompt;
  }

  /**
   * Genera esempi di fault tree predefiniti
   */
  static getExampleFaultTrees(): Array<{ name: string; request: FaultTreeGenerationRequest }> {
    return [
      {
        name: "Sistema di Alimentazione Elettrica",
        request: {
          description: "Sistema di alimentazione elettrica con doppia ridondanza",
          topEvent: "Perdita Alimentazione Sistema",
          systemType: "Elettrico",
          components: ["Alimentatore Principale", "Alimentatore Backup", "UPS", "Batteria"]
        }
      },
      {
        name: "Sistema Frenante Automotive",
        request: {
          description: "Sistema frenante automotive con ABS",
          topEvent: "Perdita Capacità Frenante",
          systemType: "Meccanico",
          components: ["Freni Anteriori", "Freni Posteriori", "Sistema ABS", "Pompa Freno"]
        }
      },
      {
        name: "Sistema di Controllo Industriale",
        request: {
          description: "Sistema di controllo di processo industriale con PLC",
          topEvent: "Arresto Processo Produttivo",
          systemType: "Controllo",
          components: ["PLC Principale", "PLC Backup", "Sensori", "Attuatori", "HMI"]
        }
      }
    ];
  }
}
