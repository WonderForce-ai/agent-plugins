#!/usr/bin/env node
// WonderForce plugin PostToolUse notice for `remember` and `forget` (AGENT-SETUP-CLI T5, design rev 5 part B steps 4-5).
//
// After every save, Claude Code itself shows the person the text the SERVER STORED (`saved` in the `remember`
// response, never the model's arguments) and the undo command. `systemMessage` is shown to the user by Claude Code;
// the model cannot hide it or show only part of what was stored. It also records the note id locally, so
// `/wonderforce:undo` with no id can undo the last note of this session, and `/wonderforce:wrap-up --status` can say
// what happened. Plain JSON output only; never starts with anything but `{`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The server's refusal codes, in the person's words. An unknown code is shown as it is. */
const REASONS = { "session-summaries-off": "session summaries are off for this agent in Connections" };

/** The first JSON object with a `stored` or `forgotten` key found anywhere in an MCP tool response. */
export function resultOf(response) {
  const seen = [];
  const walk = (v) => {
    if (typeof v === "string") {
      try {
        walk(JSON.parse(v));
      } catch {
        /* not JSON */
      }
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if ("stored" in v || "forgotten" in v) seen.push(v);
      Object.values(v).forEach(walk);
    }
  };
  walk(response);
  return seen[0] ?? null;
}

export function message(toolName, response) {
  const r = resultOf(response);
  if (!r) return null;
  if (/__forget$/.test(toolName ?? "")) {
    return r.forgotten === true ? "Deleted that note from your WonderForce memory." : "That note was not deleted.";
  }
  if (r.stored !== true) {
    return `Not saved to your WonderForce memory${r.reason ? `: ${REASONS[r.reason] ?? r.reason}` : ""}.`;
  }
  const id = typeof r.id === "string" ? r.id : "";
  const undo = id ? ` Undo: /wonderforce:undo ${id}` : "";
  if (typeof r.saved !== "string") return `Saved to your WonderForce memory (text not returned).${undo}`;
  // Shown WHOLE: the server refuses a note longer than it can be shown (`agent_memory.MAX_NOTE_CHARS`, under Claude
  // Code's 10,000-character systemMessage cap), so there is never a hidden tail.
  // The sentence's own period only when the saved text does not already end one (else the line reads `…28.".`).
  const stop = /[.!?…]\s*$/u.test(r.saved) ? "" : ".";
  return `Saved to your WonderForce memory: "${r.saved}"${stop}${undo}`;
}

function record(input, r) {
  const dir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dir || !r) return;
  const line = { session_id: input.session_id ?? null, at: new Date().toISOString(), tool: input.tool_name ?? null,
    kind: input.tool_input?.kind ?? null, id: typeof r.id === "string" ? r.id : null, stored: r.stored ?? null,
    forgotten: r.forgotten ?? null, reason: r.reason ?? null };
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, "notes.jsonl"), JSON.stringify(line) + "\n");
}

// Run as the hook (not imported by a test)? Compare REAL paths: node resolves symlinks in `import.meta.url`, and a
// plugin cache or a temp dir is often reached through one (macOS /var → /private/var). A plain path compare there
// would skip the hook body, print nothing, and leave the decision to the normal permission flow.
const invoked = (() => {
  try {
    return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return true;                                         // unsure ⇒ behave as the hook
  }
})();
if (invoked) {
  try {
    let raw = "";
    for await (const chunk of process.stdin) raw += chunk;
    const input = JSON.parse(raw);
    const msg = message(input.tool_name, input.tool_response);
    try {
      record(input, resultOf(input.tool_response));
    } catch {
      /* the local record is a convenience; the notice still shows */
    }
    process.stdout.write(JSON.stringify(msg ? { systemMessage: msg } : {}) + "\n");
  } catch {
    process.stdout.write(JSON.stringify({ systemMessage: "WonderForce could not read the result of that save." }) + "\n");
  }
}
