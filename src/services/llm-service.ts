import { LLMConfig } from '../config/llm-config';

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
    
    const response = await fetch(`${this.config.baseUrl}/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
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
