/**
 * Service for executing MATLAB commands via backend API
 * This handles the real MATLAB execution using Node.js child_process
 */

export interface MatlabExecutionRequest {
  shyftaPath: string;
  modelName: string;
  modelContent: string;
  zftaContent: string;
}

export interface MatlabExecutionResponse {
  success: boolean;
  output?: string;
  error?: string;
  progress?: number;
  exitCode?: number;
  resultsPath?: string;
}

export class MatlabExecutionService {
  private static readonly API_BASE_URL = `http://${window.location.hostname}:3001/api`; // Backend server

  /**
   * Execute MATLAB simulation via backend API
   */
  static async executeMatlabSimulation(request: MatlabExecutionRequest): Promise<void> {
    try {
      console.log('🚀 Sending MATLAB execution request to backend...');
      
      const response = await fetch(`${this.API_BASE_URL}/matlab/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result: MatlabExecutionResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'MATLAB execution failed');
      }

      console.log('✅ MATLAB execution completed successfully');
      console.log('📊 Output:', result.output);

    } catch (error) {
      console.error('❌ Failed to execute MATLAB:', error);
      throw error;
    }
  }

  /**
   * Start MATLAB simulation with real-time progress monitoring
   */
  static async startMatlabWithMonitoring(
    request: MatlabExecutionRequest,
    onProgress: (progress: number, output: string) => void
  ): Promise<void> {
    try {
      console.log('🔧 Starting MATLAB with real-time monitoring...');

      // Use fetch with streaming for POST request with file content
      const response = await fetch(`${this.API_BASE_URL}/matlab/execute-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response stream reader');
      }

      return new Promise(async (resolve, reject) => {
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('📡 Stream ended');
              break;
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const dataStr = line.substring(6); // Remove 'data: ' prefix
                  if (dataStr.trim()) {
                    const data: MatlabExecutionResponse = JSON.parse(dataStr);
                    
                    console.log('📡 Real-time update:', data);
                    
                    if (data.progress !== undefined) {
                      onProgress(data.progress, data.output || '');
                    }

                    if (data.success) {
                      console.log('🎉 MATLAB simulation completed!');
                      reader.releaseLock();
                      resolve();
                      return;
                    }
                    
                    // Check for simulation failure with exit code
                    if (data.hasOwnProperty('exitCode') && data.exitCode !== 0) {
                      console.error('❌ MATLAB simulation failed with exit code:', data.exitCode);
                      reader.releaseLock();
                      reject(new Error(`MATLAB simulation failed (exit code: ${data.exitCode})`));
                      return;
                    }

                    // Report errors immediately but don't stop streaming
                    if (data.error && data.progress !== undefined) {
                      console.error('❌ MATLAB execution error:', data.error);
                      onProgress(data.progress, `❌ ERRORE: ${data.error}\n${data.output || ''}`);
                    }
                    
                    // Only reject on final error without progress
                    if (data.error && data.progress === undefined) {
                      console.error('❌ MATLAB execution error:', data.error);
                      reader.releaseLock();
                      reject(new Error(data.error));
                      return;
                    }
                  }
                } catch (parseError) {
                  console.error('Failed to parse SSE data:', parseError, 'Line:', line);
                }
              }
            }
          }

          reader.releaseLock();
          resolve();

        } catch (streamError) {
          console.error('❌ Stream reading error:', streamError);
          reader.releaseLock();
          reject(streamError);
        }
      });

    } catch (error) {
      console.error('❌ Failed to start MATLAB monitoring:', error);
      throw error;
    }
  }

  /**
   * Check if backend API is available
   */
  static async checkBackendAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Backend API not available:', error);
      return false;
    }
  }

  /**
   * Stop running MATLAB simulation via backend API
   */
  static async stopMatlabSimulation(): Promise<boolean> {
    try {
      console.log('🛑 Requesting MATLAB simulation stop...');
      
      const response = await fetch(`${this.API_BASE_URL}/matlab/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ MATLAB simulation stop requested successfully');
        console.log('📝 Message:', result.message);
        return true;
      } else {
        console.error('❌ Failed to stop MATLAB simulation:', result.error);
        return false;
      }

    } catch (error) {
      console.error('❌ Failed to stop MATLAB simulation:', error);
      return false;
    }
  }
}