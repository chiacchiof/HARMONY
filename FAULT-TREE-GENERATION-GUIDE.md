# 🤖 Guida alla Generazione Automatica di Fault Tree

## 📋 Panoramica

Abbiamo implementato con successo la funzionalità di **generazione automatica di fault tree tramite AI**. Il chatbot può ora interagire direttamente con lo strumento grafico per creare modelli completi basati su descrizioni testuali.

## ✨ Funzionalità Implementate

### 🎯 Generazione Automatica
- **Riconoscimento Comandi**: Il chatbot riconosce automaticamente richieste di generazione
- **Parsing Intelligente**: Estrae parametri come top event, tipo sistema, e componenti
- **Creazione Modello**: Genera eventi, porte logiche e connessioni
- **Integrazione Grafica**: Aggiunge automaticamente gli elementi all'editor visuale

### 🔧 Architettura Tecnica

#### Componenti Principali
1. **FaultTreeGenerator** (`src/services/fault-tree-generator.ts`)
   - Parsing delle risposte LLM (JSON e formato strutturato)
   - Conversione in modello FaultTree
   - Generazione prompt specializzati
   - Esempi predefiniti

2. **LLMService** (esteso in `src/services/llm-service.ts`)
   - Metodo `generateFaultTree()` per generazione completa
   - Riconoscimento automatico richieste: `isGenerationRequest()`
   - Estrazione parametri: `extractGenerationRequest()`

3. **ChatIntegration** (`src/types/ChatIntegration.ts`)
   - Interfacce per comunicazione chatbot-editor
   - Supporto per modifiche e generazioni
   - Gestione stato di generazione

4. **RightPanel** (aggiornato)
   - Pulsanti di esempio rapido
   - Gestione generazione asincrona
   - Feedback visivo con spinner
   - Integrazione con editor grafico

5. **FaultTreeEditor** (esteso)
   - Callback per generazione: `handleGenerateFaultTree()`
   - Callback per modifiche: `handleModifyFaultTree()`
   - Merge intelligente con modelli esistenti

## 🚀 Come Utilizzare

### 1. Configurazione LLM
- Clicca sull'icona ⚙️ nel pannello chatbot
- Configura almeno un provider LLM (OpenAI, Anthropic, Gemini, Grok)
- Inserisci API key valida
- Abilita il provider

### 2. Generazione Rapida
Usa i **pulsanti di esempio** per generazione immediata:
- 🔌 **Sistema Elettrico**: Alimentazione con ridondanza
- 🚗 **Sistema Frenante**: Automotive con ABS
- 🏭 **Sistema Controllo**: Industriale con PLC

### 3. Comandi Personalizzati
Scrivi comandi naturali come:
```
"Genera un fault tree per un sistema di alimentazione elettrica con ridondanza"
"Crea fault tree per sistema frenante automotive con ABS"
"Modella fault tree per sistema di controllo industriale PLC"
```

### 4. Parametri Avanzati
Specifica dettagli per generazione più precisa:
```
"Genera fault tree per sistema elettrico
Top event: Perdita Alimentazione Totale
Componenti: Alimentatore Principale, UPS, Batteria, Generatore"
```

## 📊 Formati Supportati

### Formato JSON (Preferito)
```json
{
  "description": "Descrizione del fault tree",
  "topEvent": "Nome del top event",
  "elements": [
    {
      "type": "event",
      "name": "Nome evento",
      "failureRate": 0.001
    },
    {
      "type": "gate",
      "name": "Nome porta",
      "gateType": "OR"
    }
  ],
  "connections": [
    {
      "source": "Evento",
      "target": "Porta"
    }
  ]
}
```

### Formato Strutturato
```
TOP EVENT: Nome del top event

EVENTI BASE:
- Evento 1
- Evento 2

PORTE:
- Porta 1 (OR)
- Porta 2 (AND)

CONNESSIONI:
Evento 1 -> Porta 1
Porta 1 -> Top Event
```

## 🎛️ Tipi di Porte Supportate

- **OR**: Almeno un input deve verificarsi
- **AND**: Tutti gli input devono verificarsi
- **PAND**: Priority AND - sequenza specifica
- **SPARE**: Sistema con componenti di riserva
- **SEQ**: Sequenziale - ordine temporale
- **FDEP**: Dipendenza funzionale

## 📈 Esempi di Sistemi

### Sistema di Alimentazione Elettrica
- **Top Event**: Perdita Alimentazione Totale
- **Componenti**: Alimentatore, UPS, Batteria, Generatore
- **Logica**: Ridondanza con backup multipli

### Sistema Frenante Automotive  
- **Top Event**: Perdita Capacità Frenante
- **Componenti**: Freni, ABS, ESP, Pompa, Servofreno
- **Logica**: Sicurezza critica con controlli elettronici

### Sistema di Controllo Industriale
- **Top Event**: Arresto Processo Produttivo
- **Componenti**: PLC, Sensori, Attuatori, HMI, Rete
- **Logica**: Controllo ridondante con I/O distribuiti

## 🎨 Miglioramenti dell'Interfaccia

### Layout Ottimizzato
- **Pannello fisso**: La chat rimane sempre visibile senza coprire l'area centrale
- **Scrolling intelligente**: Area messaggi con altezza limitata e scroll automatico
- **Input migliorato**: Textarea con backspace funzionante e dimensioni ottimali
- **Responsività**: Layout adattivo che preserva l'usabilità

## 🔍 Debugging e Troubleshooting

### Problemi Comuni
1. **Generazione fallisce**: Verifica configurazione LLM e API key
2. **Formato non riconosciuto**: Usa esempi predefiniti come riferimento
3. **Elementi non connessi**: Specifica connessioni esplicite nel prompt
4. **Provider non risponde**: Prova con provider diverso o locale
5. **Chat copre l'area centrale**: Risolto con layout fisso e scrolling ottimizzato
6. **Backspace non funziona**: Risolto con gestione eventi migliorata

### Log di Debug
Controlla la console del browser per:
- Stato configurazione LLM
- Errori di parsing
- Risposte API
- Modelli generati

## 🚀 Prossimi Sviluppi

### Funzionalità Future
- **Modifica Incrementale**: Aggiungere/rimuovere elementi esistenti
- **Analisi Quantitativa**: Calcolo automatico affidabilità
- **Export Specializzati**: MATLAB, OpenFTA, SAPHIRE
- **Template Avanzati**: Libreria di sistemi predefiniti
- **Validazione Intelligente**: Controllo coerenza automatico

### Miglioramenti Pianificati
- **Prompt Engineering**: Ottimizzazione per migliori risultati
- **Fallback Robusti**: Gestione errori più intelligente
- **Cache Risultati**: Memorizzazione generazioni precedenti
- **Batch Processing**: Generazione multipla simultanea

## 📞 Supporto

Per problemi o suggerimenti:
1. Verifica la configurazione LLM
2. Prova con esempi predefiniti
3. Controlla i log nella console
4. Usa il fallback locale se disponibile

---

🎉 **La funzionalità è ora completamente operativa!** 
Configura un provider LLM e inizia a generare fault tree automaticamente!
