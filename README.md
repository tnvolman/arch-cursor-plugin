# Arch

Cursor and Grok Bot plugin that wraps the live Arch theological review API as one MCP tool, `arch_review`.

**Endpoint:** `POST https://arch.tnvolman.com/v1/review`  
**Auth:** `X-API-Key` from the plugin variable `ARCH_API_KEY` (each end user supplies their own key)  
**Homepage:** https://arch.tnvolman.com

## Install

Install this repository as a Cursor or Grok Bot plugin (marketplace listing, or a local plugin directory that contains `.cursor-plugin/plugin.json`).

The plugin starts a zero-dependency Node stdio server:

```json
{
  "mcpServers": {
    "arch": {
      "command": "node",
      "args": ["./server/index.mjs"],
      "env": {
        "ARCH_API_KEY": "${ARCH_API_KEY}"
      }
    }
  }
}
```

Node.js 18 or newer is required (`fetch` is built in). There are no npm dependencies.

## Configure ARCH_API_KEY

1. Get an API key at [arch.tnvolman.com](https://arch.tnvolman.com). A key is issued on that site; attach a card there before paid reviews.
2. In the plugin dashboard, open **Plugins → Arch → Configure**.
3. Set **Arch API Key** (`ARCH_API_KEY`).

The plugin stores only the variable name. The key stays in the client configuration and is passed to the server as `ARCH_API_KEY`.

## Cost

Every paid review is **$2.00 or less**. There is no subscription in this plugin. A call with no card on file, or a declined card, returns HTTP 402 and is not a free review.

Do not call `arch_review` for non-theological text. A failed call is not a pass; do not retry it just to obtain one.

## Fail closed

`arch_review` returns an error, and never a made-up verdict, when:

- `ARCH_API_KEY` is missing or empty
- Arch returns any non-2xx status
  - **401** bad API key
  - **400** bad text
  - **402** no payment method, or payment declined
  - **429** rate limit (60 requests per minute)
  - **503** upstream unavailable
- the network fails, or a 2xx body is not JSON

On an error, do not publish the content and do not invent `passed`, `review`, or `suggestions`.

## Tool: arch_review

Request:

| Field | Required | Notes |
| --- | --- | --- |
| `text` | yes | string, at most 50000 characters |
| `max_tokens` | no | number |
| `payment_method_id` | no | legacy |
| `idempotency_key` | no | also sent as the `Idempotency-Key` header |

Success body fields: `review`, `passed`, `suggestions`, `charge_id`, `billing_status`, `meta`.

## What this plugin does not do

It does not call or wrap `/api/arch/review`, `/arch/request-access`, billing setup, the dashboard, admin or internal routes, or `api.arch.tnvolman.com`.

## License

MIT. See [LICENSE](LICENSE).
