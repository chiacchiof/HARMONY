# 🤖 Guida Configurazione LLM Provider

Questa guida ti aiuterà a configurare i diversi provider LLM per il chatbot Dynamic Fault Tree Editor.

## 📋 Prerequisiti

- **OpenAI**: Account OpenAI con API key valida
- **Anthropic**: Account Anthropic con API key valida  
- **Google Gemini**: Account Google Cloud con API key per Gemini
- **Grok**: Account xAI con accesso API
- **Locale**: Ollama o LM Studio installato localmente

## 🔑 Ottenere API Key

### OpenAI
1. Vai su [platform.openai.com](https://platform.openai.com)
2. Crea un account o accedi
3. Vai su "API Keys" nel menu laterale
4. Clicca "Create new secret key"
5. Copia la chiave (inizia con `sk-`)

### Anthropic
1. Vai su [console.anthropic.com](https://console.anthropic.com)
2. Crea un account o accedi
3. Vai su "API Keys"
4. Clicca "Create Key"
5. Copia la chiave (inizia con `sk-ant-`)

### Google Gemini
1. Vai su [makersuite.google.com](https://makersuite.google.com)
2. Accedi con il tuo account Google
3. Clicca su "Get API key"
4. Crea un nuovo progetto o seleziona uno esistente
5. Copia la chiave API

### Grok (xAI)
1. Vai su [x.ai](https://x.ai)
2. Accedi con il tuo account
3. Vai su "API" nel menu
4. Genera una nuova API key
5. Copia la chiave

## ⚙️ Configurazione nell'Editor

### 1. Apri il Modal di Configurazione
- Clicca sull'icona ⚙️ nel pannello destro del chatbot
- Si aprirà il modal di configurazione LLM

### 2. Configura i Provider
Per ogni provider che vuoi utilizzare:

1. **Seleziona la tab** del provider (OpenAI, Anthropic, etc.)
2. **Abilita il provider** spuntando la casella "Abilitato"
3. **Inserisci l'API Key** nel campo corrispondente
4. **Configura il modello** (es. `gpt-4o-mini` per OpenAI)
5. **Imposta i parametri**:
   - **Temperatura**: 0.0-2.0 (0.7 è un buon valore di default)
   - **Max Tokens**: Numero massimo di token per risposta
   - **Base URL**: Lascia quello predefinito a meno di necessità specifiche

### 3. Salva la Configurazione
- Clicca "💾 Salva Configurazione"
- La configurazione viene salvata nel localStorage del browser

## 🏠 Configurazione Modello Locale

### Ollama
1. **Installa Ollama** da [ollama.ai](https://ollama.ai)
2. **Scarica un modello**:
   ```bash
   ollama pull llama3.1:8b
   # oppure
   ollama pull mistral:7b
   ```
3. **Avvia Ollama**:
   ```bash
   ollama serve
   ```
4. **Configura nell'editor**:
   - Provider: `local`
   - Base URL: `http://localhost:11434`
   - Modello: `llama3.1:8b` (o quello scaricato)

### LM Studio
1. **Scarica LM Studio** da [lmstudio.ai](https://lmstudio.ai)
2. **Scarica un modello** (es. Llama, Mistral)
3. **Avvia il server locale**:
   - Clicca su "Start Server" in LM Studio
   - Il server si avvia su `http://localhost:1234`
4. **Configura nell'editor**:
   - Provider: `local`
   - Base URL: `http://localhost:1234`
   - Modello: Nome del modello scaricato

## 🔄 Priorità dei Provider

Il sistema utilizza i provider nell'ordine seguente:

1. **Primo provider abilitato** con API key valida
2. **Fallback al sistema locale** se nessun provider esterno è disponibile
3. **Gestione errori automatica** con passaggio al fallback

## 🚨 Risoluzione Problemi

### Errore "API Key richiesta"
- Verifica di aver inserito l'API key corretta
- Controlla che il provider sia abilitato

### Errore "Provider non supportato"
- Verifica di aver selezionato un provider valido
- Controlla la configurazione del provider

### Errore di connessione
- Verifica che l'API key sia valida
- Controlla la connessione internet
- Verifica che il servizio LLM sia operativo

### Modello locale non risponde
- Verifica che Ollama/LM Studio sia in esecuzione
- Controlla l'URL e la porta nel Base URL
- Verifica che il modello sia stato scaricato correttamente

## 💡 Suggerimenti

### Per OpenAI
- Usa `gpt-4o-mini` per un buon compromesso qualità/prezzo
- `gpt-4o` per la massima qualità
- `gpt-3.5-turbo` per la massima velocità

### Per Anthropic
- `claude-3-haiku-20240307` per velocità e costo contenuto
- `claude-3-sonnet-20240229` per qualità bilanciata
- `claude-3-opus-20240229` per la massima qualità

### Per Gemini
- `gemini-1.5-flash` per velocità e costo contenuto
- `gemini-1.5-pro` per qualità superiore

### Per Modelli Locali
- **Llama 3.1 8B**: Buon compromesso qualità/risorse
- **Mistral 7B**: Eccellente qualità per le dimensioni
- **CodeLlama**: Specializzato per codice e analisi tecnica

## 🔒 Sicurezza

- **Non condividere** le tue API key
- **Non committare** le chiavi nel codice
- **Usa variabili d'ambiente** in produzione
- **Monitora l'uso** delle tue API key

## 📊 Monitoraggio Costi

### OpenAI
- GPT-4o: $5.00 per 1M token input, $15.00 per 1M token output
- GPT-4o-mini: $0.15 per 1M token input, $0.60 per 1M token output

### Anthropic
- Claude 3 Opus: $15.00 per 1M token input, $75.00 per 1M token output
- Claude 3 Sonnet: $3.00 per 1M token input, $15.00 per 1M token output
- Claude 3 Haiku: $0.25 per 1M token input, $1.25 per 1M token output

### Google Gemini
- Gemini 1.5 Pro: $3.50 per 1M token input, $10.50 per 1M token output
- Gemini 1.5 Flash: $0.075 per 1M token input, $0.30 per 1M token output

## 🆘 Supporto

Se hai problemi con la configurazione:

1. **Controlla la console del browser** per errori
2. **Verifica la configurazione** nel modal
3. **Testa l'API key** direttamente con il provider
4. **Controlla la documentazione** del provider specifico

---

**Nota**: I prezzi e le funzionalità possono variare nel tempo. Controlla sempre i siti ufficiali dei provider per informazioni aggiornate.
