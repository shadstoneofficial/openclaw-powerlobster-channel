# Channel Interface Specification

## 1. Channel Interface Definition

In OpenClaw, a channel is not defined by a single monolithic class but by a **ChannelPlugin** object that aggregates various adapters. To implement a channel, you define a plugin that provides implementations for these adapters.

### Core Structure

The main entry point is the `ChannelPlugin` interface defined in `src/channels/plugins/types.plugin.ts`.

```typescript
export type ChannelPlugin<ResolvedAccount = any> = {
  id: ChannelId;             // Unique identifier (e.g., "telegram", "discord")
  meta: ChannelMeta;         // Metadata (name, version, icon, etc.)
  capabilities: ChannelCapabilities; // What the channel supports (text, media, etc.)
  
  // Key Adapters
  config: ChannelConfigAdapter<ResolvedAccount>; // Configuration management
  gateway?: ChannelGatewayAdapter<ResolvedAccount>; // Connection handling (connect/disconnect)
  outbound?: ChannelOutboundAdapter; // Message sending (send)
  // ... other optional adapters (onboarding, pairing, etc.)
};
```

### Key Methods Mapping

The classic `connect`, `disconnect`, and `send` operations map to specific adapter methods in `src/channels/plugins/types.adapters.ts`.

#### 1. Connect (`gateway.startAccount`)
Initializes the connection to the platform (e.g., starts WebSocket, polls API).

```typescript
// In ChannelGatewayAdapter
startAccount?: (ctx: ChannelGatewayContext<ResolvedAccount>) => Promise<unknown>;
```

#### 2. Disconnect (`gateway.stopAccount`)
Gracefully shuts down the connection and cleans up resources.

```typescript
// In ChannelGatewayAdapter
stopAccount?: (ctx: ChannelGatewayContext<ResolvedAccount>) => Promise<void>;
```

#### 3. Send (`outbound.sendText` / `outbound.sendMedia`)
Handles sending messages. The `ChannelOutboundAdapter` provides specialized methods.

```typescript
// In ChannelOutboundAdapter
sendText?: (ctx: ChannelOutboundContext) => Promise<OutboundDeliveryResult>;
sendMedia?: (ctx: ChannelOutboundContext) => Promise<OutboundDeliveryResult>;
sendPayload?: (ctx: ChannelOutboundPayloadContext) => Promise<OutboundDeliveryResult>;
```

---

## 2. Event to Agent Mapping

Incoming events are mapped to an `agent_id` through the **Routing System**. This logic is centralized in `src/routing/resolve-route.ts`.

### Routing Logic (`resolveAgentRoute`)

When an event is received, the channel implementation must call the routing logic to determine which agent should handle it.

**Input (`ResolveAgentRouteInput`):**
- `channel`: The channel ID (e.g., "discord").
- `accountId`: The specific account ID receiving the event.
- `peer`: The sender or chat context (ID and type, e.g., "group:123").
- `guildId` / `teamId`: Optional grouping identifiers.

**Resolution Process:**
The system evaluates `bindings` configured in `openclaw.yaml` in a strict priority order:

1.  **Peer Binding**: Specific user or group ID matches.
2.  **Thread Inheritance**: Matches parent channel/group binding for threads.
3.  **Guild/Team Binding**: Matches Discord guild or Slack team.
4.  **Account Binding**: Matches all events for a specific bot account.
5.  **Channel Binding**: Matches all events for the channel type.
6.  **Default**: Falls back to the default agent (usually "main").

### Output (`ResolvedAgentRoute`)

The routing function returns a `ResolvedAgentRoute` object containing:
- `agentId`: The target agent ID.
- `sessionKey`: A unique key for the conversation session (e.g., `agent:main:discord:channel:123`).

### Implementation Requirement

Your channel's gateway must:
1.  Receive an incoming event.
2.  Extract context (sender, chat ID, etc.).
3.  Call `resolveAgentRoute` (or use the helper `ctx.channelRuntime.routing` if available).
4.  Dispatch the event to the returned `agentId`.
