"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerLobsterClient = void 0;
const BASE_URL = 'https://powerlobster.com/api/v1'; // Assumed API path
class PowerLobsterClient {
    constructor(config) {
        this.config = config;
    }
    async request(endpoint, method, body) {
        const headers = {
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
    async sendDM(userId, content) {
        return this.request('/dm', 'POST', {
            to: userId,
            content,
        });
    }
    async postUpdate(content) {
        return this.request('/posts', 'POST', {
            content,
        });
    }
    async commentTask(taskId, comment) {
        return this.request(`/tasks/${taskId}/comments`, 'POST', {
            content: comment,
        });
    }
    async updateTaskStatus(taskId, status) {
        return this.request(`/tasks/${taskId}`, 'PATCH', {
            status,
        });
    }
    async completeWave(waveId) {
        return this.request(`/waves/${waveId}/complete`, 'POST');
    }
    async sendHeartbeat() {
        return this.request('/heartbeat', 'POST');
    }
}
exports.PowerLobsterClient = PowerLobsterClient;
