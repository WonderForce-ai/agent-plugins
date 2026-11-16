# WonderForce plugins for coding agents

Your company's WonderForce brain in your coding agent: people, customers, deals, vendors and decisions, limited to
what you can see.

## Claude Code

```
/plugin marketplace add WonderForce-ai/agent-plugins
/plugin install wonderforce@wonderforce
```

Claude Code asks for your MCP URL. Copy the URL from WonderForce under **Connections → For agents & tools**, then sign
in when your browser opens.

The plugin adds:

- the WonderForce MCP server, signed in with your own account;
- a short note at the start of each session telling Claude when to use WonderForce;
- a short summary of finished work, saved to your WonderForce memory when the work wraps up (or when you run
  `/wonderforce:wrap-up`). Claude Code shows you what was saved, and `/wonderforce:undo` deletes the note;
- a local check that refuses to save a note containing a password, key or token.

Claude Code 2.1.295 or later.

To connect Claude Code and Codex without the plugin, run `npx @wonderforce/connect <your MCP URL>`.

## License

MIT
