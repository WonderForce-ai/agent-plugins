#!/usr/bin/env node
// WonderForce plugin SessionStart hook (AGENT-SETUP-CLI T4, T5). Prints plain text, which Claude Code adds to the
// session as context (code.claude.com/docs/en/hooks: on SessionStart "Claude Code adds plain-text stdout as context that
// Claude can see and act on").
//
// Why a COMMAND hook that asks Claude to call `get_working_set`, and not an `mcp_tool` hook that calls it:
//   1. At launch an `mcp_tool` hook does not run: "SessionStart at launch, including with --continue or --resume ...
//      fire before the session's MCP servers are available to hooks. Claude Code skips their mcp_tool hooks without
//      calling the tool" (same page, "Events that fire before MCP servers are available").
//   2. Even after /clear or a compaction, where it would run, the tool's text is read like command stdout: "your stdout
//      counts as JSON output only when you print one JSON object". `get_working_set` returns one JSON object, so Claude
//      Code would read it as hook control JSON, fail validation, and add nothing.
// So the hook carries no data, makes no network call and needs no credential: it only tells Claude where to look.
// Plain text by construction (it must not start with "{").
//
// T5 (design rev 5 part B): it also says how session summaries work, and — below Claude Code 2.1.295, where the
// `remember` gate's `"onFailure": "block"` does not exist — tells the agent not to save notes. That line is ADVICE,
// not enforcement; the design does not count it as a protection.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MIN_VERSION = [2, 1, 295];

export function versionBelowMin(text) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(text ?? "");
  if (!m) return false;                                   // unknown: say nothing (advice only)
  const v = m.slice(1, 4).map(Number);
  for (let i = 0; i < 3; i++) if (v[i] !== MIN_VERSION[i]) return v[i] < MIN_VERSION[i];
  return false;
}

export function lines(versionText) {
  const out = [
    "WonderForce (your company's brain) is connected as an MCP server. Before your first answer that needs company " +
      "context, call its get_working_set tool to see what is active for this person, then use query for anything else " +
      "about people, customers, deals, vendors or decisions.",
    "When a piece of work wraps up (the person says they are done, the task is finished and committed, or they run " +
      "/wonderforce:wrap-up), save a short summary with WonderForce's remember tool, kind \"session_summary\": at most 5 " +
      "bullets of what was done, decided and left open, written for a teammate, with no secrets, credentials or quoted " +
      "prompts. Do not ask first. Claude Code shows the person what was saved, with an undo.",
  ];
  if (versionBelowMin(versionText)) {
    out.push("This Claude Code is older than 2.1.295, so WonderForce cannot guarantee its secret check on saved notes. " +
      "Do not call WonderForce's remember tool in this session, and tell the person to update Claude Code.");
  }
  return out.join("\n") + "\n";
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
  let version = "";
  try {
    const r = spawnSync("claude", ["--version"], { encoding: "utf8", timeout: 2500 });
    version = r.status === 0 ? r.stdout : "";
  } catch {
    version = "";
  }
  process.stdout.write(lines(version));
}
