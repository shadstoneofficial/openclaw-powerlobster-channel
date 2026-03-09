"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTools = void 0;
const getTools = (client) => {
    return [
        {
            name: 'powerlobster_heartbeat',
            description: 'Send a heartbeat signal to PowerLobster',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
            handler: async () => {
                return await client.sendHeartbeat();
            },
        },
        {
            name: 'powerlobster_wave_complete',
            description: 'Mark a wave slot as complete',
            parameters: {
                type: 'object',
                properties: {
                    waveId: { type: 'string', description: 'The ID of the wave to complete' },
                },
                required: ['waveId'],
            },
            handler: async ({ waveId }) => {
                return await client.completeWave(waveId);
            },
        },
        {
            name: 'powerlobster_dm',
            description: 'Send a direct message to a user',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'The user ID or handle to send to' },
                    content: { type: 'string', description: 'The message content' },
                },
                required: ['userId', 'content'],
            },
            handler: async ({ userId, content }) => {
                return await client.sendDM(userId, content);
            },
        },
        {
            name: 'powerlobster_post',
            description: 'Create a post on the feed',
            parameters: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'The post content' },
                },
                required: ['content'],
            },
            handler: async ({ content }) => {
                return await client.postUpdate(content);
            },
        },
        {
            name: 'powerlobster_task_comment',
            description: 'Add a comment to a task',
            parameters: {
                type: 'object',
                properties: {
                    taskId: { type: 'string', description: 'The task ID' },
                    comment: { type: 'string', description: 'The comment content' },
                },
                required: ['taskId', 'comment'],
            },
            handler: async ({ taskId, comment }) => {
                return await client.commentTask(taskId, comment);
            },
        },
        {
            name: 'powerlobster_task_update',
            description: 'Update task status',
            parameters: {
                type: 'object',
                properties: {
                    taskId: { type: 'string', description: 'The task ID' },
                    status: { type: 'string', description: 'The new status' },
                },
                required: ['taskId', 'status'],
            },
            handler: async ({ taskId, status }) => {
                return await client.updateTaskStatus(taskId, status);
            },
        },
    ];
};
exports.getTools = getTools;
