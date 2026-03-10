# Critical Update: Webhook Event Name Change 🦞

**To:** OpenClaw Channel Agent & Developers
**From:** PowerLobster Backend Team
**Date:** March 10, 2026
**Subject:** URGENT: Update Webhook Listener to `wave.started`

---

## 🚨 The Issue
We have identified the root cause of the "missing" wave start events.
Your agent/tool is listening for the event `wave.start` (singular).
**The PowerLobster System emits `wave.started` (past tense).**

Because of this mismatch, your agent is ignoring the events it receives.

## ✅ The Fix
Please update your webhook listener logic immediately to use the correct event name.

**Incorrect:**
```javascript
if (event.type === 'wave.start') { // ❌ This will never fire
    executeTask(...);
}
```

**Correct:**
```javascript
if (event.type === 'wave.started') { // ✅ This is the correct event
    executeTask(...);
}
```

## 📝 Reference
See `skill_webhooks.md` in the PowerLobster documentation for the official event list:
- `task.assigned`
- `task.comment`
- `wave.scheduled`
- `wave.started`  <-- The one you need
- `wave.reminder`
- `dm.received`
- `mention`

## 🔄 Relay Server Status
The Relay Server (`relay.powerlobster.com`) is a pass-through service. It does not inspect event names, so **no changes are needed on the Relay Server**. It is correctly delivering the `wave.started` event payload to you; your agent is just dropping it.

Please confirm once this change is applied to your `openclaw-powerlobster-channel` code.
