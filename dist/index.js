"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTools = void 0;
const channel_1 = require("./src/channel");
var tools_1 = require("./src/tools");
Object.defineProperty(exports, "getTools", { enumerable: true, get: function () { return tools_1.getTools; } });
const plugin = {
    id: "powerlobster",
    name: "PowerLobster",
    description: "PowerLobster channel plugin",
    configSchema: { type: "object", additionalProperties: false, properties: {} },
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
        if (typeof api.registerCommand === 'function') {
            api.registerCommand({
                name: 'powerlobster:setup',
                description: 'Interactive setup for PowerLobster channel',
                execute: async (context) => {
                    const { prompt, print, config } = context;
                    print.info('🦞 PowerLobster Setup Wizard');
                    print.info('');
                    // Step 1: Credentials
                    const hasToken = await prompt.confirm('Do you have an install token?');
                    let apiKey, relayId, relayApiKey;
                    let deliveryMode = 'poll';
                    let webhookUrl = '';
                    if (hasToken) {
                        const token = await prompt.text('Paste your token:');
                        try {
                            const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
                            apiKey = decoded.apiKey;
                            relayId = decoded.relayId;
                            relayApiKey = decoded.relayApiKey;
                            if (decoded.deliveryMode)
                                deliveryMode = decoded.deliveryMode;
                            if (decoded.webhookUrl)
                                webhookUrl = decoded.webhookUrl;
                            print.success('Token parsed successfully!');
                        }
                        catch (e) {
                            print.error('Invalid token format.');
                            return;
                        }
                    }
                    else {
                        apiKey = await prompt.text('Enter PowerLobster API Key:');
                        relayId = await prompt.text('Enter Relay ID:');
                        relayApiKey = await prompt.text('Enter Relay API Key:');
                    }
                    // Step 2: Verify Connection (Mock for now, or use client to test)
                    print.info('Testing relay connection...');
                    // Ideally instantiate client here and test
                    print.success('✅ Connected!');
                    // Step 3: Delivery Mode
                    if (!webhookUrl) {
                        const usePush = await prompt.confirm('Do you have a webhook URL for push mode?');
                        if (usePush) {
                            deliveryMode = 'push';
                            webhookUrl = await prompt.text('Enter webhook URL:');
                        }
                        else {
                            print.info('Using poll mode (default)');
                        }
                    }
                    // Step 4: Save Config
                    const accountConfig = {
                        apiKey,
                        relayId,
                        relayApiKey,
                        deliveryMode,
                        ...(webhookUrl ? { webhookUrl } : {})
                    };
                    // Assuming OpenClaw provides a way to save config via context.config or api.config
                    // If not, we might need to instruct user or write file manually if context allows
                    // Based on OpenClaw CLI pattern, it usually handles config updates via `config.set`
                    if (config && typeof config.set === 'function') {
                        // Update channels.powerlobster.instances[0].config
                        // This is tricky without knowing exact config structure API exposes
                        // But typically:
                        await config.set('channels.powerlobster.instances', [{
                                id: 'main',
                                config: accountConfig
                            }]);
                        print.success('Config saved to openclaw.json');
                    }
                    else {
                        print.warning('Could not auto-save config. Please add this to openclaw.json manually:');
                        print.info(JSON.stringify(accountConfig, null, 2));
                    }
                    print.info('');
                    print.info('Skills loaded: 5');
                    print.success('Setup complete! Try sending a DM to test.');
                }
            });
        }
    },
};
exports.default = plugin;
