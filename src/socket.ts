
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { PowerLobsterConfig } from './types';

const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_INTERVAL = 30000;

export class PowerLobsterSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: PowerLobsterConfig;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(config: PowerLobsterConfig) {
    super();
    this.config = config;
  }

  connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;

    this.isConnecting = true;
    const url = `wss://relay.powerlobster.com/ws?apiKey=${this.config.apiKey}`; // Assumed WS URL
    console.log(`[PowerLobster] Connecting to ${url}...`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[PowerLobster] Connected');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.emit('connected');
      // Start heartbeat if needed
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.emit('message', message);
      } catch (err) {
        console.error('[PowerLobster] Failed to parse message:', err);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[PowerLobster] Disconnected: ${code} ${reason}`);
      this.ws = null;
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err) => {
      console.error('[PowerLobster] WebSocket Error:', err);
      // 'close' event will be emitted after error
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(
      RECONNECT_INTERVAL * Math.pow(1.5, this.reconnectAttempts),
      MAX_RECONNECT_INTERVAL
    );
    console.log(`[PowerLobster] Reconnecting in ${delay}ms...`);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[PowerLobster] Cannot send message, socket not open');
    }
  }
}
