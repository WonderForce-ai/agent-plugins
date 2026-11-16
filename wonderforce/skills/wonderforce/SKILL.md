---
name: wonderforce
description: Use WonderForce, the company brain, before answering anything about a person, customer, deal, vendor, subscription, renewal, meeting or company decision ("why did we…", "what's the status of…", "what did we decide about…"). Prefer it over guessing or web search for anything internal.
---

# WonderForce: your company's brain

WonderForce holds what your company knows about its people, customers, vendors, deals, meetings and decisions, from the
tools the company has connected. Every result is already limited to what you can see.

## When to use it

- A person or customer by name, a deal, a vendor, a subscription or renewal, a meeting to prepare for.
- "Why did we …", "what did we decide about …", "what's the status of …".
- Before you guess, and before you ask the user something the company already knows.

## How

1. At the start of a session, call `get_working_set` to see what is active for you right now.
2. Call `query` with a plain question. Use `get_page` to open a page a result points to.
3. Compose the answer from what comes back, and cite it. Do not invent.
4. Show people names, never internal ids or slugs.
5. A `{"status": "not_ready"}` result means the brain is still reading its first import. Nothing was read. Say so and try
   again later.

What WonderForce stores from a session, and who can see it, is in the `how_to_use` tool. Read it before you call
`remember`.

## Session summaries

When a piece of work wraps up, save a short summary without asking, as the `wrap-up` skill describes (`remember`,
kind `session_summary`). Claude Code shows the person what was saved and how to undo it (`/wonderforce:undo`).
