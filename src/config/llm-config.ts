export interface ModelOption {
  value: string;
  label: string;
  free?: boolean;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'grok' | 'local';
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
}

// Modelli disponibili per ogni provider
export const availableModels: Record<string, ModelOption[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { value: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1' },
    { value: 'claude-3-7-sonnet-20250224', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Free)', free: true },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Free)', free: true },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Free)', free: true },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
  ],
  grok: [
    { value: 'grok-beta', label: 'Grok Beta' },
    { value: 'grok-2-latest', label: 'Grok 2 Latest' },
    { value: 'grok-2-vision-1212', label: 'Grok 2 Vision' }
  ],
  local: [
    { value: 'llama3', label: 'Llama 3 (Free)', free: true },
    { value: 'mistral', label: 'Mistral (Free)', free: true },
    { value: 'codellama', label: 'Code Llama (Free)', free: true },
    { value: 'phi', label: 'Phi (Free)', free: true }
  ]
};

export interface LLMProviders {
  openai: LLMConfig;
  anthropic: LLMConfig;
  gemini: LLMConfig;
  grok: LLMConfig;
  local: LLMConfig;
}

// Configurazione predefinita per i diversi provider
export const defaultLLMConfig: LLMProviders = {
  openai: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: false
  },
  anthropic: {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-3-haiku-20240307',
    baseUrl: 'https://api.anthropic.com',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: false
  },
  gemini: {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.0-flash',
    baseUrl: 'https://generativelanguage.googleapis.com',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: false
  },
  grok: {
    provider: 'grok',
    apiKey: '',
    model: 'grok-beta',
    baseUrl: 'https://api.x.ai/v1',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: false
  },
  local: {
    provider: 'local',
    apiKey: '',
    model: 'local-model',
    baseUrl: 'http://localhost:11434',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: true // Il modello locale è abilitato di default
  }
};

// Funzione per caricare la configurazione dal localStorage
export const loadLLMConfig = (): LLMProviders => {
  try {
    const saved = localStorage.getItem('llm-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultLLMConfig, ...parsed };
    }
  } catch (error) {
    console.warn('Errore nel caricamento configurazione LLM:', error);
  }
  return defaultLLMConfig;
};

// Funzione per salvare la configurazione nel localStorage
export const saveLLMConfig = (config: LLMProviders): void => {
  try {
    localStorage.setItem('llm-config', JSON.stringify(config));
  } catch (error) {
    console.error('Errore nel salvataggio configurazione LLM:', error);
  }
};

// Funzione per ottenere il provider attivo
export const getActiveProvider = (config: LLMProviders): LLMConfig | null => {
  // Prima controlla i provider esterni (con API key)
  for (const provider of Object.values(config)) {
    if (provider.enabled && provider.provider !== 'local' && provider.apiKey) {
      return provider;
    }
  }
  
  // Se nessun provider esterno è disponibile, usa quello locale se abilitato
  if (config.local.enabled) {
    return config.local;
  }
  
  return null;
};

// Funzione per validare una configurazione
export const validateLLMConfig = (config: LLMConfig): string[] => {
  const errors: string[] = [];
  
  if (!config.apiKey && config.provider !== 'local') {
    errors.push(`API Key richiesta per ${config.provider}`);
  }
  
  if (!config.model) {
    errors.push(`Modello richiesto per ${config.provider}`);
  }
  
  if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
    errors.push(`Temperatura deve essere tra 0 e 2 per ${config.provider}`);
  }
  
  if (config.maxTokens && config.maxTokens < 1) {
    errors.push(`Max tokens deve essere maggiore di 0 per ${config.provider}`);
  }
  
  return errors;
};
