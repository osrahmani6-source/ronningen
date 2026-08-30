---
name: API and database compatibility
description: Compatibility notes for the generated API validation and development database schema workflow.
---

Generated response validation currently targets the workspace's Zod 3 runtime, so OpenAPI numeric fields should use `number` rather than `integer` to avoid generating unsupported `z.int()` calls.

**Why:** The installed validator package does not expose the newer integer helper, while Orval emits it for OpenAPI integer schemas.

**How to apply:** Keep API money values in whole NOK at the response boundary, but store money as integer øre in database columns and convert only in the server mapping layer. For development schema renames, use explicit database SQL when Drizzle push cannot resolve a non-interactive rename prompt.