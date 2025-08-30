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
      // 1) Cerca JSON in triple backticks con tag json
      const jsonFenceMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/i);
      if (jsonFenceMatch) {
        try {
          return JSON.parse(jsonFenceMatch[1].trim());
        } catch (e) {
          // Fallthrough: proveremo altri metodi
        }
      }

      // 2) Prova a parsare l'intera risposta come JSON (alcuni provider ritornano raw JSON)
      const trimmed = llmResponse.trim();
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Fallthrough
      }

      // 3) Estrai il primo oggetto JSON bilanciato { ... } nella risposta
      const extractFirstJsonObject = (text: string): string | null => {
        const start = text.indexOf('{');
        if (start === -1) return null;
        let depth = 0;
        for (let i = start; i < text.length; i++) {
          const ch = text[i];
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              return text.substring(start, i + 1);
            }
          }
        }
        return null;
      };

      const firstJson = extractFirstJsonObject(llmResponse);
      if (firstJson) {
        try {
          return JSON.parse(firstJson);
        } catch (e) {
          // Fallthrough
        }
      }

      // 4) Cerca blocchi fenced ` ``` ... ``` ` senza tag json e prova a parsarli
      const genericFenceMatch = llmResponse.match(/```([\s\S]*?)```/);
      if (genericFenceMatch) {
        try {
          return JSON.parse(genericFenceMatch[1].trim());
        } catch (e) {
          // Fallthrough
        }
      }

      // 5) Fallback: parsing testuale strutturato (legacy)
      return this.parseStructuredResponse(llmResponse);
    } catch (error) {
      console.error('Errore nel parsing della risposta LLM:', error);
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
    console.log('=== PRETTIFY LLM RESULT START ===');
    console.log('Input result:', result);
    
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
        
        console.log(`Event renamed: ${el.name} -> ${newName} (ID: ${newId})`);

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
        
        console.log(`Gate renamed: ${el.name} -> ${newName} (ID: ${newId})`);

        return {
          ...el,
          id: newId,
          name: newName,
          description: newDescription
        };
      }
    });

    console.log('Name to ID mapping:', Object.fromEntries(nameToId));
    console.log('New elements:', newElements);

    // Remap connections to use new ids if possible
    const newConnections = result.connections.map(conn => {
      const sourceId = nameToId.get(conn.source) || conn.source;
      const targetId = nameToId.get(conn.target) || conn.target;
      console.log(`Connection remap: ${conn.source}->${conn.target} -> ${sourceId}->${targetId}`);
      return { source: sourceId, target: targetId };
    }).filter(c => c.source && c.target);

    console.log('New connections:', newConnections);

    // Remap/decide topEvent
    let newTopEvent: string | undefined = undefined;
    if (result.topEvent) {
      newTopEvent = nameToId.get(result.topEvent) || nameToId.get(result.topEvent?.toString().toLowerCase() || '') || result.topEvent;
      console.log(`TopEvent remapped: ${result.topEvent} -> ${newTopEvent}`);
    }

    // If topEvent not provided by LLM, infer it: choose a gate that is not target of any connection
    if (!newTopEvent) {
      const gateElements = newElements.filter(e => e.type === 'gate');
      const connectionTargets = new Set(newConnections.map(c => c.target));
      console.log('Gate elements:', gateElements.map(g => ({ name: g.name, id: g.id })));
      console.log('Connection targets:', Array.from(connectionTargets));
      
      const candidate = gateElements.find(g => g.id && !connectionTargets.has(g.id));
      if (candidate) {
        newTopEvent = candidate.id;
        console.log('Top Event inferito automaticamente:', candidate.name, '->', candidate.id);
      } else {
        // Fallback: prendi la prima gate disponibile
        const firstGate = gateElements.find(g => g.id);
        if (firstGate) {
          newTopEvent = firstGate.id;
          console.log('Top Event fallback - prima gate disponibile:', firstGate.name, '->', firstGate.id);
        }
      }
    }
    
    // VALIDAZIONE: assicurati che il top event sia sempre una gate
    if (newTopEvent) {
      const topEventElement = newElements.find(e => e.id === newTopEvent);
      if (topEventElement && topEventElement.type === 'event') {
        console.warn('Top Event è un evento base, cercando di inferire una gate...');
        const gateElements = newElements.filter(e => e.type === 'gate');
        const connectionTargets = new Set(newConnections.map(c => c.target));
        
        const candidate = gateElements.find(g => g.id && !connectionTargets.has(g.id));
        if (candidate) {
          newTopEvent = candidate.id;
          console.log('Top Event corretto automaticamente:', candidate.name, '->', candidate.id);
        } else {
          const firstGate = gateElements.find(g => g.id);
          if (firstGate) {
            newTopEvent = firstGate.id;
            console.log('Top Event corretto con fallback:', firstGate.name, '->', firstGate.id);
          }
        }
      }
    }

    const prettifiedResult = {
      ...result,
      elements: newElements,
      connections: newConnections,
      topEvent: newTopEvent
    };
    
    console.log('=== PRETTIFY LLM RESULT END ===');
    console.log('Output result:', prettifiedResult);
    
    return prettifiedResult;
  }

  /**
   * Parsing di formato strutturato testuale
   */
  private static parseStructuredResponse(response: string): FaultTreeGenerationResult | null {
    const elements: GeneratedElement[] = [];
    const connections: Array<{ source: string; target: string }> = [];
    let topEvent: string | undefined;

    const lines = response.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentSection = '';
    
    for (const line of lines) {
      // Identifica sezioni
      if (line.toLowerCase().includes('top event:')) {
        topEvent = line.split(':')[1]?.trim();
        continue;
      }
      
      if (line.toLowerCase().includes('eventi base') || line.toLowerCase().includes('basic events')) {
        currentSection = 'events';
        continue;
      }
      
      if (line.toLowerCase().includes('porte') || line.toLowerCase().includes('gates')) {
        currentSection = 'gates';
        continue;
      }
      
      if (line.toLowerCase().includes('connessioni') || line.toLowerCase().includes('connections')) {
        currentSection = 'connections';
        continue;
      }

      // Parsing elementi in base alla sezione
      if (currentSection === 'events' && line.includes('-')) {
        const eventName = line.replace(/^-\s*/, '').trim();
        if (eventName) {
          elements.push({
            type: 'event',
            name: eventName,
            failureRate: 0.001 // Default
          });
        }
      }
      
      if (currentSection === 'gates' && line.includes('-')) {
        const gateInfo = line.replace(/^-\s*/, '').trim();
        const gateMatch = gateInfo.match(/^(.*?)\s*\((AND|OR|PAND|SPARE|SEQ|FDEP)\)/i);
        
        if (gateMatch) {
          elements.push({
            type: 'gate',
            name: gateMatch[1].trim(),
            gateType: gateMatch[2].toUpperCase() as GateType
          });
        }
      }
      
      if (currentSection === 'connections' && line.includes('->')) {
        const [source, target] = line.split('->').map(s => s.trim());
        if (source && target) {
          connections.push({ source, target });
        }
      }
    }

    return {
      elements,
      connections,
      topEvent,
      description: 'Fault tree generato automaticamente'
    };
  }

  /**
   * Converte il risultato generato in un modello FaultTree
   */
  static generateFaultTreeModel(
    generationResult: FaultTreeGenerationResult,
    startPosition: { x: number; y: number } = { x: 100, y: 100 }
  ): FaultTreeModel {
    console.log('=== GENERATE FAULT TREE MODEL START ===');
    console.log('Input generationResult:', generationResult);
    
    // Normalizza e rende i nomi compatibili con il SW prima di creare il modello
    generationResult = this.prettifyLLMResult(generationResult);
    
    console.log('After prettify:', generationResult);
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
    console.log('=== DEBUG CONNECTION CREATION ===');
    console.log('Element IDs map:', Object.fromEntries(elementIds));
    console.log('Available events:', events.map(e => ({ id: e.id, name: e.name })));
    console.log('Available gates:', gates.map(g => ({ id: g.id, name: g.name })));
    console.log('Connections to process:', generationResult.connections);
    
    generationResult.connections.forEach((conn, index) => {
      console.log(`\n--- Processing connection ${index} ---`);
      console.log('Raw connection:', conn);
      
      // Skip malformed connection entries
      if (!conn || !conn.source || !conn.target) {
        console.warn('Skipping malformed connection from LLM:', conn, 'index:', index);
        return;
      }

      // Risolvi source/target cercando prima la mappa per id/nome, poi con chiave normalizzata
      const resolvedSource = elementIds.get(conn.source) || elementIds.get(normalizeKey(conn.source));
      const resolvedTarget = elementIds.get(conn.target) || elementIds.get(normalizeKey(conn.target));
      
      console.log('Source resolution:', { 
        original: conn.source, 
        normalized: normalizeKey(conn.source), 
        resolved: resolvedSource 
      });
      console.log('Target resolution:', { 
        original: conn.target, 
        normalized: normalizeKey(conn.target), 
        resolved: resolvedTarget 
      });

      // Use resolved ids if available, otherwise fall back to the raw values
      const sourceId = resolvedSource || conn.source;
      const targetId = resolvedTarget || conn.target;
      
      console.log('Final IDs:', { sourceId, targetId });

      // Verify that resolved IDs correspond to actual created elements (events or gates)
      const sourceExists = events.some(e => e.id === sourceId) || gates.some(g => g.id === sourceId);
      const targetExists = events.some(e => e.id === targetId) || gates.some(g => g.id === targetId);
      
      console.log('Element existence:', { sourceExists, targetExists });

      if (!sourceExists || !targetExists) {
        console.warn('Skipping connection with unresolved endpoints:', { conn, sourceId, targetId });
        return;
      }

      connections.push({
        id: `connection-${Date.now()}-${index}`,
        source: sourceId,
        target: targetId,
        type: 'connection'
      });
      
      console.log('Connection created successfully');

      // Aggiorna inputs della gate target
      const targetGate = gates.find(g => g.id === targetId);
      if (targetGate && !targetGate.inputs.includes(sourceId)) {
        targetGate.inputs.push(sourceId);
        console.log(`Added ${sourceId} to inputs of gate ${targetGate.name}`);
      }
    });
    
    console.log('=== END CONNECTION CREATION ===');
    console.log('Final connections:', connections);

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
        console.warn('Top Event non fornito dalla LLM — inferito come gate senza incoming connections:', gateWithNoIncoming.name);
      } else {
        // Fallback: prendi la prima gate disponibile
        const firstGate = gates.find(g => g.id);
        if (firstGate) {
          resolvedTopEvent = firstGate.id;
          console.warn('Top Event non fornito dalla LLM — fallback su prima gate disponibile:', firstGate.name);
        } else {
          console.warn('Top Event non fornito dalla LLM e non è stato possibile inferirlo automaticamente');
        }
      }
    }

    // Imposta la flag isTopEvent sulla gate corrispondente (assicurati che sia univoca)
    if (resolvedTopEvent) {
      gates.forEach(g => {
        g.isTopEvent = g.id === resolvedTopEvent;
      });
      console.log('Top Event impostato:', resolvedTopEvent, 'su gate:', gates.find(g => g.isTopEvent)?.name);
    }

    const finalModel = {
      events,
      gates,
      connections,
      topEvent: resolvedTopEvent
    };

    // Log finale per debug
    const topEventGate = gates.find(g => g.isTopEvent);
    console.log('=== GENERATE FAULT TREE MODEL END ===');
    console.log('Modello finale generato:', {
      eventsCount: events.length,
      gatesCount: gates.length,
      connectionsCount: connections.length,
      topEvent: resolvedTopEvent,
      topEventGateName: topEventGate?.name,
      topEventGateId: topEventGate?.id
    });
    
    console.log('All gates with isTopEvent flag:');
    gates.forEach(g => {
      console.log(`- ${g.name} (${g.id}): isTopEvent = ${g.isTopEvent}`);
    });
    
    console.log('All connections:');
    connections.forEach(c => {
      console.log(`- ${c.source} -> ${c.target}`);
    });

    return finalModel;
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
    const connections = generationResult.connections;

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
    let prompt = `Come esperto in Dynamic Fault Tree Analysis, genera un fault tree per il seguente sistema:

**SISTEMA**: ${request.description}`;

    if (request.topEvent) {
      prompt += `\n**TOP EVENT**: ${request.topEvent}`;
    }

    if (request.systemType) {
      prompt += `\n**TIPO SISTEMA**: ${request.systemType}`;
    }

    if (request.components && request.components.length > 0) {
      prompt += `\n**COMPONENTI**: ${request.components.join(', ')}`;
    }

    prompt += `

Fornisci la risposta nel seguente formato JSON (se possibile includi le distribuzioni di probabilità per gli eventi base):

\`\`\`json
{
  "description": "Descrizione del fault tree",
  "topEvent": "ID di una GATE (NON di un evento base)",
  "elements": [
    {
      "type": "event",
      "id": "event-1",
      "name": "Nome evento base",
      "description": "Descrizione opzionale",
      "failureRate": 0.001,
      "failureProbabilityDistribution": { "type": "exponential", "lambda": 0.001 },
      "repairProbabilityDistribution": { "type": "exponential", "lambda": 0.01 }
    },
    {
      "type": "gate",
      "id": "gate-1",
      "name": "Nome porta logica", 
      "gateType": "OR|AND|PAND|SPARE|SEQ|FDEP",
      "description": "Descrizione opzionale"
    }
  ],
  "connections": [
    {
      "source": "ID elemento sorgente",
      "target": "ID porta target"
    }
  ]
}
\`\`\`

**LINEE GUIDA IMPORTANTI**:
1. Il TOP EVENT deve essere una GATE (porta logica), NON un evento base
2. Inizia dal top event e procedi verso il basso
3. Usa porte appropriate per la logica del sistema (AND, OR, etc.)
4. Gli eventi base devono essere indipendenti e misurabili
5. Considera ridondanze e dipendenze temporali
6. Includi parametri realistici per i tassi di guasto
7. Usa sempre gli ID per le connessioni, non i nomi`;

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
