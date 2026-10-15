---
name: arch-review
description: >-
  Run faith, Scripture, or doctrinal content through Arch before publishing it.
  Use for sermons, devotionals, Bible teaching, or doctrine. Each paid review
  costs $2.00 or less — do not call Arch for other text or to retry a failure.
---

# Arch theological review

Before publishing faith, Scripture, or doctrinal content, call the MCP tool `arch_review`. Report the verdict exactly as Arch returns it. If the tool errors, do not publish and do not invent a verdict.

## Cost

Each paid review is **$2.00 or less** (Starter $2.00, Growth $1.75, Scale $1.50, Enterprise custom).

## Call

`arch_review` uses the plugin variable `ARCH_API_KEY` (each end user's own key, sent as `X-API-Key`).

- `text` (required, at most 50000 characters)
- `max_tokens` (optional)
- `payment_method_id` (optional)
- `idempotency_key` (optional; also sent as the `Idempotency-Key` header)

On success, report only the returned fields: `review`, `passed`, `suggestions`, `charge_id`, `billing_status`, and `meta`. Do not rewrite them into a different verdict.

## Fail closed

A missing `ARCH_API_KEY`, HTTP 401, 400, 402, 429, 503, any other non-2xx, or a network failure is an error. Do not publish. Do not fill in `passed`, `review`, or `suggestions`.

The only endpoint is `POST https://arch.tnvolman.com/v1/review`.
