// WonderForce plugin: the local secret scan for `remember` (AGENT-SETUP-CLI T5, design rev 5 part B step 3).
// DEFENCE IN DEPTH, never the boundary: it catches secrets with a recognisable SHAPE. A secret written in plain words
// ("the deploy passphrase is violet otter seven") passes it, and the design says so. Pure: no I/O, no network.

/** [kind, pattern] — the kind is what the deny reason names (never the matched text). */
export const SECRET_PATTERNS = [
  ["an AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["a GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/],
  ["a Slack token", /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ["an Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["an OpenAI API key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/],
  ["a Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["a Stripe key", /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}/],
  ["a JSON Web Token", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ["a private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["a bearer token", /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/i],
  ["a URL with a password", /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@/i],
  // A password assignment with any real-looking value (a placeholder word such as `required` or `redacted` is not one).
  ["a password assignment",
    /\b(?:password|passwd|pwd|passphrase)\s*[:=]\s*["']?(?!(?:required|optional|redacted|hidden|none|null|true|false|unset|changeme|example|placeholder)\b)[^\s"',;<>]{6,}/i],
  // A token / key assignment whose VALUE looks like a credential (a digit or a symbol, 8+ characters): `token=required`
  // in prose is not one.
  ["a key assignment",
    /\b(?:secret|token|api[_-]?key|access[_-]?key|client[_-]?secret)\s*[:=]\s*["']?(?=[^\s"',;]*[0-9!@#$%^&*+/=_.-])[^\s"',;<>]{8,}/i],
  ["a WonderForce token", /\b[A-Za-z0-9_-]{6,64}\.[A-Za-z0-9_-]{43}\b/],
];

/** Shannon entropy in bits per character. */
export function entropy(s) {
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** A run of 32+ key-alphabet characters that mixes upper case, lower case and digits and looks random. A lower-case
 * hex commit SHA or a UUID (no upper case) is NOT flagged: summaries name commits all the time. `/`, `_` and `.` end a
 * run, so a file path or a snake_case name is judged segment by segment, not as one long "key". */
function highEntropyRun(text) {
  for (const m of text.matchAll(/[A-Za-z0-9+=-]{32,}/g)) {
    const run = m[0];
    if (/[A-Z]/.test(run) && /[a-z]/.test(run) && /[0-9]/.test(run) && entropy(run) >= 4.3) return true;
  }
  return false;
}

/** `text` with JSON/JS escapes decoded (`\u0041` → `A`, `\n` → newline), so a secret written in escaped form is seen in
 * the form a reader would decode it to. Unknown escapes are left as they are. */
export function unescaped(text) {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\([nrt"\\/])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t" })[c] ?? c);
}

function findIn(text) {
  for (const [kind, re] of SECRET_PATTERNS) if (re.test(text)) return kind;
  return highEntropyRun(text) ? "a long random-looking key" : null;
}

/** The kind of the first secret found in `text` — as written, or once its escapes are decoded — or null. */
export function findSecret(text) {
  if (typeof text !== "string" || !text) return null;
  return findIn(text) ?? (text.includes("\\") ? findIn(unescaped(text)) : null);
}

/** Every string in a tool input, recursively (claim, why, each refs entry, any nested value). */
export function stringsIn(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) stringsIn(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) stringsIn(v, out);
  return out;
}
