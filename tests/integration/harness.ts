// Server integration harness (QA-TEST-003). Task QA-T03.
//
// The fixture workbook is generated once per test file (Vitest isolates modules per file) with
// `scripts/generate_demo_workbook.py <tmp>/fixture.xlsx --customers 8`. Every test then gets its own temp copy, pointed
// to by WORKBOOK_PATH, and a fresh `workbookPlugin`. The plugin's middleware is captured from `configureServer` and
// driven with fake request/response objects, so no port is opened and `../data` is never read or written.
//
// Use it from a file that starts with `// @vitest-environment node`:
//   const api = workbookApi();
//   ... const { status, body } = await api.request("POST", "/api/workbook/use-cases", { ... });
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { workbookPlugin } from "../../server/workbook";

export const MOUNT = "/api/workbook";
export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const GENERATOR = path.join(ROOT, "scripts", "generate_demo_workbook.py");

type Middleware = (req: IncomingMessage, res: ServerResponse) => void;
type Method = "GET" | "POST" | "DELETE" | "PUT" | "PATCH";

export type Reply<T = Record<string, unknown>> = {
  status: number;
  headers: Record<string, string>;
  body: T;
};

export type Request = <T = Record<string, unknown>>(method: Method, url: string, body?: unknown) => Promise<Reply<T>>;

export type WorkbookApi = {
  /** Sends one request to the plugin under test. `url` is what the browser sends, e.g. `/api/workbook/health`. */
  request: Request;
  /** A brand-new plugin (new in-memory store) on the same temp file: proves a change really reached the file. */
  reopen: () => Request;
  /** This test's temp copy (the value of WORKBOOK_PATH). */
  readonly file: string;
  /** The generated fixture the copies are made from; tests must never change it. */
  readonly fixture: string;
};

/** Interpreter for the generator: $PYTHON, else `py` on Windows, else `python3`; always isolated mode (`-I`). */
function python(): string {
  return process.env.PYTHON || (process.platform === "win32" ? "py" : "python3");
}

function generateFixture(dir: string): string {
  const out = path.join(dir, "fixture.xlsx");
  try {
    execFileSync(python(), ["-I", GENERATOR, out, "--customers", "8"], { cwd: ROOT, stdio: "pipe", timeout: 120_000 });
  } catch (e) {
    const err = e as { stderr?: Buffer; message: string };
    throw new Error(`Could not generate the fixture workbook: ${err.stderr?.toString() || err.message}`);
  }
  return out;
}

/** Creates the plugin the way Vite does and returns the middleware it mounts on /api/workbook. */
function mount(defaultFile: string): Middleware {
  const plugin = workbookPlugin(defaultFile);
  const hook = plugin.configureServer;
  const configure = (typeof hook === "function" ? hook : hook?.handler) as unknown as (server: unknown) => unknown;
  let middleware: Middleware | undefined;
  configure({
    middlewares: {
      use(at: string, fn: Middleware) {
        if (at !== MOUNT) throw new Error(`workbook plugin mounted on ${at}, expected ${MOUNT}`);
        middleware = fn;
      },
    },
  });
  if (!middleware) throw new Error("workbook plugin did not register a middleware");
  return middleware;
}

function requester(middleware: Middleware): Request {
  return <T,>(method: Method, url: string, body?: unknown) =>
    new Promise<Reply<T>>((resolve, reject) => {
      // Connect strips the mount path before calling the middleware; do the same.
      const local = url.startsWith(MOUNT) ? url.slice(MOUNT.length) || "/" : url;
      const raw = body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body), "utf8")];
      const req = Object.assign(Readable.from(raw), { url: local, method, headers: {} }) as unknown as IncomingMessage;

      const headers: Record<string, string> = {};
      const res = {
        statusCode: 200,
        setHeader(name: string, value: unknown) {
          headers[name.toLowerCase()] = String(value);
          return res;
        },
        // The plugin answers asynchronously (`void handle(...)`), so the reply is complete when `end` is called.
        end(chunk?: unknown) {
          const textBody = chunk == null ? "" : String(chunk);
          try {
            resolve({ status: res.statusCode, headers, body: (textBody ? JSON.parse(textBody) : undefined) as T });
          } catch (e) {
            reject(new Error(`Response is not JSON: ${textBody.slice(0, 200)} (${(e as Error).message})`));
          }
          return res;
        },
      };
      middleware(req, res as unknown as ServerResponse);
    });
}

/**
 * Registers the Vitest hooks for one test file and returns the API under test. Call it at the top of the file or of a
 * `describe` block. Each test runs against a fresh temp copy of the fixture via WORKBOOK_PATH (restored afterwards).
 */
export function workbookApi(): WorkbookApi {
  let fixtureDir = "";
  let fixture = "";
  let testDir = "";
  let file = "";
  let previous: string | undefined;
  let request: Request | undefined;

  const plugin = () => mount(path.join(testDir, "default-path-must-not-be-used.xlsx"));

  beforeAll(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-fixture-"));
    fixture = generateFixture(fixtureDir);
  }, 180_000);

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-workbook-"));
    file = path.join(testDir, "workbook.xlsx");
    fs.copyFileSync(fixture, file);
    previous = process.env.WORKBOOK_PATH;
    process.env.WORKBOOK_PATH = file;
    request = requester(plugin());
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.WORKBOOK_PATH;
    else process.env.WORKBOOK_PATH = previous;
    request = undefined;
    fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });

  afterAll(() => {
    if (fixtureDir) fs.rmSync(fixtureDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });

  return {
    request: <T,>(method: Method, url: string, body?: unknown) => {
      if (!request) throw new Error("workbookApi().request can only be used inside a test");
      return request<T>(method, url, body);
    },
    reopen: () => requester(plugin()),
    get file() {
      return file;
    },
    get fixture() {
      return fixture;
    },
  };
}
