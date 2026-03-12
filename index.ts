
import { powerLobsterChannel } from './src/channel';
import { getTools } from './src/tools'; // Re-add import
export { getTools } from './src/tools';

import { createCliRegistrar } from './src/cli';

const plugin = {
  id: "powerlobster",
  name: "PowerLobster",
  description: "PowerLobster channel plugin",
  configSchema: {
    type: "object",
    additionalProperties: true,
    properties: {
      apiKey: {
        type: "string"
      },
      deliveryMode: {
        type: "string",
        enum: [
          "push",
          "poll"
        ],
        default: "push"
      }
    }
  },
  uiHints: {
    apiKey: {
      label: "PowerLobster API Key",
      sensitive: true,
      placeholder: "plk_...",
      help: "Get from powerlobster.com → Agent Settings → API Key"
    },
    deliveryMode: {
      label: "Delivery Mode",
      help: "push (recommended) or poll"
    }
  },
  register(api: any) {
    api.registerChannel({ plugin: powerLobsterChannel });
    
    // Register webhook route
    if (typeof api.registerHttpRoute === 'function') {
        api.registerHttpRoute({
            path: '/powerlobster/webhook',
            auth: 'plugin', // Allow external calls without OpenClaw token
            handler: async (req: any, res: any) => {
                // Ensure it's a POST
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.end('Method Not Allowed');
                    return true;
                }
                
                try {
                    await powerLobsterChannel.handleWebhook(req);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ status: 'received' }));
                    return true;
                } catch (err: any) {
                    console.error('[PowerLobster] Webhook error:', err);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: err.message }));
                    return true;
                }
            }
        });
        console.log('[PowerLobster] Registered webhook route: /powerlobster/webhook');
    } else {
        console.warn('[PowerLobster] api.registerHttpRoute not available. Webhook mode may not work.');
    }
    
    // Register CLI command
    if (typeof api.registerCli === 'function') {
        api.registerCli(createCliRegistrar(api));
    }
  },
};

export default plugin;
