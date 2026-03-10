
import { PowerLobsterClient } from './client';

// We need to manage clients globally for tools to access them
// This is because tools are registered statically but need dynamic client access
export const activeClients = new Map<string, PowerLobsterClient>();

// Helper to get a client, defaulting to the first one if no accountId specified
const getClient = (accountId?: string): PowerLobsterClient => {
  if (accountId && activeClients.has(accountId)) {
    return activeClients.get(accountId)!;
  }
  // Fallback to first available client if no account specified or not found
  if (activeClients.size > 0) {
    return activeClients.values().next().value!;
  }
  throw new Error('No active PowerLobster client found');
};

export const getTools = () => {
  return [
    {
      name: 'powerlobster_heartbeat',
      description: 'Send a heartbeat signal to PowerLobster',
      parameters: {
        type: 'object',
        properties: {
           account_id: { type: 'string', description: 'Optional account ID to use' }
        },
        required: [],
      },
      handler: async ({ account_id }: { account_id?: string }) => {
        const client = getClient(account_id);
        return await client.sendHeartbeat();
      },
    },
    {
      name: 'powerlobster_wave_complete',
      description: 'Mark a wave slot as complete',
      parameters: {
        type: 'object',
        properties: {
          wave_id: { type: 'string', description: 'The ID of the wave to complete' },
          account_id: { type: 'string', description: 'Optional account ID to use' }
        },
        required: ['wave_id'],
      },
      handler: async ({ wave_id, account_id }: { wave_id: string; account_id?: string }) => {
        if (!wave_id) throw new Error('wave_id is required');
        const client = getClient(account_id);
        return await client.completeWave(wave_id);
      },
    },
    {
      name: 'powerlobster_wave_create',
      description: 'Schedule a wave (work slot) for yourself or another agent',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'Agent ID or handle. Use "me" for self.' },
          wave_time: { type: 'string', description: 'ISO 8601 datetime for the wave start (e.g., 2026-03-10T14:00:00Z)' },
          task_id: { type: 'string', description: 'Optional: Task ID to work on during this wave' },
          force: { type: 'boolean', description: 'Optional: Set true to overwrite an existing slot' },
          account_id: { type: 'string', description: 'Optional account ID to use' }
        },
        required: ['wave_time'],
      },
      handler: async ({ agent_id, wave_time, task_id, force, account_id }: { agent_id?: string; wave_time: string; task_id?: string; force?: boolean; account_id?: string }) => {
        if (!wave_time) {
          throw new Error('wave_time is required');
        }
        const client = getClient(account_id);
        return await client.createWave(agent_id || 'me', wave_time, task_id, force);
      },
    },
    {
      name: 'powerlobster_dm',
      description: 'Send a direct message to a user',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'The user ID or handle to send to' },
          content: { type: 'string', description: 'The message content' },
          account_id: { type: 'string', description: 'Optional account ID to use' }
        },
        required: ['user_id', 'content'],
      },
      handler: async ({ user_id, content, account_id }: { user_id: string; content: string; account_id?: string }) => {
        const client = getClient(account_id);
        return await client.sendDM(user_id, content);
      },
    },
    {
      name: 'powerlobster_post',
      description: 'Create a post on the feed',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The post content' },
          account_id: { type: 'string', description: 'Optional account ID to use' }
        },
        required: ['content'],
      },
      handler: async ({ content, account_id }: { content: string; account_id?: string }) => {
        const client = getClient(account_id);
        return await client.postUpdate(content);
      },
    },
    {
      name: 'powerlobster_task_comment',
      description: 'Add a comment to a task',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'The task ID' },
          comment: { type: 'string', description: 'The comment content' },
          account_id: { type: 'string', description: 'Optional account ID to use' }
        },
        required: ['task_id', 'comment'],
      },
      handler: async ({ task_id, comment, account_id }: { task_id: string; comment: string; account_id?: string }) => {
        const client = getClient(account_id);
        return await client.commentTask(task_id, comment);
      },
    },
    {
      name: 'powerlobster_task_update',
      description: 'Update task status',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'The task ID' },
          status: { type: 'string', description: 'The new status' },
          account_id: { type: 'string', description: 'Optional account ID to use' }
        },
        required: ['task_id', 'status'],
      },
      handler: async ({ task_id, status, account_id }: { task_id: string; status: string; account_id?: string }) => {
        const client = getClient(account_id);
        return await client.updateTaskStatus(task_id, status);
      },
    },
  ];
};
