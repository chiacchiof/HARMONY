// Service to manage CTMC results globally across the application
export interface CTMCResults {
  solverMethod?: string;
  result?: any; // Raw results from MATLAB
  steadyStateProbabilities?: number[]; // Parsed probabilities array
  isLoaded: boolean;
}

class CTMCResultsService {
  private static instance: CTMCResultsService;
  private results: CTMCResults = { isLoaded: false };
  private listeners: Array<() => void> = [];

  static getInstance(): CTMCResultsService {
    if (!CTMCResultsService.instance) {
      CTMCResultsService.instance = new CTMCResultsService();
    }
    return CTMCResultsService.instance;
  }

  /**
   * Load CTMC results from backend API
   */
  async loadResults(): Promise<boolean> {
    try {
      console.log('🔄 [CTMCResults] Loading CTMC results...');
      
      // Get library path from localStorage  
      const savedLibraryPath = localStorage.getItem('msolver-library-directory');
      if (!savedLibraryPath) {
        throw new Error('Path della libreria CTMC non trovato.');
      }
      
      // Load results from backend API
      const url = `http://${window.location.hostname}:3001/api/ctmc/results?libraryPath=${encodeURIComponent(savedLibraryPath)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ [CTMCResults] Raw data loaded:', data);
      
      // Parse steady-state probabilities
      let steadyStateProbabilities: number[] = [];
      
      if (data.data && data.data.result) {
        const result = data.data.result;
        
        if (Array.isArray(result)) {
          steadyStateProbabilities = result;
        } else if (typeof result === 'string') {
          // Parse MATLAB vector string like "0 1 0 0 0 0"
          steadyStateProbabilities = result.trim()
            .split(/\s+/)
            .map((p: string) => parseFloat(p))
            .filter((p: number) => !isNaN(p));
        }
      }
      
      this.results = {
        solverMethod: data.data?.solverMethod || 'Unknown',
        result: data.data?.result,
        steadyStateProbabilities,
        isLoaded: true
      };
      
      console.log('📊 [CTMCResults] Parsed probabilities:', steadyStateProbabilities);
      
      // Notify all listeners
      this.notifyListeners();
      
      return true;
      
    } catch (error) {
      console.error('❌ [CTMCResults] Error loading results:', error);
      this.results = { isLoaded: false };
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Get probability for a specific state index
   */
  getStateProbability(stateIndex: number): number | null {
    if (!this.results.isLoaded || !this.results.steadyStateProbabilities) {
      return null;
    }
    
    return this.results.steadyStateProbabilities[stateIndex] || null;
  }

  /**
   * Check if results are loaded
   */
  isResultsLoaded(): boolean {
    return this.results.isLoaded;
  }

  /**
   * Get solver method used
   */
  getSolverMethod(): string | null {
    return this.results.solverMethod || null;
  }

  /**
   * Clear results
   */
  clearResults(): void {
    this.results = { isLoaded: false };
    this.notifyListeners();
  }

  /**
   * Subscribe to results changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }
}

export default CTMCResultsService.getInstance();