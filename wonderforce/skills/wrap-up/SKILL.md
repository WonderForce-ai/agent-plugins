---
name: wrap-up
description: Save a short summary of this session to the person's WonderForce memory. Use when the person runs /wonderforce:wrap-up, says they are done, or a piece of work is finished and committed. With --status, report what was saved this session.
---

# Save a session summary to WonderForce

## With `--status`

Read `${CLAUDE_PLUGIN_DATA}/notes.jsonl` if it exists. Each line is one save, refusal or undo the plugin saw. Only
lines with `kind: "session_summary"` are summaries; other saved notes do not count. Report, for this session (its
`session_id`), exactly one of:
- `this session: summary saved` (the latest summary line has `stored: true`), with when;
- `this session: not saved (<reason>)` (the latest summary line has `stored: false`);
- `this session: no summary yet` (no summary line for this session, or no file).
Also say when the last summary was saved in any session. Do not call any tool.

## Otherwise

1. Write at most 5 bullets: what was done, what was decided, what is left open. Write them for a teammate who was
   not here. Name files, commits and decisions. Do not include secrets, credentials, tokens or keys, and do not quote
   the person's prompts.
2. Save it at once, without asking: call WonderForce's `remember` tool with
   `claim` = the bullets, `why` = "session summary", `kind` = "session_summary".
3. Claude Code shows the person the saved text and an undo command. Do not repeat the text. If the save was refused
   (for example, a secret was detected), fix the text and save it again once, or say why it was not saved.

The note is stored for this person alone, as a low-trust note. They can undo it with `/wonderforce:undo <id>`, and
turn session summaries off for this agent in Connections.
