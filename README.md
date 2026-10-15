# Arch

Cursor and Grok Bot plugin with two MCP tools:

- `arch_review` — paid theological review of faith, Scripture, or doctrinal text
- `kjv_lookup` — free, offline King James verse lookup from text bundled in this plugin

**Arch endpoint:** `POST https://arch.tnvolman.com/v1/review`  
**Auth (arch_review only):** `X-API-Key` from the plugin variable `ARCH_API_KEY` (each end user supplies their own key)  
**Homepage:** https://arch.tnvolman.com

`kjv_lookup` does not use the key, does not call the network, and does not charge.

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

The plugin stores only the variable name. The key stays in the client configuration and is passed to the server as `ARCH_API_KEY`. `arch_review` fails closed when the key is missing. `kjv_lookup` never reads it.

## Cost

Every paid `arch_review` is **$2.00 or less**, charged at your tier: Starter $2.00, Growth $1.75, Scale $1.50, Enterprise custom. There is no subscription.

`kjv_lookup` is free.

## Skills

Skills live in `skills/*/SKILL.md`.

| Skill | What it does |
| --- | --- |
| Check a sermon before publishing | One `arch_review` of the sermon before it is published or preached. |
| Review a devotional | One `arch_review` of a devotional, daily reading, or email devotion before it is published. |
| Review a Bible study or Sunday school lesson | The user pastes the lesson text. One `arch_review` per lesson. Arch reviews the theology of the text only. Warn that each review costs $2, ask before more than 3 reviews in a batch, then summarize the fixes. |
| Arch theological review | The general review skill for other faith, Scripture, or doctrinal text. |

A failed review is not retried, and a long text is not split into extra paid calls, unless the user agrees to another charge.

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

`kjv_lookup` is separate. A bad reference returns an error and no verse text. It does not change `arch_review`.

## Tool: arch_review

Request:

| Field | Required | Notes |
| --- | --- | --- |
| `text` | yes | string, at most 50000 characters |
| `max_tokens` | no | number |
| `payment_method_id` | no | legacy |
| `idempotency_key` | no | also sent as the `Idempotency-Key` header |

Success body fields: `review`, `passed`, `suggestions`, `charge_id`, `billing_status`, `meta`.

## Tool: kjv_lookup

Offline lookup of the public-domain King James Version (1769). No network call, no API key, and no charge. It returns verse wording only. It does not review theology; use `arch_review` for that.

| Field | Required | Notes |
| --- | --- | --- |
| `ref` | yes | `"John 3:16"`, a same-chapter range such as `"Romans 8:28-30"`, a numbered book such as `"1 John 4:8"`, or a common abbreviation such as `"Jn 3:16"`, `"Rom 8:28"`, or `"1 Cor 13:4"` |

Success fields: `reference`, `translation`, `edition`, `book`, `chapter`, `verse_start`, `verse_end`, and `verses` (`verse`, `text`).

A reference that cannot be read, an unknown book, a missing chapter, or a missing verse returns a clear error. Ranges stay inside one chapter.

### KJV text source

Bundled file: `server/data/kjv.json` (**4,248,786 bytes**). 66 books, 31,102 verses, no Apocrypha.

The text is the 1769 King James Version, which is in the public domain. It comes from [farskipper/kjv](https://github.com/farskipper/kjv) `json/verses-1769.json` at commit `8f06584d580a767425d7d4b4c314b967e6d45ab5`. That repository's [LICENSE](https://github.com/farskipper/kjv/blob/master/LICENSE) is The Unlicense, a public-domain dedication with no license restrictions, and its README says "Public Domain."

This plugin stores a compact copy of that verse text. A leading `#` paragraph marker was removed from verses that had one. Words the source marks as italics stay in square brackets, for example `[his]`. The source titles Song of Solomon as "Solomon's Song"; lookup accepts both, and the book name it returns is "Song of Solomon".

## Tests

```sh
node --test
```

`npm test` runs the same command. The tests do not call Arch.

## What this plugin does not do

It does not call or wrap `/api/arch/review`, `/arch/request-access`, billing setup, the dashboard, admin or internal routes, or `api.arch.tnvolman.com`.

`kjv_lookup` does not call Arch. `arch_review` reviews the theology of text only.

## License

MIT. See [LICENSE](LICENSE). The bundled King James text is public domain, as noted above.
