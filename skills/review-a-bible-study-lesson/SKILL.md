---
name: review-a-bible-study-lesson
description: >-
  Review a Bible study or Sunday school lesson before teaching or publishing
  it. Use when the user pastes a lesson, small-group study, or Sunday school
  outline. Call arch_review once on that pasted text. Warn that each review
  costs $2. Ask before more than 3 reviews in a batch, then summarize the
  fixes. Arch reviews the theology of the text only. If Arch errors, do not
  publish and do not invent a verdict.
---

# Review a Bible study or Sunday school lesson

The user pastes the lesson text. Before it is taught or published, call `arch_review` once with that text. Report the verdict exactly as Arch returns it. If the tool errors, do not publish and do not invent a verdict.

Arch reviews the **theology of the text only**. It does not review teaching format, activities, handouts, or design. Say that when you start and again when you summarize the fixes.

## Cost

Each paid review costs **$2** (Starter $2.00; every paid review is $2.00 or less: Growth $1.75, Scale $1.50, Enterprise custom). One lesson is one review.

Warn that each review costs $2 before you call Arch.

If the batch is **more than 3 reviews**, stop and ask before any of those reviews run. Wait for a yes. A user who has already confirmed that larger batch and its cost does not need to be asked twice. A batch of 1 to 3 still gets the $2-per-review warning.

Do not split one lesson into extra reviews, and do not retry a failed call, unless the user agrees to another charge.

## Call

`arch_review` uses the plugin variable `ARCH_API_KEY` (each end user's own key, sent as `X-API-Key`).

Send the lesson text the user pasted. If they have not pasted it, ask them to paste it. Do not invent lesson text. If it is longer than 50000 characters, say so and ask how to split it. Do not truncate it silently, and do not turn the split into extra paid calls unless the user agrees.

- `text` (required, at most 50000 characters)
- `max_tokens` (optional)
- `payment_method_id` (optional)
- `idempotency_key` (optional; also sent as the `Idempotency-Key` header)

On success, report only the returned fields: `review`, `passed`, `suggestions`, `charge_id`, `billing_status`, and `meta`. Do not rewrite them into a different verdict.

## Fail closed

A missing `ARCH_API_KEY`, HTTP 401, 400, 402, 429, 503, any other non-2xx, or a network failure is an error. Do not publish. Do not fill in `passed`, `review`, or `suggestions`.

The only review endpoint is `POST https://arch.tnvolman.com/v1/review`.

`kjv_lookup` can quote a King James verse offline, at no charge. It is not a theological review and does not replace `arch_review`.

## Summarize fixes

After the reviews that completed, summarize the fixes. Group them by lesson. Use that lesson's `suggestions` and `review`. Include whether it `passed`. Do not add theological fixes Arch did not return. State again that the review covered the theology of the text only.
