# Action Plan: Debugging Webhook Signature Mismatch

**To:** OpenClaw / Relay Team
**From:** PowerLobster Channel Plugin Agent
**Subject:** Debugging Strategy for Persistent Signature Verification Failures

We have implemented the HMAC-SHA256 signature verification exactly as specified in the Relay documentation, yet all webhooks are failing with `Signature mismatch`.

Since the algorithm code matches, the issue is almost certainly a difference in the **input data** being signed vs. verified. Specifically, the `rawBody` string on the plugin side likely differs from the body string the Relay used to generate the signature (e.g., whitespace, encoding, JSON serialization differences).

## Proposed Debugging Strategy

I recommend we temporarily enable verbose logging in `src/webhook.ts` to capture the exact inputs used for verification. This will allow us to compare them character-for-character with what the Relay is sending.

### 1. Code Modification for Debugging

Please apply the following changes to `src/webhook.ts` to inspect the signature components.

**Current Code:**
```typescript
    // 3. Constant-time comparison to prevent timing attacks
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedFull),
        Buffer.from(signatureHeader)
      );
      
      if (!isValid) {
        return { valid: false, error: 'Signature mismatch' };
      }
```

**Proposed Debugging Code:**
```typescript
    // DEBUG LOGGING START
    if (this.secret) {
        console.log(`[PowerLobster Debug] Verifying Signature:`);
        console.log(`[PowerLobster Debug] Secret (first 3 chars): ${this.secret.substring(0, 3)}...`);
        console.log(`[PowerLobster Debug] Timestamp: ${timestampHeader}`);
        console.log(`[PowerLobster Debug] Received Signature: ${signatureHeader}`);
        console.log(`[PowerLobster Debug] Computed Signature: ${expectedFull}`);
        console.log(`[PowerLobster Debug] Raw Body Length: ${rawBody.length}`);
        console.log(`[PowerLobster Debug] Raw Body Preview (first 50): ${rawBody.substring(0, 50)}`);
        // console.log(`[PowerLobster Debug] Full Raw Body: ${JSON.stringify(rawBody)}`); // Uncomment if needed
    }
    // DEBUG LOGGING END

    // 3. Constant-time comparison to prevent timing attacks
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedFull),
        Buffer.from(signatureHeader)
      );
      
      if (!isValid) {
        return { 
            valid: false, 
            error: `Signature mismatch. Expected: ${expectedFull}, Got: ${signatureHeader}` 
        };
      }
```

### 2. Verification Steps

1.  **Deploy the plugin** with these logging changes.
2.  **Trigger a test webhook** from the Relay.
3.  **Check the logs**.
    *   **Does the Computed Signature match the Received Signature?**
        *   **Yes:** The `timingSafeEqual` or buffer comparison might be failing on length or encoding?
        *   **No:** The input data (`secret`, `timestamp`, `rawBody`) is different.
    *   **Check the Body:** Is the `Raw Body` exactly what the Relay sent? Cloudflare tunnels or proxies sometimes modify the body (e.g., stripping whitespace, re-serializing JSON).
    *   **Check the Secret:** Is the secret loaded correctly?

### 3. Common Pitfalls to Check

*   **JSON Serialization:** If the Relay signs `{"a":1, "b":2}` but the network layer re-orders it to `{"b":2, "a":1}` or adds spaces `{"a": 1, "b": 2}`, the signature will fail. The signature MUST be verified against the **exact raw bytes** received on the wire, not a re-serialized object. (Our code correctly uses `Buffer.concat` to get the raw stream, so this should be safe *unless* OpenClaw framework itself modifies the stream before we get it).
*   **Timestamp Type:** Confirm the Relay sends the timestamp in **milliseconds** (e.g., `1710514000000`) and not seconds. Our code assumes it's a number that can be parsed.
*   **Encoding:** Ensure `rawBody` is treated as UTF-8.

Let me know if you would like me to apply these logging changes immediately.
