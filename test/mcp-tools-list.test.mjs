import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "server",
  "index.mjs"
);

const ARCH_REVIEW_DESCRIPTION =
  "Review faith, Scripture, or doctrinal text before publishing it. POST /v1/review on https://arch.tnvolman.com. Returns only Arch's review, passed, suggestions, charge_id, billing_status, and meta. Each paid review costs $2.00 or less. Fails closed: missing ARCH_API_KEY or any non-2xx is an error, never a fabricated pass. Do not call for non-theological text.";

function listTools() {
  const env = { ...process.env };
  delete env.ARCH_API_KEY;

  const child = spawn(process.execPath, [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env,
  });

  const messages = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "arch-plugin-test", version: "0.0.0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ];

  return new Promise((resolve, reject) => {
    const lines = [];
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          "timed out waiting for tools/list. stdout=" +
            stdout +
            " stderr=" +
            stderr
        )
      );
    }, 10000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      let newline = stdout.indexOf("\n");
      while (newline >= 0) {
        const line = stdout.slice(0, newline).trim();
        stdout = stdout.slice(newline + 1);
        if (line) lines.push(JSON.parse(line));
        newline = stdout.indexOf("\n");
      }
      if (lines.some((message) => message.id === 2)) {
        clearTimeout(timer);
        child.kill();
        resolve(lines);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    for (const message of messages) {
      child.stdin.write(JSON.stringify(message) + "\n");
    }
  });
}

test("MCP tools/list shows arch_review and kjv_lookup", async () => {
  const lines = await listTools();
  const listed = lines.find((message) => message.id === 2);
  assert.ok(listed, "tools/list response missing");
  assert.equal(listed.error, undefined);
  const tools = listed.result.tools;
  assert.equal(tools.length, 2);

  const names = tools.map((tool) => tool.name);
  assert.deepEqual(names, ["arch_review", "kjv_lookup"]);

  const arch = tools[0];
  assert.equal(arch.description, ARCH_REVIEW_DESCRIPTION);
  assert.deepEqual(arch.inputSchema.required, ["text"]);
  assert.deepEqual(Object.keys(arch.inputSchema.properties), [
    "text",
    "max_tokens",
    "payment_method_id",
    "idempotency_key",
  ]);

  const kjv = tools[1];
  assert.deepEqual(kjv.inputSchema.required, ["ref"]);
  assert.match(kjv.description, /no charge/i);
  assert.match(kjv.description, /no API key/i);
  assert.match(kjv.description, /not a theological review/i);
});
