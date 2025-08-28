import { FaultTreeModel, BaseEvent, Gate, GateType, Connection } from '../types/FaultTree';

export interface FaultTreeGenerationRequest {
  description: string;
  topEvent?: string;
  systemType?: string;
  components?: string[];
}

export interface GeneratedElement {
  type: 'event' | 'gate';
  name: string;
  description?: string;
  gateType?: GateType;
  failureRate?: number;
  position?: { x: number; y: number };
  inputs?: string[];
  parameters?: Record<string, any>;
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
      // Cerca pattern JSON nella risposta
      const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Parsing alternativo per formato strutturato
      return this.parseStructuredResponse(llmResponse);
    } catch (error) {
      console.error('Errore nel parsing della risposta LLM:', error);
      return null;
    }
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
    const events: BaseEvent[] = [];
    const gates: Gate[] = [];
    const connections: Connection[] = [];

    // Crea mappa per IDs
    const elementIds = new Map<string, string>();
    
    // Crea mappa per posizioni degli elementi
    const elementPositions = new Map<string, { x: number; y: number }>();

    // Algoritmo di layout gerarchico intelligente
    const layout = this.calculateHierarchicalLayout(generationResult, startPosition);

    // Genera eventi base (posizionati in basso)
    generationResult.elements
      .filter(el => el.type === 'event')
      .forEach((element, index) => {
        const id = `event-${Date.now()}-${index}`;
        elementIds.set(element.name, id);

        const position = layout.events[element.name] || { 
          x: startPosition.x + (index % 4) * 180, 
          y: startPosition.y + 400 
        };

        events.push({
          id,
          type: 'basic-event',
          name: element.name,
          description: element.description,
          failureRate: element.failureRate || 0.001,
          position,
          parameters: element.parameters || {}
        });
        
        elementPositions.set(element.name, position);
      });

    // Genera porte (posizionate sopra gli eventi)
    generationResult.elements
      .filter(el => el.type === 'gate')
      .forEach((element, index) => {
        const id = `gate-${Date.now()}-${index}`;
        elementIds.set(element.name, id);

        const position = layout.gates[element.name] || { 
          x: startPosition.x + (index % 3) * 250, 
          y: startPosition.y + 200 
        };

        gates.push({
          id,
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

    // Crea connessioni
    generationResult.connections.forEach((conn, index) => {
      const sourceId = elementIds.get(conn.source);
      const targetId = elementIds.get(conn.target);

      if (sourceId && targetId) {
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
      }
    });

    return {
      events,
      gates,
      connections,
      topEvent: generationResult.topEvent ? elementIds.get(generationResult.topEvent) : undefined
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
    const connections = generationResult.connections;

    // Analizza la struttura per determinare livelli
    const levels = this.analyzeHierarchy(connections, events, gates);
    
    // Posiziona elementi per livelli
    levels.forEach((level, levelIndex) => {
      const levelY = startPosition.y + (levelIndex * 200);
      const levelElements = level.elements;
      
      // Distribuisci elementi orizzontalmente nel livello
      levelElements.forEach((element, index) => {
        const x = startPosition.x + (index * 220);
        const y = levelY;
        
        if (element.type === 'event') {
          layout.events[element.name] = { x, y };
        } else {
          layout.gates[element.name] = { x, y };
        }
      });
    });

    return layout;
  }

  /**
   * Analizza la gerarchia per determinare i livelli
   */
  private static analyzeHierarchy(
    connections: Array<{ source: string; target: string }>,
    events: GeneratedElement[],
    gates: GeneratedElement[]
  ): Array<{ level: number; elements: GeneratedElement[] }> {
    const levels: Array<{ level: number; elements: GeneratedElement[] }> = [];
    
    // Trova elementi senza input (livello più alto)
    const topLevel = gates.filter(gate => 
      !connections.some(conn => conn.target === gate.name)
    );
    
    if (topLevel.length > 0) {
      levels.push({ level: 0, elements: topLevel });
    }
    
    // Trova elementi intermedi
    const intermediateLevel = gates.filter(gate => 
      connections.some(conn => conn.target === gate.name) &&
      connections.some(conn => conn.source === gate.name)
    );
    
    if (intermediateLevel.length > 0) {
      levels.push({ level: 1, elements: intermediateLevel });
    }
    
    // Eventi base sempre al livello più basso
    levels.push({ level: 2, elements: events });
    
    return levels;
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

Fornisci la risposta nel seguente formato JSON:

\`\`\`json
{
  "description": "Descrizione del fault tree",
  "topEvent": "Nome del top event",
  "elements": [
    {
      "type": "event",
      "name": "Nome evento base",
      "description": "Descrizione opzionale",
      "failureRate": 0.001
    },
    {
      "type": "gate",
      "name": "Nome porta logica", 
      "gateType": "OR|AND|PAND|SPARE|SEQ|FDEP",
      "description": "Descrizione opzionale"
    }
  ],
  "connections": [
    {
      "source": "Nome elemento sorgente",
      "target": "Nome porta target"
    }
  ]
}
\`\`\`

**LINEE GUIDA**:
1. Inizia dal top event e procedi verso il basso
2. Usa porte appropriate per la logica del sistema
3. Gli eventi base devono essere indipendenti e misurabili
4. Considera ridondanze e dipendenze temporali
5. Includi parametri realistici per i tassi di guasto`;

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
