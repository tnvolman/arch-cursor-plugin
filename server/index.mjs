#!/usr/bin/env node
/**
 * Zero-dep stdio MCP server for Arch theological review.
 * Domain: ReviewRequest -> ReviewResult
 * Endpoint: POST https://arch.tnvolman.com/v1/review
 * Auth: X-API-Key from env ARCH_API_KEY
 * Fail closed: missing key or non-2xx -> MCP error (never invent ReviewResult).
 */

import { createInterface } from "node:readline";
import { stdin as input, stdout as output, stderr as log } from "node:process";

const BASE_URL = "https://arch.tnvolman.com";
const REVIEW_PATH = "/v1/review";
const MAX_TEXT = 50000;
const SERVER_INFO = { name: "arch", version: "0.1.0" };
const PROTOCOL_VERSION = "2024-11-05";

const TOOL = {
  name: "arch_review",
  description:
    "Submit text for Arch theological/Scripture content review. Maps ReviewRequest to ReviewResult via POST /v1/review. Returns review, passed, suggestions, charge_id, billing_status, and meta (approved, flagged, rejected, total, chars, charged). Fail-closed on missing ARCH_API_KEY or non-2xx.",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Required review body. Max 50000 characters.",
        maxLength: MAX_TEXT,
      },
      max_tokens: {
        type: "number",
        description: "Optional max tokens for the review response. Default 1024.",
      },
      payment_method_id: {
        type: "string",
        description: "Legacy optional payment method id.",
      },
      idempotency_key: {
        type: "string",
        description:
          "Optional idempotency key. When set, also sent as Idempotency-Key header.",
      },
    },
    required: ["text"],
  },
};

function send(msg) {
  output.write(JSON.stringify(msg) + "\n");
}

function okResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function errResult(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  send({ jsonrpc: "2.0", id, error });
}

function toolErrorContent(message) {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function toolOkContent(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

async function callArchReview(args) {
  const apiKey = process.env.ARCH_API_KEY;
  if (!apiKey || String(apiKey).trim() === "") {
    return toolErrorContent(
      "ARCH_API_KEY is missing or empty. Configure it under Plugins -> Configure (variable ARCH_API_KEY). No ReviewResult invented."
    );
  }

  if (!args || typeof args.text !== "string") {
    return toolErrorContent("Invalid ReviewRequest: text (string) is required.");
  }
  if (args.text.length === 0) {
    return toolErrorContent("Invalid ReviewRequest: text must be non-empty.");
  }
  if (args.text.length > MAX_TEXT) {
    return toolErrorContent(
      "Invalid ReviewRequest: text exceeds " + MAX_TEXT + " characters."
    );
  }

  const body = { text: args.text };
  if (args.max_tokens !== undefined) {
    if (typeof args.max_tokens !== "number" || !Number.isFinite(args.max_tokens)) {
      return toolErrorContent("Invalid ReviewRequest: max_tokens must be a number.");
    }
    body.max_tokens = args.max_tokens;
  }
  if (args.payment_method_id !== undefined) {
    if (typeof args.payment_method_id !== "string") {
      return toolErrorContent(
        "Invalid ReviewRequest: payment_method_id must be a string."
      );
    }
    body.payment_method_id = args.payment_method_id;
  }
  if (args.idempotency_key !== undefined) {
    if (typeof args.idempotency_key !== "string") {
      return toolErrorContent(
        "Invalid ReviewRequest: idempotency_key must be a string."
      );
    }
    body.idempotency_key = args.idempotency_key;
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Key": apiKey,
  };
  if (body.idempotency_key) {
    headers["Idempotency-Key"] = body.idempotency_key;
  }

  let res;
  try {
    res = await fetch(BASE_URL + REVIEW_PATH, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return toolErrorContent("Arch request failed (network): " + msg);
  }

  const raw = await res.text();
  if (res.status < 200 || res.status >= 300) {
    return toolErrorContent(
      "Arch /v1/review returned HTTP " +
        res.status +
        ". Body: " +
        raw.slice(0, 2000) +
        ". No ReviewResult invented."
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return toolErrorContent(
      "Arch returned non-JSON 2xx body. No ReviewResult invented. Body: " +
        raw.slice(0, 500)
    );
  }

  return toolOkContent(parsed);
}

async function handle(msg) {
  if (!msg || typeof msg !== "object") return;
  const { id, method, params } = msg;

  if (method === "notifications/initialized" || method === "initialized") {
    return;
  }

  if (id === undefined || id === null) {
    return;
  }

  try {
    switch (method) {
      case "initialize":
        okResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });
        break;
      case "ping":
        okResult(id, {});
        break;
      case "tools/list":
        okResult(id, { tools: [TOOL] });
        break;
      case "tools/call": {
        const name = params && params.name;
        const args = (params && params.arguments) || {};
        if (name !== "arch_review") {
          okResult(id, toolErrorContent("Unknown tool: " + name));
          break;
        }
        const result = await callArchReview(args);
        okResult(id, result);
        break;
      }
      default:
        errResult(id, -32601, "Method not found: " + method);
    }
  } catch (e) {
    const message = e && e.message ? e.message : String(e);
    errResult(id, -32603, message);
  }
}

const rl = createInterface({ input, crlfDelay: Infinity });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (e) {
    log.write("arch-mcp: invalid JSON line: " + e.message + "\n");
    return;
  }
  handle(msg).catch((e) => {
    log.write(
      "arch-mcp: handler error: " + (e && e.message ? e.message : e) + "\n"
    );
  });
});

rl.on("close", () => {
  process.exit(0);
});
