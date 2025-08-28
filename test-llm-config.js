// Test per la configurazione LLM
// Esegui questo file nel browser console per testare

// Simula la configurazione salvata
const testConfig = {
  openai: {
    provider: 'openai',
    apiKey: 'sk-test-key-123',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: true
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
    apiKey: 'AIzaSyA3uo-hTufSkEAYkVtbAtIp_-Xqv0nuKVI',
    model: 'gemini-1.5-flash',
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
    enabled: true
  }
};

// Test della funzione getActiveProvider
function testGetActiveProvider() {
  console.log('=== Test getActiveProvider ===');
  
  // Test 1: OpenAI abilitato con API key
  const config1 = { ...testConfig };
  config1.openai.enabled = true;
  config1.openai.apiKey = 'sk-test-123';
  
  const provider1 = getActiveProvider(config1);
  console.log('Test 1 - OpenAI enabled + API key:', provider1);
  
  // Test 2: Solo locale abilitato
  const config2 = { ...testConfig };
  config2.openai.enabled = false;
  config2.openai.apiKey = '';
  config2.local.enabled = true;
  
  const provider2 = getActiveProvider(config2);
  console.log('Test 2 - Only local enabled:', provider2);
  
  // Test 3: Nessun provider abilitato
  const config3 = { ...testConfig };
  config3.openai.enabled = false;
  config3.local.enabled = false;
  
  const provider3 = getActiveProvider(config3);
  console.log('Test 3 - No providers enabled:', provider3);
}

// Test della validazione
function testValidation() {
  console.log('=== Test Validation ===');
  
  // Test OpenAI valido
  const openaiValid = {
    provider: 'openai',
    apiKey: 'sk-test-123',
    model: 'gpt-4o-mini',
    enabled: true
  };
  
  const openaiErrors = validateLLMConfig(openaiValid);
  console.log('OpenAI valid config errors:', openaiErrors);
  
  // Test OpenAI senza API key
  const openaiInvalid = {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    enabled: true
  };
  
  const openaiInvalidErrors = validateLLMConfig(openaiInvalid);
  console.log('OpenAI invalid config errors:', openaiInvalidErrors);
  
  // Test locale valido
  const localValid = {
    provider: 'local',
    apiKey: '',
    model: 'local-model',
    enabled: true
  };
  
  const localErrors = validateLLMConfig(localValid);
  console.log('Local valid config errors:', localErrors);
}

// Esegui i test
console.log('🚀 Avvio test configurazione LLM...');
testGetActiveProvider();
testValidation();
console.log('✅ Test completati!');
