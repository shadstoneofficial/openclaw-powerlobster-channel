# PowerLobster Plugin Update Specification

This document details the recent changes made to the OpenClaw PowerLobster Channel Plugin to support Relay Sync, Execution Reporting, and Metadata Preservation.

## 1. Feature: Relay Configuration Sync & Caching

**Objective:** On startup, the plugin fetches the latest configuration from the Relay API and caches it locally to ensure resilience.

### File: [src/channel.ts](src/channel.ts)

**Location:** Inside `startAccount` method (approx line 153).

```typescript
// --- CONFIG SYNC LOGIC ---
let effectiveConfig = { ...config }; // Start with local config
let syncSource = 'local';

if (config.relayId && config.relayApiKey) {
    try {
        console.log(`[PowerLobster] Syncing config from Relay for ${config.relayId}...`);
        const relayConfig = await client.getRelayConfig();
        
        if (relayConfig) {
            console.log(`[PowerLobster] Config synced from relay (v${relayConfig.config_version})`);
            syncSource = 'relay';
            
            // Cache logic
            try {
                const cacheDir = path.join(os.homedir(), '.openclaw', 'cache');
                await fs.mkdir(cacheDir, { recursive: true });
                const cachePath = path.join(cacheDir, 'relay-config.json');
                await fs.writeFile(cachePath, JSON.stringify(relayConfig, null, 2));
            } catch (cacheErr) {
                console.warn('[PowerLobster] Failed to write config cache:', cacheErr);
            }

            // Apply relay overrides
            if (relayConfig.delivery_mode) {
                effectiveConfig.deliveryMode = relayConfig.delivery_mode;
            }
            if (relayConfig.webhook_url) {
                effectiveConfig.webhookUrl = relayConfig.webhook_url;
            }
        }
    } catch (err) {
        console.warn(`[PowerLobster] Failed to sync relay config (using local/cache):`, err);
        // Fallback to cache
        try {
            const cachePath = path.join(os.homedir(), '.openclaw', 'cache', 'relay-config.json');
            const cachedData = await fs.readFile(cachePath, 'utf-8');
            const cachedConfig = JSON.parse(cachedData);
            
            if (cachedConfig.relay_id === config.relayId) { // Verify it matches this agent
                console.log(`[PowerLobster] Loaded config from cache (v${cachedConfig.config_version})`);
                syncSource = 'cache';
                if (cachedConfig.delivery_mode) effectiveConfig.deliveryMode = cachedConfig.delivery_mode;
                if (cachedConfig.webhook_url) effectiveConfig.webhookUrl = cachedConfig.webhook_url;
            }
        } catch (readErr) {
            console.log('[PowerLobster] No cached config found, using local settings.');
        }
    }
} else {
    console.log('[PowerLobster] No relay_id configured, skipping config sync');
}
// --- END CONFIG SYNC ---
```

### File: [src/client.ts](src/client.ts)

**Location:** `PowerLobsterClient` class.

```typescript
async getRelayConfig() {
    if (!this.config.relayId || !this.config.relayApiKey) {
        // Can't sync without credentials
        return null;
    }

    // Call GET /api/v1/agent/:relay_id/config
    // 5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(
            `${RELAY_BASE_URL}/agent/${this.config.relayId}/config`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.relayApiKey}`
                },
                signal: controller.signal
            }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch relay config: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}
```

---

## 2. Feature: Metadata Preservation

**Objective:** Pass the `_meta` field from incoming Relay events into the OpenClaw event payload so agents can see delivery details.

### File: [src/channel.ts](src/channel.ts)

**Location:** `handleEvent` method.

1.  **Extract Metadata:**
    ```typescript
    const eventMeta = event._meta || {}; // Extract metadata
    ```

2.  **Pass to Payload:**
    ```typescript
    await ctx.sendEvent({
        type: 'message',
        // ...
        payload: {
            text: content,
            // ...
            metadata: {
                delivery_method: eventMeta.delivery_method || 'unknown',
                ...eventMeta
            }
        },
    });
    ```

---

## 3. Feature: Execution Result Reporting

**Objective:** Report the success or failure of event processing back to the Relay so it can update its dashboard.

### File: [src/client.ts](src/client.ts)

**Location:** `PowerLobsterClient` class.

```typescript
async reportEventResult(eventId: string, result: { status: 'success' | 'failed'; error_reason?: string | null }) {
    // Call Relay API to report execution result
    if (!this.config.relayId || !this.config.relayApiKey) {
        console.warn('[PowerLobster] Cannot report event result: missing relay credentials');
        return;
    }

    return this.request(
        `${RELAY_BASE_URL}/events/${eventId}/result`,
        'POST',
        {
            ...result,
            executed_at: new Date().toISOString()
        },
        true // useRelayAuth
    ).catch(err => {
        // Don't crash if reporting fails, just log it
        console.error(`[PowerLobster] Failed to report event result for ${eventId}:`, err);
    });
}
```

### File: [src/channel.ts](src/channel.ts)

**Location:** `handleEvent` method.

1.  **Report Success:**
    ```typescript
    // Report Success to Relay
    if (eventId) {
        const client = this.clients.get(accountId);
        if (client) {
            await client.reportEventResult(eventId, { status: 'success' });
        }
    }
    ```

2.  **Report Failure:**
    ```typescript
    } catch (err: any) {
        console.error(`[PowerLobster] Failed to handle event ${eventId}:`, err);
        
        // Report Failure to Relay
        if (eventId) {
            const client = this.clients.get(accountId);
            if (client) {
                // Detect Error Reason
                let reason = 'error';
                const msg = err.message?.toLowerCase() || '';
                
                if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
                    reason = 'rate_limit';
                } else if (msg.includes('timeout') || msg.includes('etimedout')) {
                    reason = 'timeout';
                } else if (msg.includes('network') || msg.includes('connection')) {
                    reason = 'offline';
                }
                
                await client.reportEventResult(eventId, { 
                    status: 'failed', 
                    error_reason: reason 
                });
            }
        }
        // Rethrow for logs/internal handlers
        throw err;
    }
    ```

---

## 4. Feature: Fix Type Definitions

**Objective:** Add missing methods to TypeScript interfaces to prevent linter errors.

### File: [src/types.ts](src/types.ts)

**Location:** `ChannelGatewayContext` interface.

```typescript
export interface ChannelGatewayContext<ResolvedAccount = any> {
  // ... existing fields
  
  // Add sendEvent definition which was missing
  sendEvent: (event: {
      type: string;
      source: { channel: string; account: string; peer: string };
      payload: { text: string; files?: any[]; metadata?: any };
  }) => Promise<void>;
}
```
