---
name: review-a-devotional
description: >-
  Review a devotional before publishing it. Use for a devotional, daily
  reading, email devotion, or short meditation. Call arch_review once on that
  text. Each paid review costs $2.00. If Arch errors, do not publish
  and do not invent a verdict.
---

# Review a devotional

Before the devotional is published, call `arch_review` once with its text. Report the verdict exactly as Arch returns it. If the tool errors, do not publish and do not invent a verdict.

## Cost

Each paid review is $2.00. Volume pricing for businesses is by agreement: api@tnvolman.com. One devotional is one review. Do not split it into extra reviews, and do not retry a failed call, unless the user agrees to another charge.

## Call

`arch_review` uses the plugin variable `ARCH_API_KEY` (each end user's own key, sent as `X-API-Key`).

Send the devotional the user supplied. If it is longer than 50000 characters, say so and ask how to split it. Do not truncate it silently.

- `text` (required, at most 50000 characters)
- `max_tokens` (optional)
- `payment_method_id` (optional)
- `idempotency_key` (optional; also sent as the `Idempotency-Key` header)

On success, report only the returned fields: `review`, `passed`, `suggestions`, `charge_id`, `billing_status`, and `meta`. Do not rewrite them into a different verdict.

## Fail closed

A missing `ARCH_API_KEY`, HTTP 401, 400, 402, 429, 503, any other non-2xx, or a network failure is an error. Do not publish. Do not fill in `passed`, `review`, or `suggestions`.

The only review endpoint is `POST https://arch.tnvolman.com/v1/review`.

`kjv_lookup` can quote a King James verse offline, at no charge. It is not a theological review and does not replace `arch_review`.
