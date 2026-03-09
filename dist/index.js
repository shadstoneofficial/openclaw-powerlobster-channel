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
    },
};
exports.default = plugin;
