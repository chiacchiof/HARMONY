import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/FaultTree';
import { ChatIntegrationProps, GenerationStatus } from '../../types/ChatIntegration';
import { LLMProviders, loadLLMConfig, saveLLMConfig } from '../../config/llm-config';
import { LLMService } from '../../services/llm-service';
import LLMConfigModal from '../LLMConfigModal/LLMConfigModal';
import './RightPanel.css';

interface RightPanelProps extends ChatIntegrationProps {}

const RightPanel: React.FC<RightPanelProps> = ({ 
  onGenerateFaultTree,
  onModifyFaultTree,
  currentFaultTree 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Ciao! Sono il tuo assistente per Dynamic Fault Tree Analysis. Posso aiutarti a:\n\n• Generare fault tree automaticamente\n• Spiegare concetti e best practices\n• Analizzare il tuo modello corrente\n\nProva a scrivere: "Genera un fault tree per un sistema di alimentazione elettrica"',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMProviders>(loadLLMConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>('local');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({ isGenerating: false });
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
    const messageText = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      // Verifica se è una richiesta di generazione fault tree
      if (LLMService.isGenerationRequest(messageText)) {
        await handleFaultTreeGeneration(messageText);
        return;
      }

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
        
        // Aggiungi contesto del fault tree corrente se disponibile
        const context = currentFaultTree ? 
          `Fault tree corrente: ${currentFaultTree.events.length} eventi, ${currentFaultTree.gates.length} porte` : 
          undefined;
        
        const response = await llmService.generateResponse(messageText, context);
        
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
        const botResponse = generateBotResponse(messageText);
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
      const botResponse = generateBotResponse(messageText);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFaultTreeGeneration = async (message: string) => {
    if (!onGenerateFaultTree) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Funzionalità di generazione non disponibile in questa modalità.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
      return;
    }

    setGenerationStatus({ isGenerating: true, message: 'Generazione fault tree in corso...' });

    try {
      const selectedProvider = llmConfig[currentProvider as keyof LLMProviders];
      
      if (selectedProvider && selectedProvider.enabled && selectedProvider.apiKey) {
        const llmService = new LLMService(selectedProvider);
        const request = LLMService.extractGenerationRequest(message);
        
        const generatedModel = await llmService.generateFaultTree(request);
        
        if (generatedModel) {
          onGenerateFaultTree(generatedModel);
          
          const successMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: `✅ Ho generato un fault tree con:\n• ${generatedModel.events.length} eventi base\n• ${generatedModel.gates.length} porte logiche\n• ${generatedModel.connections.length} connessioni\n\nIl modello è stato aggiunto all'editor grafico!`,
            sender: 'bot',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, successMessage]);
        } else {
          throw new Error('Impossibile generare il fault tree');
        }
      } else {
        throw new Error('Provider LLM non configurato');
      }
    } catch (error) {
      console.error('Errore generazione fault tree:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `❌ Errore nella generazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}\n\nVerifica la configurazione LLM o prova con una descrizione più dettagliata.`,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setGenerationStatus({ isGenerating: false });
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Assicurati che tutti i tasti funzionino correttamente
    e.stopPropagation();
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
      return 'Posso aiutarti con:\n• Generare fault tree automaticamente\n• Spiegazioni sui tipi di porte logiche\n• Consigli sulla struttura del fault tree\n• Best practices per la modellazione\n• Interpretazione dei risultati\n\nProva a scrivere: "Genera fault tree per [descrizione sistema]"';
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

  const handleQuickExample = (exampleText: string) => {
    setInputMessage(exampleText);
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
              >
                {currentProvider.toUpperCase()}
              </button>
              {showProviderDropdown && (
                <div className="provider-dropdown">
                  {getAvailableProviders(llmConfig).map(provider => (
                    <button
                      key={provider.key}
                      className={`provider-option ${currentProvider === provider.key ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentProvider(provider.key);
                        setShowProviderDropdown(false);
                      }}
                    >
                      {provider.name}
                    </button>
                  ))}
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
        <div className="messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.sender}`}>
              <div className="message-content">
                {message.text.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < message.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message bot typing">
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
        
        <div className="quick-examples">
          <div className="quick-examples-title">🚀 Esempi di Generazione:</div>
          <div className="quick-buttons">
            <button 
              className="quick-button"
              onClick={() => handleQuickExample('Genera un fault tree per un sistema di alimentazione elettrica con ridondanza')}
            >
              🔌 Sistema Elettrico
            </button>
            <button 
              className="quick-button"
              onClick={() => handleQuickExample('Crea fault tree per sistema frenante automotive con ABS')}
            >
              🚗 Sistema Frenante
            </button>
            <button 
              className="quick-button"
              onClick={() => handleQuickExample('Modella fault tree per sistema di controllo industriale PLC')}
            >
              🏭 Sistema Controllo
            </button>
          </div>
        </div>

        <div className="input-area">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi 'genera fault tree per...' o usa gli esempi sopra!"
            className="message-input"
            rows={3}
            autoFocus={false}
            spellCheck={false}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="send-button"
          >
            📤
          </button>
        </div>

        {generationStatus.isGenerating && (
          <div className="generation-status">
            <div className="generation-spinner">⚙️</div>
            <span>{generationStatus.message || 'Generazione in corso...'}</span>
          </div>
        )}
      </div>

      <div className="help-section">
        <h4>💡 Suggerimenti</h4>
        <div className="help-items">
          <div className="help-item">🔧 Genera fault tree automaticamente</div>
          <div className="help-item">❓ Chiedi informazioni sui tipi di porte</div>
          <div className="help-item">📊 Richiedi consigli sulla modellazione</div>
          <div className="help-item">🎯 Analizza il tuo modello corrente</div>
        </div>
      </div>

      {showConfigModal && (
        <LLMConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onConfigChange={(newConfig) => {
            setLlmConfig(newConfig);
            saveLLMConfig(newConfig);
          }}
        />
      )}
    </div>
  );
};

// Funzione di utilità per ottenere provider disponibili
function getAvailableProviders(config: LLMProviders) {
  return [
    { key: 'openai', name: 'OpenAI', enabled: config.openai.enabled && !!config.openai.apiKey },
    { key: 'anthropic', name: 'Anthropic', enabled: config.anthropic.enabled && !!config.anthropic.apiKey },
    { key: 'gemini', name: 'Gemini', enabled: config.gemini.enabled && !!config.gemini.apiKey },
    { key: 'grok', name: 'Grok', enabled: config.grok.enabled && !!config.grok.apiKey },
    { key: 'local', name: 'Local', enabled: config.local.enabled }
  ].filter(provider => provider.enabled);
}

export default RightPanel;