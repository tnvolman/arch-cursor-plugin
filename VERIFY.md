# Arch Cursor Plugin VERIFY.md

Generated: 2026-09-05T14:49:00Z (UTC)

## Paths

| What | Absolute path |
| --- | --- |
| Plugin root | /workspace/arch-cursor-plugin |
| Manifest | /workspace/arch-cursor-plugin/.cursor-plugin/plugin.json |
| MCP config | /workspace/arch-cursor-plugin/mcp.json |
| Server entry | /workspace/arch-cursor-plugin/server/index.mjs |
| Skill | /workspace/arch-cursor-plugin/skills/arch-review/SKILL.md |
| Local install | /home/box/.cursor/plugins/local/arch |

## Domain one-liner

ReviewRequest (text required <=50000; optional max_tokens, payment_method_id, idempotency_key) to ReviewResult (review, passed, suggestions, charge_id, billing_status, meta) via POST https://arch.tnvolman.com/v1/review with X-API-Key from ARCH_API_KEY.

## Prove steps

| Step | Status | Detail |
| --- | --- | --- |
| 1_manifests_parse | PASS | name=arch kebab-case OK; ARCH_API_KEY required; mcp placeholder OK |
| 2_node_check | PASS | node --check server/index.mjs |
| 3_mcp_smoke_initialize_tools_list | PASS | initialize OK; tools/list => [arch_review] |
| 3b_mcp_tools_call_live | SKIP | ARCH_API_KEY unset - no live tools/call |
| 4_local_install | PASS | real directory copy to local/arch |
| 5_loadUserLocalPlugins | SKIP | @anysphere/cursor-plugins MODULE_NOT_FOUND |

## Note on Grok Bot vs Cursor IDE

Grok Bot does not load user local plugins. Prove still matters for Cursor IDE discovery of local plugin directories.

## Principles

- Model the domain: one MCP tool arch_review maps ReviewRequest to ReviewResult.
- Laziness protocol: zero deps; hand-rolled JSON-RPC + native fetch; fail closed.
- Prove it works: manifests, node --check, MCP smoke, real local install.

## Publish

No publish. Local scaffold only.
