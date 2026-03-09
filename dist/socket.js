"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerLobsterSocket = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_INTERVAL = 30000;
class PowerLobsterSocket extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.shouldReconnect = true;
        this.config = config;
    }
    connect() {
        if (this.isConnecting || this.ws?.readyState === ws_1.default.OPEN)
            return;
        this.isConnecting = true;
        const url = `wss://relay.powerlobster.com/ws?apiKey=${this.config.apiKey}`; // Assumed WS URL
        console.log(`[PowerLobster] Connecting to ${url}...`);
        this.ws = new ws_1.default(url);
        this.ws.on('open', () => {
            console.log('[PowerLobster] Connected');
            this.reconnectAttempts = 0;
            this.isConnecting = false;
            this.emit('connected');
            // Start heartbeat if needed
        });
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.emit('message', message);
            }
            catch (err) {
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
    scheduleReconnect() {
        const delay = Math.min(RECONNECT_INTERVAL * Math.pow(1.5, this.reconnectAttempts), MAX_RECONNECT_INTERVAL);
        console.log(`[PowerLobster] Reconnecting in ${delay}ms...`);
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }
    send(data) {
        if (this.ws?.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
        else {
            console.warn('[PowerLobster] Cannot send message, socket not open');
        }
    }
}
exports.PowerLobsterSocket = PowerLobsterSocket;
