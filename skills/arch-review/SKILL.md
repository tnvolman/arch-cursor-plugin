---
name: arch-review
description: >-
  Theological and Scripture content review via Arch (ReviewRequest to ReviewResult).
  Use when the user asks to review sermons, devotionals, Bible teaching, doctrine,
  or other faith content for theological soundness through Arch.
---

# Arch theological review

## When to use

- User wants theological or Scripture-related content reviewed by Arch.
- Draft sermons, devotionals, teaching notes, or doctrinal claims need a ReviewRequest to ReviewResult pass.
- Prefer this skill over inventing a theological verdict locally.

## When not to use

- Non-theological copyediting, code review, or general writing feedback.
- Billing setup, dashboard access, request-access flows, or admin APIs (not wrapped).
- Live calls to any endpoint other than Arch POST /v1/review.

## How to run

1. Ensure plugin variable ARCH_API_KEY is configured (Plugins then Configure).
2. Call the MCP tool arch_review with a ReviewRequest:
   - text (required string, at most 50000)
   - max_tokens (optional number, default 1024)
   - payment_method_id (optional, legacy)
   - idempotency_key (optional; when set, server also sends Idempotency-Key header)
3. Treat a successful tool payload as ReviewResult field names only:
   - review
   - passed
   - suggestions
   - charge_id
   - billing_status
   - meta with approved, flagged, rejected, total, chars, charged
4. On MCP error (missing key, non-2xx, network): report the error. Never invent a ReviewResult or sample verdict text.

## Contract notes

- Base URL: https://arch.tnvolman.com
- Auth header: X-API-Key
- Cost note: Arch bills about $2 per review (see product docs / billing_status).
- Do not wrap /arch/request-access, billing setup, dashboard, POST /api/arch/review, admin, or api.arch.tnvolman.com.
