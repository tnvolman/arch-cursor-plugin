/**
 * Test-only fetch guard. Loaded with node --import.
 * Rewrites the hard-coded Arch URL to a loopback upstream and refuses anything else.
 */
import { appendFileSync } from "node:fs";

const realFetch = globalThis.fetch.bind(globalThis);
const ALLOWED = "https://arch.tnvolman.com/v1/review";

function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input && typeof input.url === "string") return input.url;
  return String(input);
}

globalThis.fetch = async (input, init = {}) => {
  const url = requestUrl(input);
  const record = {
    url,
    method: init && init.method ? init.method : "GET",
    redirect: init && init.redirect ? init.redirect : "(default)",
    headerNames:
      init && init.headers && typeof init.headers === "object"
        ? Object.keys(init.headers)
        : [],
  };
  if (process.env.TEST_CAPTURE) {
    appendFileSync(process.env.TEST_CAPTURE, JSON.stringify(record) + "\n");
  }
  if (url !== ALLOWED) {
    throw new Error("test-guard-unexpected-url");
  }
  const upstream = process.env.TEST_UPSTREAM || "";
  if (!upstream.startsWith("http://127.0.0.1:")) {
    throw new Error("test-guard-refused");
  }
  return realFetch(upstream, init);
};
