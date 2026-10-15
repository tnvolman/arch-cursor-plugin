---
name: check-a-sermon-before-publishing
description: >-
  Check a sermon before publishing or preaching it. Use when the user has a
  sermon, homily, or message they want reviewed first. Call arch_review once
  on the sermon text. Each paid review costs $2.00 or less. If Arch errors,
  do not publish and do not invent a verdict.
---

# Check a sermon before publishing

Before the sermon is published or preached, call `arch_review` once with the sermon text. Report the verdict exactly as Arch returns it. If the tool errors, do not publish and do not invent a verdict.

## Cost

Each paid review is **$2.00 or less** (Starter $2.00, Growth $1.75, Scale $1.50, Enterprise custom). One sermon is one review. Do not split the sermon into extra reviews, and do not retry a failed call, unless the user agrees to another charge.

## Call

`arch_review` uses the plugin variable `ARCH_API_KEY` (each end user's own key, sent as `X-API-Key`).

Send the sermon the user supplied: the manuscript, or the words they will preach. If it is longer than 50000 characters, say so and ask how to split it. Do not truncate it silently.

- `text` (required, at most 50000 characters)
- `max_tokens` (optional)
- `payment_method_id` (optional)
- `idempotency_key` (optional; also sent as the `Idempotency-Key` header)

On success, report only the returned fields: `review`, `passed`, `suggestions`, `charge_id`, `billing_status`, and `meta`. Do not rewrite them into a different verdict.

## Fail closed

A missing `ARCH_API_KEY`, HTTP 401, 400, 402, 429, 503, any other non-2xx, or a network failure is an error. Do not publish. Do not fill in `passed`, `review`, or `suggestions`.

The only review endpoint is `POST https://arch.tnvolman.com/v1/review`.

`kjv_lookup` can quote a King James verse offline, at no charge. It is not a theological review and does not replace `arch_review`.
