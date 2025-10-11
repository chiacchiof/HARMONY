import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/FaultTree';
import { ChatIntegrationProps, GenerationStatus } from '../../types/ChatIntegration';
import { LLMProviders } from '../../config/llm-config';
import { LLMService } from '../../services/llm-service';
import { useLLMConfig } from '../../contexts/LLMContext';
import LLMConfigModal from '../LLMConfigModal/LLMConfigModal';
import './RightPanel.css';

interface RightPanelProps extends ChatIntegrationProps {
  isDarkMode: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  editorType?: 'fault-tree' | 'markov-chain';
  onGenerateMarkovChain?: (model: any) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ 
  onGenerateFaultTree,
  onModifyFaultTree,
  currentFaultTree,
  isDarkMode,
  isCollapsed,
  onToggleCollapse,
  editorType = 'fault-tree',
  onGenerateMarkovChain
}) => {
  const { llmConfig, showLLMConfigModal, setShowLLMConfigModal, updateLLMConfig, currentProvider, setCurrentProvider } = useLLMConfig();
  
  const getInitialMessage = () => {
    if (editorType === 'markov-chain') {
      return 'Ciao! Sono Harmony, il tuo assistente per l\'analisi delle Markov Chain. Posso aiutarti a:\n\n• Generare catene di Markov automaticamente\n• Spiegare concetti di processi stocastici\n• Analizzare il tuo modello corrente\n\nProva a scrivere: "Crea una markov chain per un sistema a 3 stati" o "Spiega le proprietà di una catena di Markov"';
    } else {
      return 'Ciao! Sono Harmony, il tuo assistente per Dynamic Fault Tree Analysis. Posso aiutarti a:\n\n• Generare fault tree automaticamente\n• Spiegare concetti e best practices\n• Analizzare il tuo modello corrente\n\nProva a scrivere: "Genera un fault tree per un sistema di alimentazione elettrica"';
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: getInitialMessage(),
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({ isGenerating: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update initial message when editor type changes
  useEffect(() => {
    const initialText = editorType === 'markov-chain' 
      ? 'Ciao! Sono Harmony, il tuo assistente per l\'analisi delle Markov Chain. Posso aiutarti a:\n\n• Generare catene di Markov automaticamente\n• Spiegare concetti di processi stocastici\n• Analizzare il tuo modello corrente\n\nProva a scrivere: "Crea una markov chain per un sistema a 3 stati" o "Spiega le proprietà di una catena di Markov"'
      : 'Ciao! Sono Harmony, il tuo assistente per Dynamic Fault Tree Analysis. Posso aiutarti a:\n\n• Generare fault tree automaticamente\n• Spiegare concetti e best practices\n• Analizzare il tuo modello corrente\n\nProva a scrivere: "Genera un fault tree per un sistema di alimentazione elettrica"';
    
    setMessages([
      {
        id: '1',
        text: initialText,
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  }, [editorType]);

  // Inizializza il provider corrente
  useEffect(() => {
    const availableProviders = getAvailableProviders(llmConfig);
    if (availableProviders.length > 0 && !availableProviders.some(p => p.key === currentProvider)) {
      setCurrentProvider(availableProviders[0].key);
      console.log('Initial provider set to:', availableProviders[0].key);
    }
  }, [llmConfig, currentProvider, setCurrentProvider]);

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
      if (LLMService.isGenerationRequest(messageText) && editorType === 'fault-tree') {
        await handleFaultTreeGeneration(messageText);
        return;
      }
      
      // Verifica se è una richiesta di generazione markov chain
      if (isMarkovGenerationRequest(messageText) && editorType === 'markov-chain') {
        await handleMarkovChainGeneration(messageText);
        return;
      }

      // Debug: log della configurazione
      console.log('LLM Config:', llmConfig);
      console.log('Current Provider:', currentProvider);

      // Usa il provider selezionato manualmente
      const selectedProvider = llmConfig[currentProvider as keyof LLMProviders];
      console.log('Selected Provider Config:', selectedProvider);

      // Verifica se il provider è valido (esterno con API key o locale abilitato)
      const isValidProvider = selectedProvider && selectedProvider.enabled &&
        (selectedProvider.provider === 'local' || selectedProvider.apiKey);

      if (isValidProvider) {
        // Usa il servizio LLM (esterno o locale)
        console.log('Using LLM provider:', selectedProvider.provider);
        const llmService = new LLMService(selectedProvider);

        // Aggiungi contesto del fault tree corrente se disponibile
        const context = currentFaultTree ?
          `Fault tree corrente: ${currentFaultTree.events.length} eventi, ${currentFaultTree.gates.length} porte` :
          undefined;

        const response = await llmService.generateResponse(messageText, context);

        if (response.error) {
          console.warn('LLM provider error:', response.error);
          // Se c'è un errore, usa il fallback locale
          throw new Error(response.error);
        }

        // Se la risposta proviene dal fallback locale (modello 'fallback'),
        // significa che il servizio locale non era disponibile
        if (response.model === 'fallback') {
          console.log('Local LLM not available, using predefined responses');
        }

        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.content,
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        // Fallback al sistema locale con risposte predefinite
        console.log('No valid provider configured, using local fallback');
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

  const isMarkovGenerationRequest = (message: string): boolean => {
    const keywords = [
      'crea.*markov', 'genera.*markov', 'crea.*catena', 'genera.*catena',
      'markov.*chain', 'catena.*markov', 'modello.*markov'
    ];
    
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => {
      const regex = new RegExp(keyword, 'i');
      return regex.test(lowerMessage);
    });
  };

  const handleMarkovChainGeneration = async (message: string) => {
    if (!onGenerateMarkovChain) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Funzionalità di generazione Markov Chain non disponibile.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
      return;
    }

    setGenerationStatus({ isGenerating: true, message: 'Generazione Markov Chain in corso...' });

    try {
      const selectedProvider = llmConfig[currentProvider as keyof LLMProviders];

      // Verifica se il provider è valido (esterno con API key o locale abilitato)
      const isValidProvider = selectedProvider && selectedProvider.enabled &&
        (selectedProvider.provider === 'local' || selectedProvider.apiKey);

      if (isValidProvider) {
        console.log('Using LLM provider for markov chain generation:', selectedProvider.provider);
        const llmService = new LLMService(selectedProvider);
        const prompt = `Crea una Markov Chain per: ${message}. Rispondi SOLO con un JSON valido nel formato:
{
  "states": [
    {"id": "S1", "name": "State 1", "position": {"x": 100, "y": 100}, "type": "state"},
    {"id": "S2", "name": "State 2", "position": {"x": 300, "y": 100}, "type": "state"}
  ],
  "transitions": [
    {"id": "T1", "sourceId": "S1", "targetId": "S2", "rate": 0.1, "label": "Transition 1"}
  ]
}`;
        
        const llmResponse = await llmService.generateResponse(prompt);
        const response = llmResponse.content;
        
        // Prova a parsare come JSON
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const markovModel = JSON.parse(jsonMatch[0]);
            
            if (markovModel.states && markovModel.transitions) {
              onGenerateMarkovChain(markovModel);
              
              const successMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: `✅ Ho generato una Markov Chain con:\n• ${markovModel.states.length} stati\n• ${markovModel.transitions.length} transizioni\n\nIl modello è stato aggiunto all'editor grafico!`,
                sender: 'bot',
                timestamp: new Date()
              };
              setMessages(prev => [...prev, successMessage]);
            } else {
              throw new Error('Formato JSON non valido per Markov Chain');
            }
          } else {
            // Se non è JSON, mostra la risposta normale
            const normalMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: response,
              sender: 'bot',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, normalMessage]);
          }
        } catch (parseError) {
          // Se il parsing fallisce, mostra la risposta normale
          const normalMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: response,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, normalMessage]);
        }
      } else {
        // Fallback response per Markov Chain
        const fallbackMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: 'Per generare Markov Chain automaticamente, configura un provider LLM nelle impostazioni. Al momento posso solo fornire consigli teorici sui modelli di Markov.',
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `Errore durante la generazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setGenerationStatus({ isGenerating: false });
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

      // Verifica se il provider è valido (esterno con API key o locale abilitato)
      const isValidProvider = selectedProvider && selectedProvider.enabled &&
        (selectedProvider.provider === 'local' || selectedProvider.apiKey);

      if (isValidProvider) {
        console.log('Using LLM provider for fault tree generation:', selectedProvider.provider);
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
          throw new Error('Impossibile generare il fault tree - il servizio LLM non ha restituito un modello valido');
        }
      } else {
        throw new Error('Provider LLM non configurato correttamente. Verifica le impostazioni.');
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
    <div className={`right-panel ${isDarkMode ? 'dark-mode' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <div className="header-content">
          <h3>🤖 Harmony AI</h3>
          <button 
            className="collapse-toggle"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Mostra pannello" : "Nascondi pannello"}
          >
            {isCollapsed ? '◀' : '▶'}
          </button>
        </div>
        <div className="header-controls">
          <div className="provider-info">
            <span className="provider-label">Provider:</span>
            <div className="provider-selector">
              <button 
                className={`provider-badge ${currentProvider}`}
                onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                title={`Provider attuale: ${currentProvider.toUpperCase()} - Clicca per cambiare`}
              >
                🛡️ {currentProvider.toUpperCase()} {showProviderDropdown ? '▲' : '▼'}
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
                      {getProviderIcon(provider.key)} {provider.name}
                      {currentProvider === provider.key && ' ✓'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button 
            className="config-button"
            onClick={() => setShowLLMConfigModal(true)}
            title="Configura LLM"
          >
            ⚙️
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="chat-container">
            <div className="messages">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-content">
                    <strong className="message-prefix">
                      {message.sender === 'user' ? 'Tu: ' : 'Harmony AI: '}
                    </strong>
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
                {editorType === 'markov-chain' ? (
                  <>
                    <button 
                      className="quick-button"
                      onClick={() => handleQuickExample('Crea una markov chain per un sistema a 3 stati: funzionante, degradato, guasto')}
                    >
                      ⚡ Sistema 3 Stati
                    </button>
                    <button 
                      className="quick-button"
                      onClick={() => handleQuickExample('Genera una catena di Markov per modellare la disponibilità di un server con riparazione')}
                    >
                      🖥️ Server Riparabile
                    </button>
                    <button 
                      className="quick-button"
                      onClick={() => handleQuickExample('Modella una markov chain per un sistema ridondante con 2 componenti identici')}
                    >
                      🔄 Sistema Ridondato
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
              {editorType === 'markov-chain' ? (
                <>
                  <div className="help-item">🔗 Genera catene di Markov automaticamente</div>
                  <div className="help-item">❓ Chiedi informazioni sui processi stocastici</div>
                  <div className="help-item">📊 Richiedi consigli sulla modellazione probabilistica</div>
                  <div className="help-item">🎯 Analizza proprietà della tua catena</div>
                </>
              ) : (
                <>
                  <div className="help-item">🔧 Genera fault tree automaticamente</div>
                  <div className="help-item">❓ Chiedi informazioni sui tipi di porte</div>
                  <div className="help-item">📊 Richiedi consigli sulla modellazione</div>
                  <div className="help-item">🎯 Analizza il tuo modello corrente</div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showLLMConfigModal && (
        <LLMConfigModal
          isOpen={showLLMConfigModal}
          onClose={() => setShowLLMConfigModal(false)}
          onConfigChange={updateLLMConfig}
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

// Funzione per ottenere l'icona del provider
function getProviderIcon(providerKey: string): string {
  const icons: Record<string, string> = {
    'openai': '🤖',
    'anthropic': '🧠',
    'gemini': '💎',
    'grok': '⚡',
    'local': '🏠'
  };
  return icons[providerKey] || '🔧';
}

export default RightPanel;