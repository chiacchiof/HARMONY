import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/FaultTree';
import { LLMProviders, loadLLMConfig } from '../../config/llm-config';
import { LLMService } from '../../services/llm-service';
import LLMConfigModal from '../LLMConfigModal/LLMConfigModal';
import './RightPanel.css';

const RightPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Ciao! Sono il tuo assistente per la creazione di Dynamic Fault Tree. Come posso aiutarti?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [llmConfig, setLLMConfig] = useState<LLMProviders>(loadLLMConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>('local');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Inizializza il provider corrente
  useEffect(() => {
    const availableProviders = getAvailableProviders(llmConfig);
    if (availableProviders.length > 0 && !availableProviders.some(p => p.key === currentProvider)) {
      setCurrentProvider(availableProviders[0].key);
      console.log('Initial provider set to:', availableProviders[0].key);
    }
  }, [llmConfig, currentProvider]);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.provider-selector')) {
        setShowProviderDropdown(false);
      }
    };

    if (showProviderDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProviderDropdown]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Debug: log della configurazione
      console.log('LLM Config:', llmConfig);
      console.log('Current Provider:', currentProvider);
      
      // Usa il provider selezionato manualmente
      const selectedProvider = llmConfig[currentProvider as keyof LLMProviders];
      console.log('Selected Provider Config:', selectedProvider);
      
      if (selectedProvider && selectedProvider.provider !== 'local' && selectedProvider.enabled && selectedProvider.apiKey) {
        // Usa il servizio LLM esterno
        console.log('Using external LLM:', selectedProvider.provider);
        const llmService = new LLMService(selectedProvider);
        const response = await llmService.generateResponse(inputMessage);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.content,
          sender: 'bot',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Fallback al sistema locale
        console.log('Using local fallback');
        const botResponse = generateBotResponse(inputMessage);
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: botResponse,
          sender: 'bot',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('LLM Error:', error);
      // In caso di errore, usa il fallback locale
      const botResponse = generateBotResponse(inputMessage);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Aggiungi messaggio di errore
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        text: `⚠️ Errore nella connessione al servizio LLM. Uso il sistema locale.\nErrore: ${error instanceof Error ? error.message : 'Sconosciuto'}`,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Ottieni la lista dei provider disponibili
  const getAvailableProviders = (config: LLMProviders) => {
    const available = [];
    
    // Aggiungi sempre il provider locale
    if (config.local.enabled) {
      available.push({
        key: 'local',
        name: 'Locale',
        provider: config.local
      });
    }
    
    // Aggiungi provider esterni con API key
    Object.entries(config).forEach(([key, provider]) => {
      if (key !== 'local' && provider.enabled && provider.apiKey && provider.apiKey.trim() !== '') {
        const names = {
          openai: 'OpenAI',
          anthropic: 'Claude',
          gemini: 'Gemini',
          grok: 'Grok'
        };
        available.push({
          key,
          name: names[key as keyof typeof names] || key,
          provider
        });
      }
    });
    
    return available;
  };

  const handleProviderChange = (providerKey: string) => {
    setCurrentProvider(providerKey);
    setShowProviderDropdown(false);
    console.log('Manual provider change to:', providerKey);
  };

  const handleConfigChange = (newConfig: LLMProviders) => {
    console.log('Config changed:', newConfig);
    setLLMConfig(newConfig);
    
    // Verifica se il provider corrente è ancora disponibile
    const availableProviders = getAvailableProviders(newConfig);
    const currentStillAvailable = availableProviders.some(p => p.key === currentProvider);
    
    if (!currentStillAvailable && availableProviders.length > 0) {
      // Se il provider corrente non è più disponibile, usa il primo disponibile
      setCurrentProvider(availableProviders[0].key);
      console.log('Current provider no longer available, switched to:', availableProviders[0].key);
    }
  };

  return (
    <div className="right-panel">
      <div className="panel-header">
        <h3>🤖 Assistente Fault Tree</h3>
        <div className="header-controls">
          <div className="provider-info">
            <span className="provider-label">Provider:</span>
            <div className="provider-selector">
              <button 
                className={`provider-badge ${currentProvider}`}
                onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                title="Seleziona Provider LLM"
              >
                {currentProvider === 'openai' ? 'OpenAI' :
                 currentProvider === 'anthropic' ? 'Claude' :
                 currentProvider === 'gemini' ? 'Gemini' :
                 currentProvider === 'grok' ? 'Grok' :
                 'Locale'}
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {showProviderDropdown && (
                <div className="provider-dropdown">
                  {getAvailableProviders(llmConfig).map(provider => (
                    <button
                      key={provider.key}
                      className={`provider-option ${provider.key === currentProvider ? 'active' : ''}`}
                      onClick={() => handleProviderChange(provider.key)}
                    >
                      <span className={`provider-indicator ${provider.key}`}></span>
                      {provider.name}
                      {provider.key === currentProvider && <span className="check-mark">✓</span>}
                    </button>
                  ))}
                  {getAvailableProviders(llmConfig).length === 0 && (
                    <div className="no-providers">
                      Nessun provider disponibile.<br/>
                      Configura le API key.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <button 
            className="config-button"
            onClick={() => setShowConfigModal(true)}
            title="Configura LLM"
          >
            ⚙️
          </button>
        </div>
      </div>
      
      <div className="chat-container">
        <div className="messages-area">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-content">
                {message.text}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message bot-message typing">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-area">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Scrivi la tua domanda sui fault tree..."
            className="message-input"
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="send-button"
          >
            📤
          </button>
        </div>
      </div>

      <div className="help-section">
        <h4>💡 Suggerimenti</h4>
        <div className="help-items">
          <div className="help-item">Chiedi informazioni sui tipi di porte</div>
          <div className="help-item">Richiedi consigli sulla modellazione</div>
          <div className="help-item">Domanda sulle best practices</div>
        </div>
      </div>

      <LLMConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigChange={handleConfigChange}
      />
    </div>
  );
};

// Funzione per generare risposte del bot
const generateBotResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase();
  
  if (message.includes('and') || message.includes('porta and')) {
    return 'La porta AND richiede che tutti gli eventi di input si verifichino per causare l\'output. È utilizzata quando tutti i componenti devono fallire simultaneamente per causare il guasto del sistema.';
  }
  
  if (message.includes('or') || message.includes('porta or')) {
    return 'La porta OR si attiva quando almeno uno degli eventi di input si verifica. È la porta più comune nei fault tree e rappresenta ridondanza alternativa.';
  }
  
  if (message.includes('pand') || message.includes('priority and')) {
    return 'La porta PAND (Priority AND) richiede che gli eventi si verifichino in una sequenza specifica. È utile per modellare guasti che dipendono dall\'ordine temporale.';
  }
  
  if (message.includes('spare')) {
    return 'La porta SPARE modella sistemi con componenti di riserva. Il sistema fallisce solo quando il componente principale E il componente spare falliscono.';
  }
  
  if (message.includes('seq') || message.includes('sequenziale')) {
    return 'La porta SEQ (Sequenziale) modella eventi che devono verificarsi in un ordine temporale specifico per causare il guasto.';
  }
  
  if (message.includes('fdep') || message.includes('dipendenza')) {
    return 'La porta FDEP (Functional Dependency) modella dipendenze funzionali dove il guasto di un componente causa automaticamente il guasto di altri componenti dipendenti.';
  }
  
  if (message.includes('come') || message.includes('aiuto') || message.includes('help')) {
    return 'Posso aiutarti con:\n• Spiegazioni sui tipi di porte logiche\n• Consigli sulla struttura del fault tree\n• Best practices per la modellazione\n• Interpretazione dei risultati\n\nCosa ti interessa sapere?';
  }
  
  if (message.includes('evento base') || message.includes('basic event')) {
    return 'Gli eventi base rappresentano i guasti fondamentali del sistema. Dovrebbero essere:\n• Indipendenti tra loro\n• Non ulteriormente sviluppabili\n• Associati a tassi di guasto specifici\n• Chiaramente definiti e misurabili';
  }
  
  if (message.includes('top event') || message.includes('evento top')) {
    return 'Il top event è il guasto principale che stai analizzando. Dovrebbe essere:\n• Chiaramente definito\n• Indesiderabile per il sistema\n• Il punto di partenza per l\'analisi\n• Collegato logicamente agli eventi sottostanti';
  }
  
  // Risposte generiche
  const genericResponses = [
    'Interessante domanda! Nei fault tree dinamici, è importante considerare le dipendenze temporali tra gli eventi. Puoi fornire più dettagli?',
    'Per una modellazione efficace, ti consiglio di iniziare dal top event e procedere verso il basso, identificando le cause immediate di ogni evento.',
    'Ricorda che un buon fault tree dovrebbe essere completo, accurato e verificabile. Hai considerato tutti i modi di guasto possibili?',
    'Le porte dinamiche come PAND, SPARE e SEQ sono particolarmente utili per sistemi con ridondanza e riparazioni. Stai modellando un sistema di questo tipo?'
  ];
  
  return genericResponses[Math.floor(Math.random() * genericResponses.length)];
};

export default RightPanel;
