---
name: review-church-website-pages
description: >-
  Review the theology of church website page text before publishing. Use when
  the user wants pages of a church site checked. Fetch each page or use text
  the user pastes, then one arch_review call per page. Warn that each review
  costs $2, and ask before any batch of more than 3 pages. Arch reviews the
  theology of the text only, not design. Then summarize the fixes.
---

# Review church website pages

Arch reviews the **theology of the text only**. It does not review design, layout, colors, images, navigation, accessibility, or branding. Say that when you start and again in the summary.

## Pages

For each page, get the words on that page. Fetch the page and use its text, or use text the user pastes. If a fetch fails, ask the user to paste the text. Do not invent page text.

One page is one body of text. Do not combine pages into one `arch_review` call. Do not send design notes in place of the words.

If a page is longer than 50000 characters, say so and ask how to split it before calling Arch. Do not truncate it silently, and do not turn the split into extra paid calls unless the user agrees.

## Cost

Each `arch_review` call is one paid review and costs **$2** (Starter $2.00; every paid review is $2.00 or less: Growth $1.75, Scale $1.50, Enterprise custom).

Warn that each review costs $2 before you call Arch.

If the batch is **more than 3 pages**, stop and ask before any of those reviews run. Wait for a yes. A user who has already confirmed that larger batch and its cost does not need to be asked twice. A batch of 1 to 3 still gets the $2-per-review warning.

Do not retry a failed call unless the user agrees to another charge.

## Review

Call `arch_review` once per page with that page's text.

- `text` (required, at most 50000 characters)
- `max_tokens` (optional)
- `payment_method_id` (optional)
- `idempotency_key` (optional; also sent as the `Idempotency-Key` header)

`arch_review` uses `ARCH_API_KEY`. On success, keep that page's `review`, `passed`, `suggestions`, `charge_id`, `billing_status`, and `meta`. Do not rewrite the verdict.

## Fail closed

A missing `ARCH_API_KEY`, HTTP 401, 400, 402, 429, 503, any other non-2xx, or a network failure is an error for that page. Do not publish that page. Do not fill in `passed`, `review`, or `suggestions`. Continue only with pages the user still wants reviewed.

The only review endpoint is `POST https://arch.tnvolman.com/v1/review`.

## Summarize fixes

After the reviews that completed, summarize the fixes. Group them by page. Use that page's `suggestions` and `review`. Include whether the page `passed`. Do not add theological fixes Arch did not return. State again that the review covered the theology of the text only, not the design of the site.

`kjv_lookup` can quote a King James verse offline, at no charge. It is not a theological review and does not replace `arch_review`.
