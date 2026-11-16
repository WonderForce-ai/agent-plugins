---
name: undo
description: Delete a note your agent saved to the person's WonderForce memory. Use when the person runs /wonderforce:undo, optionally with the note id from the "Saved to your WonderForce memory" line.
---

# Undo a saved WonderForce note

1. The note id is `$ARGUMENTS` if it is given. It starts with `agent-memory:`.
2. Without an id, read `${CLAUDE_PLUGIN_DATA}/notes.jsonl` and take the `id` of the most recent line for this session
   with `stored: true`. If there is none, say there is no note from this session to undo, and stop.
3. Call WonderForce's `forget` tool with `id` = that id.
4. Claude Code shows whether the note was deleted. If it says the note was not deleted, tell the person it may have
   been deleted already, or is not a note this agent can delete.
