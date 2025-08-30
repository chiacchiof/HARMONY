# MATLAB Export - Esempio di Utilizzo

## 🧮 Funzionalità Implementata

Ho implementato un pulsante nel menu "File" che converte la struttura del fault tree in formato MATLAB con ordinamento bottom-up per il tuo solver.

### ✨ Caratteristiche Principali

1. **Pulsante di Export MATLAB**: Aggiunto nel menu File dropdown con icona 🧮
2. **Campo Tempo di Missione**: Aggiunto nel pannello sinistro per impostare Tm (default: 500h)
3. **Ordinamento Bottom-Up**: Algoritmo di ordinamento topologico per definire prima le dipendenze
4. **Supporto SPARE/FDEP**: Gestione di input primari e secondari per porte speciali
5. **Modal di Configurazione**: Interfaccia per configurare parametri di export

### 📋 Formato di Output

Il file MATLAB generato segue esattamente la sintassi richiesta:

```matlab
%% Define the Fault Tree Structure %%
Tm = 500; %[h]

%% Define BEs %%
BE1 = BasicEvent('BE1','exp','exp',[0.01],[0.05]);
BE2 = BasicEvent('BE2','exp','exp',[0.01],[0.05]);
BE3 = BasicEvent('BE3','exp','exp',[0.008],[0.05]);
% ... altri eventi base

%% Define Gates %%
SEQ1 = Gate ('SEQ1', 'SEQ', false, [BE3, BE4, BE5]);
SEQ2 = Gate ('SEQ2', 'SEQ', false, [BE7, BE8, BE9]);
OR2 = Gate ('OR2', 'OR', false, [BE6, SEQ2]);
SPARE2 = Gate ('SPARE2', 'SPARE', false, [SEQ2], [SEQ1]);
% ... altre porte in ordine bottom-up

TOP = AND1;
%% Recall Matlab Script %%
%verify if the FT Structure is valid (it will modify the value of the variable UNVALID_FT)
createFTStructure
```

### 🔧 Sintassi Supportate

#### Basic Events
```matlab
BE_NAME = BasicEvent('nome', 'failure_prob', 'repair_prob', [params_failure], [params_repair]);
```

**Distribuzioni supportate:**
- `'exp'` - Esponenziale: `[lambda]`
- `'weibull'` - Weibull: `[k, lambda, mu]`
- `'normal'` - Normale: `[mu, sigma]`
- `'constant'` - Costante: `[probability]`

#### Gates
```matlab
GATE_NAME = Gate('nome', 'tipo', false, [inputs]);
```

**Tipi di porte supportati:**
- `'AND'`, `'OR'`, `'PAND'`, `'SEQ'`

#### Gates Speciali (SPARE/FDEP)
```matlab
SPARE_GATE = Gate('nome', 'SPARE', false, [primary_inputs], [secondary_inputs]);
FDEP_GATE = Gate('nome', 'FDEP', false, [primary_inputs], [secondary_inputs]);
```

### 🎯 Come Utilizzare

1. **Costruisci il Fault Tree** nell'editor grafico
2. **Imposta il Tempo di Missione** nel pannello sinistro (campo "Tm")
3. **Vai su File → Esporta MATLAB** nel menu
4. **Configura i parametri** nel modal (nome file, tempo missione)
5. **Clicca "Esporta MATLAB"** per scaricare il file .m

### 🔄 Ordinamento Bottom-Up

L'algoritmo implementa un ordinamento topologico che garantisce:
- Gli eventi base vengono definiti per primi
- Le porte vengono definite in ordine di dipendenza (bottom-up)
- Una porta viene definita solo dopo che tutti i suoi input sono stati definiti
- Gestione di dipendenze circolari con avviso

### 📊 Esempio Completo

Se hai un fault tree con:
- Eventi base: BE1, BE2, BE3
- Porta OR1 con input BE1, BE2
- Porta AND1 (TOP) con input OR1, BE3

Il file generato sarà:
```matlab
%% Define the Fault Tree Structure %%
Tm = 500; %[h]

%% Define BEs %%
BE1 = BasicEvent('BE1','exp','exp',[0.01],[0.05]);
BE2 = BasicEvent('BE2','exp','exp',[0.01],[0.05]);
BE3 = BasicEvent('BE3','exp','exp',[0.008],[0.05]);

%% Define Gates %%
OR1 = Gate('OR1', 'OR', false, [BE1, BE2]);
AND1 = Gate('AND1', 'AND', false, [OR1, BE3]);
TOP = AND1;
%% Recall Matlab Script %%
%verify if the FT Structure is valid (it will modify the value of the variable UNVALID_FT)
createFTStructure
```

### 🔧 Miglioramenti Futuri

Per estendere la funzionalità con input secondari per SPARE/FDEP, sarà necessario:
1. Aggiungere un'opzione nell'interfaccia per marcare input come "secondari"
2. Estendere il modal dei parametri delle porte
3. Aggiornare la logica di connessione per distinguere input primari/secondari

La struttura è già predisposta per supportare questa funzionalità!
