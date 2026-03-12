"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTools = void 0;
const channel_1 = require("./src/channel");
var tools_1 = require("./src/tools");
Object.defineProperty(exports, "getTools", { enumerable: true, get: function () { return tools_1.getTools; } });
const cli_1 = require("./src/cli");
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
    register(api) {
        api.registerChannel({ plugin: channel_1.powerLobsterChannel });
        // Register webhook route
        if (typeof api.registerHttpRoute === 'function') {
            api.registerHttpRoute({
                path: '/powerlobster/webhook',
                auth: 'plugin', // Allow external calls without OpenClaw token
                handler: async (req, res) => {
                    // Ensure it's a POST
                    if (req.method !== 'POST') {
                        res.statusCode = 405;
                        res.end('Method Not Allowed');
                        return true;
                    }
                    try {
                        await channel_1.powerLobsterChannel.handleWebhook(req);
                        res.statusCode = 200;
                        res.end(JSON.stringify({ status: 'received' }));
                        return true;
                    }
                    catch (err) {
                        console.error('[PowerLobster] Webhook error:', err);
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err.message }));
                        return true;
                    }
                }
            });
            console.log('[PowerLobster] Registered webhook route: /powerlobster/webhook');
        }
        else {
            console.warn('[PowerLobster] api.registerHttpRoute not available. Webhook mode may not work.');
        }
        // Register CLI command
        if (typeof api.registerCli === 'function') {
            api.registerCli((0, cli_1.createCliRegistrar)(api));
        }
    },
};
exports.default = plugin;
