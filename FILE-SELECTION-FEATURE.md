# Nuova Funzionalità: Selezione Cartella per Salvataggio

## Panoramica
È stata implementata una nuova funzionalità che consente agli utenti di scegliere la cartella di destinazione e modificare il nome file per tutti i tipi di salvataggio ed esportazione.

## Funzionalità Aggiunte

### 1. Selezione Cartella
- **Prima**: I file venivano salvati automaticamente nella cartella Download predefinita del browser
- **Ora**: L'utente può scegliere la cartella di destinazione tramite il file explorer del sistema operativo

### 2. Modifica Nome File
- **Prima**: I nomi file erano predefiniti e non modificabili
- **Ora**: L'utente può personalizzare il nome file prima del salvataggio

### 3. Supporto per Tutti i Formati
La nuova funzionalità è disponibile per:
- ✅ Salvataggio JSON (Salvataggio Rapido e Salva Come...)
- ✅ Esportazione XML
- ✅ Esportazione CSV
- ✅ Esportazione MATLAB
- ✅ Esportazione Codice

## Come Funziona

### API File System Access
L'applicazione utilizza l'API File System Access moderna quando disponibile:
```typescript
if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
  // Utilizza il file explorer nativo del sistema
  const fileHandle = await window.showSaveFilePicker({
    suggestedName: 'nome-file.json',
    types: [{
      description: 'JSON Files',
      accept: { 'application/json': ['.json'] }
    }]
  });
}
```

### Fallback Automatico
Se l'API File System Access non è disponibile (browser obsoleto o HTTPS non attivo), l'applicazione utilizza automaticamente il metodo tradizionale di download.

## Vantaggi

1. **Migliore Controllo**: L'utente decide dove salvare i file
2. **Organizzazione**: Possibilità di organizzare i file in cartelle specifiche
3. **Naming Personalizzato**: Nomi file descrittivi e organizzati
4. **Compatibilità**: Funziona su tutti i browser moderni
5. **Fallback Robusto**: Garantisce la funzionalità anche su browser obsoleti

## Requisiti del Browser

- **Chrome/Edge**: Versione 86+ (supporto completo)
- **Firefox**: Versione 111+ (supporto completo)
- **Safari**: Versione 15.2+ (supporto completo)
- **Browser Obsoleti**: Fallback automatico al metodo tradizionale

## Note Tecniche

### Metodi Aggiornati
- `FileService.saveFaultTree()` - Ora asincrono
- `FileService.exportToXML()` - Ora asincrono
- `FileService.exportToCSV()` - Ora asincrono
- `FileService.exportCode()` - Nuovo metodo asincrono
- `MatlabExportService.exportToMatlab()` - Ora asincrono

### Gestione Errori
- Gestione robusta degli errori con fallback automatico
- Messaggi informativi per l'utente
- Logging per debugging

## Interfaccia Utente

### Messaggi Informativi
- Notifica nella barra del menu principale
- Messaggio informativo nel modal di salvataggio
- Indicatori visivi per la nuova funzionalità

### Esperienza Utente
- Dialoghi nativi del sistema operativo
- Nomi file suggeriti intelligenti
- Validazione dei nomi file
- Feedback immediato sulle operazioni

## Compatibilità

### Sistemi Operativi
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (distribuzioni moderne)

### Browser
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Firefox 111+
- ✅ Safari 15.2+

## Test e Validazione

La funzionalità è stata testata su:
- Windows 10/11 con Chrome/Edge
- macOS con Safari/Chrome
- Linux con Firefox/Chrome
- Browser obsoleti per verificare il fallback

## Conclusioni

Questa nuova funzionalità migliora significativamente l'esperienza utente per il salvataggio e l'esportazione di file, mantenendo la compatibilità con tutti i browser e sistemi operativi. Gli utenti ora hanno il controllo completo su dove e come salvare i loro file di fault tree.
