import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = path.join(repoRoot, "server", "index.mjs");
const guardPath = path.join(repoRoot, "test-support", "fetch-guard.mjs");
const SYNTH = "synthetic-arch-key-audit-only";
const NETWORK_ERROR = "Arch request failed (network). No ReviewResult invented.";
const UNSAFE_KEY = "ARCH_API_KEY is not a usable header value. No ReviewResult invented.";
const MISSING_KEY =
  "ARCH_API_KEY is missing or empty. Configure it under Plugins -> Configure (variable ARCH_API_KEY). No ReviewResult invented.";

function listen(handler) {
  const server = createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function rpc(child, messages, untilIds) {
  return new Promise((resolve, reject) => {
    const lines = [];
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("timed out. stderr=" + stderr.slice(0, 300)));
    }, 8000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      let nl;
      while ((nl = stdout.indexOf("\n")) >= 0) {
        const line = stdout.slice(0, nl).trim();
        stdout = stdout.slice(nl + 1);
        if (!line) continue;
        lines.push(JSON.parse(line));
      }
      if (untilIds.every((id) => lines.some((message) => message.id === id))) {
        clearTimeout(timer);
        resolve({ lines, stderr });
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
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

function spawnServer({ key, upstream, capture }) {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME || tmpdir(),
    TMPDIR: process.env.TMPDIR || tmpdir(),
    TEST_CAPTURE: capture,
  };
  if (upstream) env.TEST_UPSTREAM = upstream;
  if (key !== undefined) env.ARCH_API_KEY = key;
  return spawn(process.execPath, ["--import", guardPath, serverPath], {
    cwd: tmpdir(),
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const initMessages = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "arch-security-test", version: "0" },
    },
  },
  { jsonrpc: "2.0", method: "notifications/initialized" },
];

function review(id, args) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: "arch_review", arguments: args },
  };
}

function toolText(message) {
  const content = message && message.result && message.result.content;
  return content && content[0] ? String(content[0].text) : "";
}

function assertNoSentinel(value) {
  assert.equal(String(value).includes(SYNTH), false);
}

function readCapture(file) {
  try {
    const raw = readFileSync(file, "utf8").trim();
    if (!raw) return [];
    return raw.split("\n").map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

test("manifests make the key optional and the runtime version is 1.1.1", () => {
  const plugin = JSON.parse(
    readFileSync(path.join(repoRoot, ".cursor-plugin", "plugin.json"), "utf8")
  );
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "manifest.json"), "utf8"));
  const serverJson = JSON.parse(readFileSync(path.join(repoRoot, "server.json"), "utf8"));
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const smithery = readFileSync(path.join(repoRoot, "smithery.yaml"), "utf8");
  const source = readFileSync(serverPath, "utf8");

  assert.equal(plugin.variables.required, undefined);
  assert.equal(manifest.user_config.arch_api_key.required, false);
  assert.equal(manifest.keywords.includes("church"), true);
  assert.equal(serverJson.packages[0].environmentVariables[0].isRequired, false);
  assert.equal(smithery.includes("\n    required:"), false);
  assert.equal(smithery.includes("- ARCH_API_KEY"), false);
  assert.match(source, /version: "1\.1\.1"/);
  assert.equal(pkg.version, "1.1.1");
  assert.match(source, /redirect: "error"/);
});

test("initialize reports server version 1.1.1", async () => {
  const capture = path.join(mkdtempSync(path.join(tmpdir(), "arch-sec-")), "capture.jsonl");
  const child = spawnServer({ capture });
  try {
    const { lines, stderr } = await rpc(child, initMessages, [1]);
    assert.equal(lines[0].result.serverInfo.version, "1.1.1");
    assert.equal(stderr.includes(SYNTH), false);
    assert.equal(readCapture(capture).length, 0);
  } finally {
    child.kill();
  }
});

test("keyless arch_review does not fetch and keyless kjv_lookup stays offline", async () => {
  const hits = [];
  const upstream = await listen(async (req, res) => {
    hits.push(req.url);
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{\"passed\":true}");
  });
  const capture = path.join(mkdtempSync(path.join(tmpdir(), "arch-sec-")), "capture.jsonl");
  const child = spawnServer({
    capture,
    upstream: "http://127.0.0.1:" + upstream.port + "/v1/review",
  });
  try {
    const { lines, stderr } = await rpc(
      child,
      [
        ...initMessages,
        review(2, { text: "should not send" }),
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "kjv_lookup", arguments: { ref: "John 3:16" } },
        },
      ],
      [1, 2, 3]
    );
    const reviewResult = lines.find((line) => line.id === 2);
    const lookup = lines.find((line) => line.id === 3);
    assert.equal(reviewResult.result.isError, true);
    assert.equal(toolText(reviewResult), MISSING_KEY);
    assert.equal(lookup.result.isError, undefined);
    assert.match(toolText(lookup), /For God so loved the world/);
    assert.equal(hits.length, 0);
    assert.equal(readCapture(capture).length, 0);
    assertNoSentinel(JSON.stringify(lines) + stderr);
  } finally {
    child.kill();
    upstream.server.close();
  }
});

test("a key that is only whitespace does not fetch", async () => {
  const hits = [];
  const upstream = await listen((req, res) => {
    hits.push(req.url);
    res.writeHead(204);
    res.end();
  });
  const capture = path.join(mkdtempSync(path.join(tmpdir(), "arch-sec-")), "capture.jsonl");
  const child = spawnServer({
    key: " \n\t ",
    capture,
    upstream: "http://127.0.0.1:" + upstream.port + "/v1/review",
  });
  try {
    const { lines, stderr } = await rpc(child, [...initMessages, review(2, { text: "blank" })], [1, 2]);
    const reviewResult = lines.find((line) => line.id === 2);
    assert.equal(reviewResult.result.isError, true);
    assert.equal(toolText(reviewResult), MISSING_KEY);
    assert.equal(hits.length, 0);
    assert.equal(readCapture(capture).length, 0);
    assertNoSentinel(stderr);
  } finally {
    child.kill();
    upstream.server.close();
  }
});

test("a key containing CR LF never appears in stdout or stderr and does not fetch", async () => {
  const hits = [];
  const upstream = await listen(async (req, res) => {
    const body = await readBody(req);
    hits.push(body.toString("utf8"));
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
  const capture = path.join(mkdtempSync(path.join(tmpdir(), "arch-sec-")), "capture.jsonl");
  const child = spawnServer({
    key: SYNTH + "\r\nX-Injected: pwn",
    capture,
    upstream: "http://127.0.0.1:" + upstream.port + "/v1/review",
  });
  try {
    const { lines, stderr } = await rpc(child, [...initMessages, review(2, { text: "header" })], [1, 2]);
    const reviewResult = lines.find((line) => line.id === 2);
    const text = toolText(reviewResult);
    assert.equal(reviewResult.result.isError, true);
    assert.equal(text, UNSAFE_KEY);
    assert.equal(text.includes("Headers.append"), false);
    assert.equal(hits.length, 0);
    assert.equal(readCapture(capture).length, 0);
    assertNoSentinel(JSON.stringify(lines));
    assertNoSentinel(stderr);
  } finally {
    child.kill();
    upstream.server.close();
  }
});

test("redirect error does not forward the key or body and does not accept a forged pass", async () => {
  const stolen = [];
  const dest = await listen(async (req, res) => {
    const body = await readBody(req);
    stolen.push({
      method: req.method,
      url: req.url,
      hasKey: req.headers["x-api-key"] === SYNTH,
      body: body.toString("utf8"),
    });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ passed: true, review: "FORGED" }));
  });
  const firstHits = [];
  const origin = await listen(async (req, res) => {
    const body = await readBody(req);
    firstHits.push({ method: req.method, body: body.toString("utf8"), hasKey: req.headers["x-api-key"] === SYNTH });
    res.writeHead(307, { Location: "http://127.0.0.1:" + dest.port + "/stolen" });
    res.end();
  });
  const capture = path.join(mkdtempSync(path.join(tmpdir(), "arch-sec-")), "capture.jsonl");
  const child = spawnServer({
    key: SYNTH,
    capture,
    upstream: "http://127.0.0.1:" + origin.port + "/v1/review",
  });
  try {
    const { lines, stderr } = await rpc(
      child,
      [...initMessages, review(2, { text: "redirect-body" })],
      [1, 2]
    );
    const reviewResult = lines.find((line) => line.id === 2);
    const text = toolText(reviewResult);
    assert.equal(reviewResult.result.isError, true);
    assert.equal(text, NETWORK_ERROR);
    assert.equal(text.includes("FORGED"), false);
    assert.equal(text.includes("passed"), false);
    assert.equal(text.includes("redirect-body"), false);
    assert.equal(stolen.length, 0);
    assert.equal(firstHits.length, 1);
    assert.equal(firstHits[0].hasKey, true);
    assert.equal(firstHits[0].method, "POST");
    const calls = readCapture(capture);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://arch.tnvolman.com/v1/review");
    assert.equal(calls[0].redirect, "error");
    assertNoSentinel(text);
    assertNoSentinel(stderr);
  } finally {
    child.kill();
    origin.server.close();
    dest.server.close();
  }
});

test("a direct 200 from the pinned URL still returns that JSON", async () => {
  const hits = [];
  const origin = await listen(async (req, res) => {
    const body = await readBody(req);
    hits.push({ hasKey: req.headers["x-api-key"] === SYNTH, body: body.toString("utf8") });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ review: "local-ok", passed: false, suggestions: [], charge_id: "ch_synth", billing_status: "mock", meta: {} }));
  });
  const capture = path.join(mkdtempSync(path.join(tmpdir(), "arch-sec-")), "capture.jsonl");
  const child = spawnServer({
    key: SYNTH,
    capture,
    upstream: "http://127.0.0.1:" + origin.port + "/ok",
  });
  try {
    const { lines, stderr } = await rpc(child, [...initMessages, review(2, { text: "Grace alone." })], [1, 2]);
    const reviewResult = lines.find((line) => line.id === 2);
    assert.equal(reviewResult.result.isError, undefined);
    assert.match(toolText(reviewResult), /local-ok/);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].hasKey, true);
    assert.equal(hits[0].body, "{\"text\":\"Grace alone.\"}");
    assertNoSentinel(toolText(reviewResult));
    assertNoSentinel(stderr);
  } finally {
    child.kill();
    origin.server.close();
  }
});

test("an illegal idempotency header returns the fixed network error and does not echo the key", async () => {
  const hits = [];
  const origin = await listen((req, res) => {
    hits.push(req.url);
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
  const capture = path.join(mkdtempSync(path.join(tmpdir(), "arch-sec-")), "capture.jsonl");
  const child = spawnServer({
    key: SYNTH,
    capture,
    upstream: "http://127.0.0.1:" + origin.port + "/v1/review",
  });
  try {
    const { lines, stderr } = await rpc(
      child,
      [...initMessages, review(2, { text: "idem", idempotency_key: "idem\r\nX-Injected: pwn" })],
      [1, 2]
    );
    const reviewResult = lines.find((line) => line.id === 2);
    const text = toolText(reviewResult);
    assert.equal(reviewResult.result.isError, true);
    assert.equal(text, NETWORK_ERROR);
    assert.equal(text.includes("Headers.append"), false);
    assert.equal(hits.length, 0);
    assertNoSentinel(text);
    assertNoSentinel(stderr);
  } finally {
    child.kill();
    origin.server.close();
  }
});
