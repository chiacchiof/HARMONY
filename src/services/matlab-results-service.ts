import { BaseEvent, Gate } from '../types/FaultTree';

// Interface per i risultati di simulazione di un componente
export interface ComponentSimulationResults {
  componentId: string;
  componentName: string;
  componentType: 'event' | 'gate';
  timeOfFailureArray: number[]; // Array con i tempi di guasto per ogni iterazione (Inf = mai guastato)
  reliability: number; // Calcolato come (iter - nFailures) / iter
  unreliability: number; // Calcolato come nFailures / iter
  nFailures: number; // Numero di iterazioni in cui il componente è guastato
  totalIterations: number;
  // Dati per PDF/CDF
  cdfData?: { time: number; probability: number }[];
  pdfData?: { time: number; density: number }[];
}

// Interface per i risultati complessivi della simulazione
export interface SimulationResults {
  simulationCompleted: boolean;
  missionTime: number;
  totalIterations: number;
  timestep: number; // Timestep configurabile (default 1 ora)
  components: ComponentSimulationResults[];
  resultsFilePath?: string; // Path al file results.mat
}

// Configurazione per l'elaborazione dei risultati
export interface ResultsProcessingConfig {
  timestep: number; // Delta temporale per i calcoli (default 1 ora)
  maxTime?: number; // Tempo massimo per i grafici (default mission time)
}

export class MatlabResultsService {
  private static simulationResults: SimulationResults | null = null;
  
  /**
   * Verifica se esistono risultati di simulazione completati
   */
  static hasSimulationResults(): boolean {
    return this.simulationResults !== null && this.simulationResults.simulationCompleted;
  }

  /**
   * Ottieni i risultati della simulazione corrente
   */
  static getCurrentResults(): SimulationResults | null {
    return this.simulationResults;
  }

  /**
   * Carica e analizza il file results.mat via backend MATLAB
   */
  static async loadResultsFromFile(
    filePath: string, 
    events: BaseEvent[], 
    gates: Gate[],
    missionTime: number,
    iterations: number,
    config: ResultsProcessingConfig = { timestep: 1 }
  ): Promise<SimulationResults> {
    
    console.log(`📁 Loading real results from: ${filePath}`);
    
    try {
      // Prepare component names for the backend
      const allComponents = [...events.map(e => e.name), ...gates.map(g => g.name)];
      const componentsParam = allComponents.join(',');
      
      console.log(`📋 Components to parse: ${componentsParam}`);
      
      // Call backend API to parse the results.mat file
      const response = await fetch(
        `http://${window.location.hostname}:3001/api/results/parse?` + new URLSearchParams({
          resultsPath: filePath,
          components: componentsParam,
          iterations: iterations.toString(),
          missionTime: missionTime.toString(),
          timestep: config.timestep.toString(),
        }).toString()
      );
      
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }
      
      const backendResults = await response.json();
      
      if (!backendResults.success) {
        throw new Error(`Backend parsing failed: ${backendResults.error}`);
      }
      
      console.log(`✅ Backend parsing successful for ${Object.keys(backendResults.components).length} components`);
      
      // Convert backend format to our format
      const components: ComponentSimulationResults[] = [];
      
      // Process events
      for (const event of events) {
        const backendComp = backendResults.components[event.name];
        if (backendComp) {
          console.log(`🔍 [DEBUG] Processing event ${event.name}:`);
          console.log('  📊 Backend CDF data:', backendComp.cdfData);
          console.log('  📈 Backend PDF data:', backendComp.pdfData);
          
          const componentResult: ComponentSimulationResults = {
            componentId: event.id,
            componentName: event.name,
            componentType: 'event',
            timeOfFailureArray: backendComp.timeOfFailureArray || [],
            reliability: backendComp.reliability || 0,
            unreliability: backendComp.unreliability || 0,
            nFailures: backendComp.nFailures || 0,
            totalIterations: backendComp.totalIterations || iterations,
            cdfData: this.convertBackendCdfData(backendComp.cdfData),
            pdfData: this.convertBackendPdfData(backendComp.pdfData)
          };
          
          console.log(`  📊 Converted CDF data (${componentResult.cdfData?.length || 0} points):`, componentResult.cdfData?.slice(0, 3));
          console.log(`  📈 Converted PDF data (${componentResult.pdfData?.length || 0} points):`, componentResult.pdfData?.slice(0, 3));
          
          components.push(componentResult);
          console.log(`✅ Processed event ${event.name}: R=${(componentResult.reliability*100).toFixed(1)}%, failures=${componentResult.nFailures}`);
        } else {
          console.log(`⚠️ Event ${event.name} not found in results.mat`);
        }
      }
      
      // Process gates
      for (const gate of gates) {
        const backendComp = backendResults.components[gate.name];
        if (backendComp) {
          const componentResult: ComponentSimulationResults = {
            componentId: gate.id,
            componentName: gate.name,
            componentType: 'gate',
            timeOfFailureArray: backendComp.timeOfFailureArray || [],
            reliability: backendComp.reliability || 0,
            unreliability: backendComp.unreliability || 0,
            nFailures: backendComp.nFailures || 0,
            totalIterations: backendComp.totalIterations || iterations,
            cdfData: this.convertBackendCdfData(backendComp.cdfData),
            pdfData: this.convertBackendPdfData(backendComp.pdfData)
          };
          components.push(componentResult);
          console.log(`✅ Processed gate ${gate.name}: R=${(componentResult.reliability*100).toFixed(1)}%, failures=${componentResult.nFailures}`);
        } else {
          console.log(`⚠️ Gate ${gate.name} not found in results.mat`);
        }
      }
      
      const results: SimulationResults = {
        simulationCompleted: true,
        missionTime,
        totalIterations: iterations,
        timestep: config.timestep,
        components,
        resultsFilePath: filePath
      };
      
      this.simulationResults = results;
      return results;
      
    } catch (error) {
      console.error('❌ Error loading real results from backend:', error);
      throw error;
    }
  }

  /**
   * Convert backend CDF data format to frontend format
   */
  private static convertBackendCdfData(backendData: any): { time: number; probability: number }[] {
    if (!backendData || !backendData.time || !Array.isArray(backendData.time)) {
      return [];
    }
    
    const times = backendData.time;
    const probabilities = backendData.probability;
    
    if (!probabilities || !Array.isArray(probabilities) || times.length !== probabilities.length) {
      return [];
    }
    
    const result = [];
    for (let i = 0; i < times.length; i++) {
      result.push({ time: times[i], probability: probabilities[i] });
    }
    
    return result;
  }
  
  /**
   * Convert backend PDF data format to frontend format
   */
  private static convertBackendPdfData(backendData: any): { time: number; density: number }[] {
    if (!backendData || !backendData.time || !Array.isArray(backendData.time)) {
      return [];
    }
    
    const times = backendData.time;
    const densities = backendData.density;
    
    if (!densities || !Array.isArray(densities) || times.length !== densities.length) {
      return [];
    }
    
    const result = [];
    for (let i = 0; i < times.length; i++) {
      result.push({ time: times[i], density: densities[i] });
    }
    
    return result;
  }
  

  /**
   * Ottieni i risultati per un componente specifico
   */
  static getComponentResults(componentId: string): ComponentSimulationResults | null {
    if (!this.simulationResults) return null;
    
    return this.simulationResults.components.find(comp => comp.componentId === componentId) || null;
  }

  /**
   * Pulisci i risultati della simulazione
   */
  static clearResults(): void {
    this.simulationResults = null;
  }

  /**
   * Simula il caricamento automatico dei risultati dalla cartella output
   * Questa funzione verrà chiamata quando la simulazione è completata
   */
  static async loadResultsAfterSimulation(
    shyftaPath: string,
    events: BaseEvent[],
    gates: Gate[],
    missionTime: number,
    iterations: number,
    config: ResultsProcessingConfig = { timestep: 1 }
  ): Promise<boolean> {
    try {
      const resultsPath = `${shyftaPath}/output/results.mat`;
      
      console.log('🔍 [MatlabResultsService] Loading results after simulation...');
      console.log(`   📁 Results path: ${resultsPath}`);
      console.log(`   📊 Components: ${events.length} events, ${gates.length} gates`);
      console.log(`   ⚙️ Config: timestep=${config.timestep}h`);
      
 
      
      await this.loadResultsFromFile(resultsPath, events, gates, missionTime, iterations, config);
      
      console.log('✅ [MatlabResultsService] Results loaded and processed successfully!');
      console.log(`   📈 Components with results: ${this.simulationResults?.components.length}`);
      
      // Trigger un re-render forzato dei componenti
      window.dispatchEvent(new CustomEvent('simulationResultsLoaded'));
      
      return true;
      
    } catch (error) {
      console.error('❌ [MatlabResultsService] Failed to load simulation results:', error);
      return false;
    }
  }

  /**
   * Valida la configurazione dei parametri
   */
  static validateProcessingConfig(config: ResultsProcessingConfig): string | null {
    if (config.timestep <= 0) {
      return 'Timestep deve essere maggiore di 0';
    }
    if (config.maxTime && config.maxTime <= 0) {
      return 'Tempo massimo deve essere maggiore di 0';
    }
    return null;
  }

  /**
   * Ottieni statistiche riassuntive per tutti i componenti
   */
  static getOverallStatistics(): {
    totalComponents: number;
    averageReliability: number;
    mostReliableComponent: { name: string; reliability: number } | null;
    leastReliableComponent: { name: string; reliability: number } | null;
  } | null {
    if (!this.simulationResults) return null;
    
    const components = this.simulationResults.components;
    if (components.length === 0) return null;
    
    const totalComponents = components.length;
    const averageReliability = components.reduce((sum, comp) => sum + comp.reliability, 0) / totalComponents;
    
    const sortedByReliability = [...components].sort((a, b) => b.reliability - a.reliability);
    const mostReliableComponent = {
      name: sortedByReliability[0].componentName,
      reliability: sortedByReliability[0].reliability
    };
    const leastReliableComponent = {
      name: sortedByReliability[sortedByReliability.length - 1].componentName,
      reliability: sortedByReliability[sortedByReliability.length - 1].reliability
    };
    
    return {
      totalComponents,
      averageReliability,
      mostReliableComponent,
      leastReliableComponent
    };
  }
}