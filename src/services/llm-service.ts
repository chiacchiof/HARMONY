import { LLMConfig } from '../config/llm-config';
import { FaultTreeGenerator, FaultTreeGenerationRequest } from './fault-tree-generator';
import { FaultTreeModel } from '../types/FaultTree';

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Genera un fault tree basato su una richiesta dell'utente
   */
  async generateFaultTree(request: FaultTreeGenerationRequest): Promise<FaultTreeModel | null> {
    try {
      const prompt = FaultTreeGenerator.createFaultTreePrompt(request);
      
      // Usa configurazione ottimizzata per fault tree generation
      const enhancedConfig = {
        ...this.config,
        maxTokens: Math.max(this.config.maxTokens || 1000, 4000), // Aumenta token limit per risposte complete
        temperature: 0.3 // Riduci temperatura per output più deterministico
      };
      
      // Crea una versione temporanea del servizio con config enhanced
      const enhancedService = new LLMService(enhancedConfig);
      const response = await enhancedService.generateResponse(prompt);
      
      if (response.error) {
        console.error('Errore nella generazione LLM:', response.error);
        // Retry con configurazione standard se enhanced fallisce
        console.log('Retrying with standard configuration...');
        const fallbackResponse = await this.generateResponse(prompt);
        if (fallbackResponse.error) {
          return null;
        }
        return this.processFaultTreeResponse(fallbackResponse, request);
      }

      return this.processFaultTreeResponse(response, request);
    } catch (error) {
      console.error('Errore nella generazione del fault tree:', error);
      return null;
    }
  }

  /**
   * Processa la risposta LLM per estrarre il fault tree
   */
  private async processFaultTreeResponse(response: any, request: FaultTreeGenerationRequest): Promise<FaultTreeModel | null> {
    console.log('Processing LLM response for fault tree generation...');
    console.log('Response length:', response.content.length);
    console.log('Response preview:', response.content.substring(0, 200) + '...');

    const generationResult = FaultTreeGenerator.parseLLMResponse(response.content);
    if (!generationResult) {
      console.error('Failed to parse LLM response.');
      console.log('Full response for debugging:', response.content);
      
      // Tentativo di recupero: crea un fault tree minimo basato sulla richiesta
      if (request.components && request.components.length > 0) {
        console.log('Attempting to create minimal fault tree from request components...');
        return this.createMinimalFaultTree(request);
      }
      
      return null;
    }

    console.log('Successfully parsed fault tree result:');
    console.log('- Elements:', generationResult.elements.length);
    console.log('- Connections:', generationResult.connections.length);
    console.log('- Top Event:', generationResult.topEvent);

    // Controlla se la LLM ha restituito un fault tree vuoto
    if ((!generationResult.elements || generationResult.elements.length === 0) && 
        (!generationResult.connections || generationResult.connections.length === 0)) {
      console.log('LLM returned empty fault tree, creating minimal fallback...');
      return this.createMinimalFaultTree(request);
    }

    return FaultTreeGenerator.generateFaultTreeModel(generationResult);
  }

  /**
   * Crea un fault tree minimo quando il parsing fallisce
   */
  private createMinimalFaultTree(request: FaultTreeGenerationRequest): FaultTreeModel | null {
    try {
      const elements: Array<{
        type: 'event' | 'gate';
        id: string;
        name: string;
        description?: string;
        failureRate?: number;
        gateType?: 'OR' | 'AND' | 'PAND' | 'SPARE' | 'SEQ' | 'FDEP';
      }> = [];
      
      const connections: Array<{ source: string; target: string }> = [];

      // Crea eventi base dai componenti della richiesta
      if (request.components && request.components.length > 0) {
        request.components.forEach((comp, index) => {
          elements.push({
            type: 'event' as const,
            id: `event-${index + 1}`,
            name: `Guasto ${comp}`,
            description: `Guasto del componente ${comp}`,
            failureRate: 0.001
          });
        });
      } else {
        // Fallback con componenti generici
        elements.push(
          {
            type: 'event' as const,
            id: 'event-1',
            name: 'Guasto Componente A',
            description: 'Guasto del componente principale A',
            failureRate: 0.001
          },
          {
            type: 'event' as const,
            id: 'event-2', 
            name: 'Guasto Componente B',
            description: 'Guasto del componente principale B',
            failureRate: 0.001
          }
        );
      }

      // Crea gate principale
      const topEventName = request.topEvent || 'Guasto Sistema';
      elements.push({
        type: 'gate' as const,
        id: 'gate-1',
        name: topEventName,
        gateType: 'OR' as const,
        description: `Gate principale: ${topEventName}`
      });

      // Connetti tutti gli eventi al gate principale
      elements.filter(el => el.type === 'event').forEach(event => {
        connections.push({
          source: event.id,
          target: 'gate-1'
        });
      });

      const generationResult = {
        elements,
        connections,
        topEvent: 'gate-1',
        description: request.description || 'Fault tree generato automaticamente'
      };

      console.log('Created minimal fault tree as fallback');
      return FaultTreeGenerator.generateFaultTreeModel(generationResult);
    } catch (error) {
      console.error('Failed to create minimal fault tree:', error);
      return null;
    }
  }

  /**
   * Analizza un messaggio dell'utente per determinare se richiede generazione di fault tree
   */
  static isGenerationRequest(message: string): boolean {
    const generationKeywords = [
      'genera fault tree',
      'crea fault tree', 
      'costruisci fault tree',
      'modella il sistema',
      'analisi del sistema',
      'fault tree per',
      'create fault tree',
      'generate fault tree',
      'build fault tree'
    ];

    const lowerMessage = message.toLowerCase();
    return generationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Estrae parametri di generazione da un messaggio dell'utente
   */
  static extractGenerationRequest(message: string): FaultTreeGenerationRequest {
    const request: FaultTreeGenerationRequest = {
      description: message
    };

    // Estrai top event se specificato
    const topEventMatch = message.match(/top event[:\s]+([^.!?\n]+)/i);
    if (topEventMatch) {
      request.topEvent = topEventMatch[1].trim();
    }

    // Estrai tipo sistema
    const systemTypeMatch = message.match(/sistema\s+([\w\s]+?)(?:\s+con|\s+per|\.|$)/i);
    if (systemTypeMatch) {
      request.systemType = systemTypeMatch[1].trim();
    }

    // Estrai componenti se elencati
    const componentsMatch = message.match(/componenti[:\s]+([^.!?\n]+)/i);
    if (componentsMatch) {
      request.components = componentsMatch[1]
        .split(/[,;]/)
        .map(comp => comp.trim())
        .filter(comp => comp.length > 0);
    }

    return request;
  }

  async generateResponse(prompt: string, context?: string): Promise<LLMResponse> {
    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.callOpenAI(prompt, context);
        case 'anthropic':
          return await this.callAnthropic(prompt, context);
        case 'gemini':
          return await this.callGemini(prompt, context);
        case 'grok':
          return await this.callGrok(prompt, context);
        case 'local':
          return await this.callLocal(prompt, context);
        default:
          throw new Error(`Provider non supportato: ${this.config.provider}`);
      }
    } catch (error) {
      return {
        content: '',
        provider: this.config.provider,
        model: this.config.model,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }

  private async callOpenAI(prompt: string, context?: string): Promise<LLMResponse> {
    const fullPrompt = context ? `${context}\n\nDomanda: ${prompt}` : prompt;
    
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'Sei un esperto assistente specializzato in Dynamic Fault Tree Analysis. Fornisci risposte tecniche accurate e utili per la modellazione di fault tree.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      provider: 'openai',
      model: this.config.model,
      usage: data.usage
    };
  }

  private async callAnthropic(prompt: string, context?: string): Promise<LLMResponse> {
    const fullPrompt = context ? `${context}\n\nDomanda: ${prompt}` : prompt;
    
    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 1000,
        messages: [
          {
            role: 'user',
            content: `Sei un esperto assistente specializzato in Dynamic Fault Tree Analysis. Fornisci risposte tecniche accurate e utili per la modellazione di fault tree.\n\n${fullPrompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0].text,
      provider: 'anthropic',
      model: this.config.model,
      usage: data.usage
    };
  }

  private async callGemini(prompt: string, context?: string): Promise<LLMResponse> {
    const fullPrompt = context ? `${context}\n\nDomanda: ${prompt}` : prompt;

    const response = await fetch(`${this.config.baseUrl}/v1/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Sei un esperto assistente specializzato in Dynamic Fault Tree Analysis. Fornisci risposte tecniche accurate e utili per la modellazione di fault tree.\n\n${fullPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: this.config.temperature || 0.7,
          maxOutputTokens: this.config.maxTokens || 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.candidates[0].content.parts[0].text,
      provider: 'gemini',
      model: this.config.model
    };
  }

  private async callGrok(prompt: string, context?: string): Promise<LLMResponse> {
    const fullPrompt = context ? `${context}\n\nDomanda: ${prompt}` : prompt;
    
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'Sei un esperto assistente specializzato in Dynamic Fault Tree Analysis. Fornisci risposte tecniche accurate e utili per la modellazione di fault tree.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      provider: 'grok',
      model: this.config.model,
      usage: data.usage
    };
  }

  private async callLocal(prompt: string, context?: string): Promise<LLMResponse> {
    const fullPrompt = context ? `${context}\n\nDomanda: ${prompt}` : prompt;
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: `Sei un esperto assistente specializzato in Dynamic Fault Tree Analysis. Fornisci risposte tecniche accurate e utili per la modellazione di fault tree.\n\n${fullPrompt}`,
          stream: false,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Local API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.response,
        provider: 'local',
        model: this.config.model
      };
    } catch (error) {
      // Fallback al sistema locale se l'API locale non è disponibile
      return this.generateLocalFallback(prompt);
    }
  }

  private generateLocalFallback(prompt: string): LLMResponse {
    // Sistema di fallback con risposte predefinite
    const message = prompt.toLowerCase();
    
    if (message.includes('and') || message.includes('porta and')) {
      return {
        content: 'La porta AND richiede che tutti gli eventi di input si verifichino per causare l\'output. È utilizzata quando tutti i componenti devono fallire simultaneamente per causare il guasto del sistema.',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    if (message.includes('or') || message.includes('porta or')) {
      return {
        content: 'La porta OR si attiva quando almeno uno degli eventi di input si verifica. È la porta più comune nei fault tree e rappresenta ridondanza alternativa.',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    if (message.includes('pand') || message.includes('priority and')) {
      return {
        content: 'La porta PAND (Priority AND) richiede che gli eventi si verifichino in una sequenza specifica. È utile per modellare guasti che dipendono dall\'ordine temporale.',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    if (message.includes('spare')) {
      return {
        content: 'La porta SPARE modella sistemi con componenti di riserva. Il sistema fallisce solo quando il componente principale E il componente spare falliscono.',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    if (message.includes('seq') || message.includes('sequenziale')) {
      return {
        content: 'La porta SEQ (Sequenziale) modella eventi che devono verificarsi in un ordine temporale specifico per causare il guasto.',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    if (message.includes('fdep') || message.includes('dipendenza')) {
      return {
        content: 'La porta FDEP (Functional Dependency) modella dipendenze funzionali dove il guasto di un componente causa automaticamente il guasto di altri componenti dipendenti.',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    if (message.includes('come') || message.includes('aiuto') || message.includes('help')) {
      return {
        content: 'Posso aiutarti con:\n• Spiegazioni sui tipi di porte logiche\n• Consigli sulla struttura del fault tree\n• Best practices per la modellazione\n• Interpretazione dei risultati\n\nCosa ti interessa sapere?',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    if (message.includes('evento base') || message.includes('basic event')) {
      return {
        content: 'Gli eventi base rappresentano i guasti fondamentali del sistema. Dovrebbero essere:\n• Indipendenti tra loro\n• Non ulteriormente sviluppabili\n• Associati a tassi di guasto specifici\n• Chiaramente definiti e misurabili',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    if (message.includes('top event') || message.includes('evento top')) {
      return {
        content: 'Il top event è il guasto principale che stai analizzando. Dovrebbe essere:\n• Chiaramente definito\n• Indesiderabile per il sistema\n• Il punto di partenza per l\'analisi\n• Collegato logicamente agli eventi sottostanti',
        provider: 'local',
        model: 'fallback'
      };
    }
    
    // Risposte generiche
    const genericResponses = [
      'Interessante domanda! Nei fault tree dinamici, è importante considerare le dipendenze temporali tra gli eventi. Puoi fornire più dettagli?',
      'Per una modellazione efficace, ti consiglio di iniziare dal top event e procedere verso il basso, identificando le cause immediate di ogni evento.',
      'Ricorda che un buon fault tree dovrebbe essere completo, accurato e verificabile. Hai considerato tutti i modi di guasto possibili?',
      'Le porte dinamiche come PAND, SPARE e SEQ sono particolarmente utili per sistemi con ridondanza e riparazioni. Stai modellando un sistema di questo tipo?'
    ];
    
    return {
      content: genericResponses[Math.floor(Math.random() * genericResponses.length)],
      provider: 'local',
      model: 'fallback'
    };
  }
}
