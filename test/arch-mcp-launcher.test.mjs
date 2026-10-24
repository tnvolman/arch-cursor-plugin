import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const binPath = path.join(repoRoot, "bin", "arch-mcp");

function outsideRepo(dir) {
  const relative = path.relative(repoRoot, dir);
  return relative.startsWith("..") || path.isAbsolute(relative);
}

/**
 * initialize + notifications/initialized + tools/list only.
 * Does not send tools/call, so arch_review never reaches Arch.
 */
function handshake(cwd) {
  const env = { ...process.env };
  delete env.ARCH_API_KEY;

  const child = spawn(binPath, [], {
    cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const messages = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "arch-mcp-bin-test", version: "0.0.0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ];

  return new Promise((resolve, reject) => {
    const lines = [];
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!child.killed) child.kill();
      if (error) reject(error);
      else resolve(value);
    };

    const timer = setTimeout(() => {
      finish(
        new Error(
          "timed out waiting for bin/arch-mcp. stdout=" +
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
        if (line) {
          try {
            lines.push(JSON.parse(line));
          } catch (error) {
            finish(error);
            return;
          }
        }
        newline = stdout.indexOf("\n");
      }
      const sawInitialize = lines.some((message) => message.id === 1);
      const sawTools = lines.some((message) => message.id === 2);
      if (sawInitialize && sawTools) {
        finish(null, { lines, stderr });
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish(error);
    });

    for (const message of messages) {
      child.stdin.write(JSON.stringify(message) + "\n");
    }
  });
}

test("bin/arch-mcp from a directory outside the repo returns arch_review and kjv_lookup", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "arch-mcp-"));
  assert.equal(outsideRepo(cwd), true, "spawn cwd must be outside the repo: " + cwd);
  assert.equal(path.basename(binPath), "arch-mcp");

  try {
    const { lines, stderr } = await handshake(cwd);
    assert.equal(stderr.includes("arch.tnvolman.com"), false);
    assert.equal(stderr.includes("Arch request failed"), false);

    const initialized = lines.find((message) => message.id === 1);
    assert.ok(initialized, "initialize response missing");
    assert.equal(initialized.error, undefined);
    assert.equal(initialized.result.protocolVersion, "2024-11-05");
    assert.equal(initialized.result.serverInfo.name, "arch");
    assert.deepEqual(initialized.result.capabilities, { tools: {} });

    const listed = lines.find((message) => message.id === 2);
    assert.ok(listed, "tools/list response missing");
    assert.equal(listed.error, undefined);
    assert.deepEqual(
      listed.result.tools.map((tool) => tool.name),
      ["arch_review", "kjv_lookup"]
    );
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
