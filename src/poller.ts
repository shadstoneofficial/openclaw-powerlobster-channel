
import { EventEmitter } from 'events';
import { PowerLobsterConfig } from './types';
import fetch from 'node-fetch';

const RELAY_BASE_URL = 'https://relay.powerlobster.com/api/v1';
const POLLING_INTERVAL = 30000; // 30 seconds

export class PowerLobsterPoller extends EventEmitter {
  private config: PowerLobsterConfig;
  private isPolling = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(config: PowerLobsterConfig) {
    super();
    this.config = config;
  }

  start() {
    if (this.isPolling) return;
    
    if (!this.config.relayId || !this.config.relayApiKey) {
      console.warn('[PowerLobster] Relay ID or API Key missing. Polling disabled.');
      return;
    }

    this.isPolling = true;
    console.log(`[PowerLobster] Starting polling for relay ${this.config.relayId}...`);
    this.poll();
  }

  stop() {
    this.isPolling = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async poll() {
    if (!this.isPolling) return;

    try {
      const response = await fetch(
        `${RELAY_BASE_URL}/pending/${this.config.relayId}?ack=true`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.relayApiKey}`
          }
        }
      );

      if (response.ok) {
        const data: any = await response.json();
        const events = data.events || [];
        
        if (events.length > 0) {
          console.log(`[PowerLobster] Received ${events.length} events`);
          for (const eventWrapper of events) {
            // Unpack the payload which contains the actual event
            const event = eventWrapper.payload;
            this.emit('message', event);
          }
        }
      } else {
        console.warn(`[PowerLobster] Polling failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('[PowerLobster] Polling error:', err);
    }

    // Schedule next poll
    if (this.isPolling) {
      this.timer = setTimeout(() => this.poll(), POLLING_INTERVAL);
    }
  }
}
