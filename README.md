# Dynamic Fault Tree Editor

Un'interfaccia web React per sviluppare progetti di Dynamic Fault Tree con supporto per diversi tipi di porte logiche e un assistente chatbot integrato.

## Caratteristiche

### 🎯 Funzionalità Principali
- **Editor Visuale**: Interfaccia drag-and-drop per creare fault tree
- **Porte Logiche**: Supporto per AND, OR, PAND, SPARE, SEQ, FDEP
- **Eventi Base**: Creazione e configurazione di eventi base con parametri di affidabilità
- **Connessioni**: Sistema di collegamenti con frecce orientate tra elementi e porte
- **Parametri Avanzati**: Popup per configurazione dettagliata di ogni componente
- **Chatbot Assistente**: Aiuto contextuale per la modellazione dei fault tree

### 💾 Gestione File
- **Salvataggio**: Esporta il modello in formato JSON
- **Apertura**: Importa modelli salvati per continuare il lavoro
- **Esportazione Codice**: Genera listato testuale del fault tree

### 🎨 Interfaccia
- **Pannello Sinistro**: Selezione componenti (porte ed eventi base)
- **Pannello Centrale**: Area di lavoro con visualizzazione del fault tree
- **Pannello Destro**: Chatbot assistente per supporto alla modellazione

## Installazione e Avvio

### Prerequisiti
- Node.js (versione 16 o superiore)
- npm o yarn

### Installazione
```bash
# Clona il repository o naviga nella directory del progetto
cd dynamic-fault-tree-editor

# Installa le dipendenze
npm install
```

### Avvio Sviluppo
```bash
# Avvia il server di sviluppo
npm start
```

L'applicazione sarà disponibile su `http://localhost:3000`

### Build per Produzione
```bash
# Crea la build di produzione
npm run build
```

## Utilizzo

### 1. Creazione Componenti
- **Eventi Base**: Clicca su "Evento Base" nel pannello sinistro
- **Porte Logiche**: Seleziona il tipo di porta desiderata (AND, OR, PAND, etc.)

### 2. Posizionamento
- Trascina i componenti nell'area centrale per posizionarli
- Usa i controlli zoom e pan per navigare nel diagramma

### 3. Collegamenti
- Trascina dalle maniglie di connessione per collegare elementi alle porte
- Le frecce indicano la direzione del flusso logico

### 4. Configurazione Parametri
- Clicca su qualsiasi componente per aprire il popup dei parametri
- Configura nome, descrizione e parametri specifici

### 5. Salvataggio e Esportazione
- **Salva**: Esporta il modello completo in JSON
- **Apri**: Carica un modello salvato
- **Esporta Codice**: Genera rappresentazione testuale del fault tree

## Tipi di Porte Supportate

### Porte Statiche
- **AND (∧)**: Tutti gli input devono verificarsi
- **OR (∨)**: Almeno un input deve verificarsi

### Porte Dinamiche
- **PAND (⊕)**: Priority AND - Input in sequenza specifica
- **SPARE (⟲)**: Ridondanza con componenti spare
- **SEQ (→)**: Sequenziale - Input in ordine temporale
- **FDEP (⟹)**: Dipendenza Funzionale

## Parametri Configurabili

### Eventi Base
- Nome e descrizione
- Tasso di guasto (λ)
- Tasso di riparazione (μ)
- Fattore di dormancy
- Intervallo di test

### Porte Logiche
- Nome e descrizione
- Parametri specifici per tipo (priorità, tempi di commutazione, etc.)

## 🤖 Assistente Chatbot Avanzato

Il chatbot integrato supporta **multiple LLM provider** per risposte intelligenti e specializzate:

### **Provider Supportati**
- **OpenAI (GPT-4, GPT-3.5)**: Integrazione completa con API OpenAI
- **Anthropic (Claude)**: Supporto per Claude-3 Haiku, Sonnet, Opus
- **Google Gemini**: Integrazione con Gemini 1.5 Flash, Pro
- **Grok (xAI)**: Supporto per Grok-beta
- **Modello Locale**: Fallback locale con Ollama, LM Studio, etc.

### **Funzionalità**
- **Configurazione API**: Interfaccia grafica per gestire API key e parametri
- **Fallback Intelligente**: Passaggio automatico al sistema locale in caso di errori
- **Risposte Specializzate**: Prompt ottimizzati per Dynamic Fault Tree Analysis
- **Gestione Errori**: Gestione robusta degli errori di connessione
- **Parametri Configurabili**: Temperatura, max tokens, URL personalizzati

### **Configurazione**
1. Clicca sull'icona ⚙️ nel pannello chatbot
2. Inserisci le tue API key per i provider desiderati
3. Configura modelli e parametri
4. Salva la configurazione
5. Il chatbot userà automaticamente il provider abilitato

### **Fallback Locale**
Se nessun LLM esterno è configurato o disponibile, il chatbot utilizza un sistema di risposte predefinite specializzate per:
- Spiegazioni sui tipi di porte
- Consigli sulla struttura del fault tree
- Best practices per la modellazione
- Interpretazione dei risultati

## Struttura del Progetto

```
src/
├── components/
│   ├── FaultTreeEditor/     # Componente principale
│   ├── MenuBar/            # Barra menu con file operations
│   ├── LeftPanel/          # Pannello selezione componenti
│   ├── CentralPanel/       # Area di lavoro principale
│   │   └── nodes/          # Componenti nodi personalizzati
│   ├── RightPanel/         # Chatbot assistente con LLM
│   ├── ParameterModal/     # Popup configurazione parametri
│   └── LLMConfigModal/     # Configurazione provider LLM
├── config/                 # Configurazione LLM e provider
├── services/               # Servizi per chiamate API LLM
├── types/                  # Definizioni TypeScript
└── App.tsx                # Componente root
```

## Tecnologie Utilizzate

- **React 18** con TypeScript
- **React Flow** per il diagramma interattivo
- **CSS3** per lo styling
- **File API** per import/export
- **Multiple LLM APIs**: OpenAI, Anthropic, Gemini, Grok
- **Local LLM Support**: Ollama, LM Studio integration

## Licenza

Questo progetto è rilasciato sotto licenza MIT.
