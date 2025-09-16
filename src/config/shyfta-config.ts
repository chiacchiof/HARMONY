export interface SHyFTASettings {
  shyftaLibFolder: string;
  defaultIterations: number;
  defaultConfidence: number;
  defaultConfidenceToggle: boolean;
  lastUsedModelName: string;
  // Impostazioni per l'analisi dei risultati
  resultsTimestep: number; // Delta temporale per calcoli PDF/CDF (default 1 ora)
  // Advanced simulation parameters
  percentageErrorTollerance?: number;
  minIterationsForCI?: number;
  maxIterationsForRobustness?: number;
  stabilityCheckWindow?: number;
  stabilityThreshold?: number;
  convergenceCheckWindow?: number;
  convergenceThreshold?: number;
}

const DEFAULT_SETTINGS: SHyFTASettings = {
  shyftaLibFolder: '',
  defaultIterations: 1000,
  defaultConfidence: 0.95,
  defaultConfidenceToggle: true,
  lastUsedModelName: '',
  resultsTimestep: 1.0, // 1 ora
  // Advanced simulation parameters - optimized for low rates
  percentageErrorTollerance: 5.0,
  minIterationsForCI: 1000,
  maxIterationsForRobustness: 1000000,
  stabilityCheckWindow: 50,
  stabilityThreshold: 0.1,
  convergenceCheckWindow: 20,
  convergenceThreshold: 0.15
};

const STORAGE_KEY = 'shyfta-settings';

export class SHyFTAConfig {
  /**
   * Load SHyFTA settings from localStorage
   */
  static loadSettings(): SHyFTASettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Error loading SHyFTA settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Save SHyFTA settings to localStorage
   */
  static saveSettings(settings: SHyFTASettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving SHyFTA settings:', error);
    }
  }

  /**
   * Update specific setting
   */
  static updateSetting<K extends keyof SHyFTASettings>(
    key: K, 
    value: SHyFTASettings[K]
  ): void {
    const currentSettings = this.loadSettings();
    currentSettings[key] = value;
    this.saveSettings(currentSettings);
  }

  /**
   * Reset settings to defaults
   */
  static resetSettings(): SHyFTASettings {
    this.saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  /**
   * Get default model name with current timestamp
   */
  static generateDefaultModelName(): string {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `initFaultTree_${day}${month}${year}_${hours}_${minutes}_${seconds}.m`;
  }

  /**
   * Validate folder path (basic validation)
   */
  static validateFolderPath(path: string): boolean {
    if (!path || path.trim().length === 0) {
      return false;
    }
    
    // Basic path validation (you can enhance this)
    const validPathPattern = /^[a-zA-Z]:(\\[^\\/:*?"<>|]+)*\\?$|^\/([^/]+\/)*[^/]*$/;
    return validPathPattern.test(path.trim());
  }
}