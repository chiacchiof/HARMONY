import { FaultTreeGenerationRequest, FaultTreeGenerationResult } from '../services/fault-tree-generator';

/**
 * Esempi predefiniti di fault tree per dimostrare le capacità del sistema
 */

export const EXAMPLE_GENERATIONS: Array<{
  name: string;
  request: FaultTreeGenerationRequest;
  expectedResult: FaultTreeGenerationResult;
}> = [
  {
    name: "Sistema di Alimentazione Elettrica",
    request: {
      description: "Sistema di alimentazione elettrica con ridondanza per data center",
      topEvent: "Perdita Alimentazione Totale",
      systemType: "Elettrico",
      components: ["Alimentatore Principale", "Alimentatore Backup", "UPS", "Batteria", "Generatore"]
    },
    expectedResult: {
      description: "Fault tree per sistema di alimentazione ridondante",
      topEvent: "Perdita Alimentazione Totale",
      elements: [
        {
          type: "gate",
          name: "Perdita Alimentazione Totale",
          gateType: "AND",
          description: "Guasto simultaneo di tutti i sistemi di alimentazione"
        },
        {
          type: "gate", 
          name: "Guasto Alimentazione Primaria",
          gateType: "OR",
          description: "Guasto del sistema di alimentazione principale"
        },
        {
          type: "gate",
          name: "Guasto Alimentazione Backup",
          gateType: "AND", 
          description: "Guasto del sistema di backup"
        },
        {
          type: "event",
          name: "Guasto Alimentatore Principale",
          failureRate: 0.0001,
          description: "Failure dell'alimentatore principale"
        },
        {
          type: "event",
          name: "Blackout Rete Elettrica",
          failureRate: 0.001,
          description: "Interruzione della rete elettrica esterna"
        },
        {
          type: "event",
          name: "Guasto UPS",
          failureRate: 0.0005,
          description: "Failure dell'UPS"
        },
        {
          type: "event",
          name: "Scarica Batteria",
          failureRate: 0.002,
          description: "Esaurimento batterie UPS"
        },
        {
          type: "event",
          name: "Guasto Generatore",
          failureRate: 0.001,
          description: "Mancato avvio del generatore di emergenza"
        }
      ],
      connections: [
        { source: "Guasto Alimentazione Primaria", target: "Perdita Alimentazione Totale" },
        { source: "Guasto Alimentazione Backup", target: "Perdita Alimentazione Totale" },
        { source: "Guasto Alimentatore Principale", target: "Guasto Alimentazione Primaria" },
        { source: "Blackout Rete Elettrica", target: "Guasto Alimentazione Primaria" },
        { source: "Guasto UPS", target: "Guasto Alimentazione Backup" },
        { source: "Scarica Batteria", target: "Guasto Alimentazione Backup" },
        { source: "Guasto Generatore", target: "Guasto Alimentazione Backup" }
      ]
    }
  },
  
  {
    name: "Sistema Frenante Automotive",
    request: {
      description: "Sistema frenante automotive con ABS e controllo elettronico",
      topEvent: "Perdita Capacità Frenante",
      systemType: "Automotive",
      components: ["Freni Anteriori", "Freni Posteriori", "ABS", "ESP", "Pompa Freno", "Servofreno"]
    },
    expectedResult: {
      description: "Fault tree per sistema frenante automotive",
      topEvent: "Perdita Capacità Frenante", 
      elements: [
        {
          type: "gate",
          name: "Perdita Capacità Frenante",
          gateType: "OR",
          description: "Perdita totale o parziale della capacità frenante"
        },
        {
          type: "gate",
          name: "Guasto Circuito Idraulico",
          gateType: "OR",
          description: "Guasto del sistema idraulico"
        },
        {
          type: "gate",
          name: "Guasto Sistema Controllo",
          gateType: "AND",
          description: "Guasto dei sistemi elettronici di controllo"
        },
        {
          type: "event",
          name: "Perdita Liquido Freni",
          failureRate: 0.0002,
          description: "Perdita nel circuito idraulico"
        },
        {
          type: "event",
          name: "Guasto Pompa Freno",
          failureRate: 0.0001,
          description: "Failure della pompa principale"
        },
        {
          type: "event",
          name: "Guasto Servofreno",
          failureRate: 0.0001,
          description: "Guasto dell'amplificatore di frenata"
        },
        {
          type: "event",
          name: "Guasto ABS",
          failureRate: 0.0003,
          description: "Failure del sistema ABS"
        },
        {
          type: "event", 
          name: "Guasto ESP",
          failureRate: 0.0002,
          description: "Failure del controllo stabilità"
        },
        {
          type: "event",
          name: "Usura Pastiglie/Dischi",
          failureRate: 0.01,
          description: "Usura eccessiva componenti frenanti"
        }
      ],
      connections: [
        { source: "Guasto Circuito Idraulico", target: "Perdita Capacità Frenante" },
        { source: "Guasto Sistema Controllo", target: "Perdita Capacità Frenante" },
        { source: "Usura Pastiglie/Dischi", target: "Perdita Capacità Frenante" },
        { source: "Perdita Liquido Freni", target: "Guasto Circuito Idraulico" },
        { source: "Guasto Pompa Freno", target: "Guasto Circuito Idraulico" },
        { source: "Guasto Servofreno", target: "Guasto Circuito Idraulico" },
        { source: "Guasto ABS", target: "Guasto Sistema Controllo" },
        { source: "Guasto ESP", target: "Guasto Sistema Controllo" }
      ]
    }
  },

  {
    name: "Sistema di Controllo Industriale",
    request: {
      description: "Sistema di controllo di processo industriale con PLC ridondante",
      topEvent: "Arresto Processo Produttivo", 
      systemType: "Industriale",
      components: ["PLC Principale", "PLC Backup", "Sensori", "Attuatori", "HMI", "Rete Fieldbus"]
    },
    expectedResult: {
      description: "Fault tree per sistema di controllo industriale",
      topEvent: "Arresto Processo Produttivo",
      elements: [
        {
          type: "gate",
          name: "Arresto Processo Produttivo", 
          gateType: "OR",
          description: "Interruzione del processo di produzione"
        },
        {
          type: "gate",
          name: "Guasto Sistema Controllo",
          gateType: "AND",
          description: "Guasto di entrambi i PLC"
        },
        {
          type: "gate",
          name: "Guasto Sistema I/O",
          gateType: "OR", 
          description: "Guasto dei sistemi di input/output"
        },
        {
          type: "event",
          name: "Guasto PLC Principale",
          failureRate: 0.0001,
          description: "Failure del controllore principale"
        },
        {
          type: "event",
          name: "Guasto PLC Backup",
          failureRate: 0.0001,
          description: "Failure del controllore di backup"
        },
        {
          type: "event",
          name: "Guasto Sensori Critici",
          failureRate: 0.0005,
          description: "Failure dei sensori di processo"
        },
        {
          type: "event",
          name: "Guasto Attuatori",
          failureRate: 0.0003,
          description: "Failure degli attuatori"
        },
        {
          type: "event",
          name: "Interruzione Rete Fieldbus",
          failureRate: 0.0002,
          description: "Perdita comunicazione fieldbus"
        },
        {
          type: "event",
          name: "Guasto HMI",
          failureRate: 0.0001,
          description: "Failure dell'interfaccia operatore"
        },
        {
          type: "event",
          name: "Errore Software",
          failureRate: 0.001,
          description: "Bug nel software di controllo"
        }
      ],
      connections: [
        { source: "Guasto Sistema Controllo", target: "Arresto Processo Produttivo" },
        { source: "Guasto Sistema I/O", target: "Arresto Processo Produttivo" },
        { source: "Errore Software", target: "Arresto Processo Produttivo" },
        { source: "PLC Principale", target: "Guasto Sistema Controllo" },
        { source: "PLC Backup", target: "Guasto Sistema Controllo" },
        { source: "Guasto Sensori Critici", target: "Guasto Sistema I/O" },
        { source: "Guasto Attuatori", target: "Guasto Sistema I/O" },
        { source: "Interruzione Rete Fieldbus", target: "Guasto Sistema I/O" },
        { source: "Guasto HMI", target: "Guasto Sistema I/O" }
      ]
    }
  }
];

/**
 * Prompt di esempio per testare la generazione
 */
export const EXAMPLE_PROMPTS = [
  "Genera un fault tree per un sistema di alimentazione elettrica con doppia ridondanza",
  "Crea fault tree per sistema frenante automotive con ABS e controllo stabilità",
  "Modella fault tree per sistema di controllo industriale con PLC ridondante",
  "Costruisci fault tree per sistema di sicurezza antincendio con rilevatori e sprinkler",
  "Genera fault tree per sistema di navigazione aeronautico con GPS e INS",
  "Crea fault tree per sistema di raffreddamento data center con ridondanza N+1"
];

/**
 * Funzione di test per verificare la generazione
 */
export function testFaultTreeGeneration() {
  console.log('🧪 Test Fault Tree Generation');
  console.log('===============================');
  
  EXAMPLE_GENERATIONS.forEach((example, index) => {
    console.log(`\n${index + 1}. ${example.name}`);
    console.log(`   Request: ${example.request.description}`);
    console.log(`   Top Event: ${example.request.topEvent}`);
    console.log(`   Elements: ${example.expectedResult.elements.length}`);
    console.log(`   Connections: ${example.expectedResult.connections.length}`);
  });
  
  console.log('\n🚀 Prompt di esempio:');
  EXAMPLE_PROMPTS.forEach((prompt, index) => {
    console.log(`   ${index + 1}. "${prompt}"`);
  });
}
