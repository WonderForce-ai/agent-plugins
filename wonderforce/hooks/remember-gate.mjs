#!/usr/bin/env node
// WonderForce plugin PreToolUse gate on EVERY WonderForce `remember` (AGENT-SETUP-CLI T5, design rev 5 part B step 3).
//
// Founder 2026-10-26: notes and session summaries save automatically, with no per-save question. So this hook does
// not ask. It decides, in this order (Claude Code's precedence is deny > defer > ask > allow):
//   1. DENY when no person will see the save: `CLAUDE_CODE_ENTRYPOINT` is not an interactive entrypoint (`cli` or
//      `claude-vscode`). Unattended runs (CI, `claude -p`, SDK hosts) are where an agent most often reads untrusted
//      input, and the undo bound needs a person who sees the "Saved …" line. Absent or unknown ⇒ deny.
//   2. DENY on a detected secret in ANY argument (claim, why, refs): the server stores all of them. Defence in depth
//      only (`scrub.mjs`).
//   3. Otherwise ALLOW: the call runs without a permission prompt.
// FAILS CLOSED: every error inside this script — including a missing or broken `scrub.mjs`, which is imported inside
// the try — prints a deny and exits 0, so a crash denies on any Claude Code. The hook is registered with
// `"onFailure": "block"` (Claude Code >= 2.1.295) for what this script cannot catch: it cannot start, or it times out.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const INTERACTIVE_ENTRYPOINTS = new Set(["cli", "claude-vscode"]);

export function decision(kind, reason) {
  const out = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: kind } };
  if (reason) out.hookSpecificOutput.permissionDecisionReason = reason;
  return JSON.stringify(out);
}

export function decide(input, env, scrub) {
  if (!INTERACTIVE_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT)) {
    return decision("deny", "WonderForce saves notes only in an interactive session, where you can see and undo them.");
  }
  for (const s of scrub.stringsIn(input?.tool_input ?? {})) {
    const kind = scrub.findSecret(s);
    if (kind) {
      return decision("deny", `Not saved: the note looks like it contains ${kind}. Rewrite it without the secret.`);
    }
  }
  return decision("allow");
}

/** Record a DENIED save locally, so `/wonderforce:wrap-up --status` can say "not saved (<reason>)": a denied call never
 * reaches the PostToolUse recorder. Best effort; never changes the decision. */
function recordDeny(input, out, env) {
  try {
    const d = JSON.parse(out).hookSpecificOutput;
    if (d.permissionDecision !== "deny" || !env.CLAUDE_PLUGIN_DATA) return;
    fs.mkdirSync(env.CLAUDE_PLUGIN_DATA, { recursive: true });
    fs.appendFileSync(path.join(env.CLAUDE_PLUGIN_DATA, "notes.jsonl"), JSON.stringify({
      session_id: input?.session_id ?? null, at: new Date().toISOString(), tool: input?.tool_name ?? null,
      kind: input?.tool_input?.kind ?? null, id: null, stored: false, forgotten: null,
      reason: d.permissionDecisionReason ?? null }) + "\n");
  } catch {
    /* a convenience record only */
  }
}

export async function run(raw, env) {
  let input = null;
  let out;
  try {
    const scrub = await import("./scrub.mjs");
    input = JSON.parse(raw);
    out = decide(input, env, scrub);
  } catch {
    out = decision("deny", "Not saved: WonderForce could not check this note.");
  }
  recordDeny(input, out, env);
  return out;
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
  let raw = "";
  try {
    for await (const chunk of process.stdin) raw += chunk;
  } catch {
    raw = "";
  }
  process.stdout.write((await run(raw, process.env)) + "\n");
}
