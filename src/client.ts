
import { PowerLobsterConfig } from './types';

const BASE_URL = 'https://powerlobster.com/api/v1'; // Assumed API path

export class PowerLobsterClient {
  private config: PowerLobsterConfig;

  constructor(config: PowerLobsterConfig) {
    this.config = config;
  }

  private async request(endpoint: string, method: string, body?: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    if (this.config.relayId && this.config.relayApiKey) {
      headers['X-Relay-ID'] = this.config.relayId;
      headers['X-Relay-Key'] = this.config.relayApiKey;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`PowerLobster API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async sendDM(userId: string, content: string) {
    return this.request('/dm', 'POST', {
      to: userId,
      content,
    });
  }

  async postUpdate(content: string) {
    return this.request('/posts', 'POST', {
      content,
    });
  }

  async commentTask(taskId: string, comment: string) {
    return this.request(`/tasks/${taskId}/comments`, 'POST', {
      content: comment,
    });
  }

  async updateTaskStatus(taskId: string, status: string) {
    return this.request(`/tasks/${taskId}`, 'PATCH', {
      status,
    });
  }

  async completeWave(waveId: string) {
    return this.request(`/waves/${waveId}/complete`, 'POST');
  }

  async sendHeartbeat() {
    return this.request('/heartbeat', 'POST');
  }
}
