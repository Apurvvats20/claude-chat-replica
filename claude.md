# Claude Chat UI

## Project Overview

A single-user Claude-powered chat interface hosted on Railway. Looks and feels like Claude Desktop — clean, minimal, supports PDF and document uploads. Shows real-time token and cost usage at the top.

## Tech Stack

- **Frontend:** React (Vite) — single page app
- **Backend:** Node.js + Express — handles API calls server-side so the API key is never exposed to the browser
- **Claude API:** claude-sonnet-4-5-20251001 (swap to opus for better quality)
- **File parsing:** pdf-parse (PDFs), mammoth (DOCX), plain text for TXT/MD
- **Hosting:** Railway — one service, frontend served as static build from Express

## Project Structure

```
claude-chat/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── InputBar.jsx
│   │   │   ├── UsageBar.jsx      # token + cost indicator
│   │   │   └── FileUpload.jsx
│   │   ├── hooks/
│   │   │   └── useChat.js
│   │   └── utils/
│   │       └── tokenEstimate.js
│   └── dist/                # built output served by Express
├── server/
│   ├── index.js             # Express server
│   ├── routes/
│   │   └── chat.js          # POST /api/chat
│   └── utils/
│       ├── fileParser.js    # PDF, DOCX, TXT extraction
│       └── contextManager.js
├── .env
├── package.json
└── CLAUDE.md
```

## Environment Variables

```
ANTHROPIC_API_KEY=your_key_here
PORT=3000
MAX_TOKENS=8192
MODEL=claude-sonnet-4-5-20251001
```

## Core Features

### 1. Chat Interface

- Clean single-column chat layout
- User messages right-aligned, Claude messages left-aligned
- Markdown rendering in Claude responses (code blocks, bold, lists)
- Streaming responses — text appears token by token, not all at once
- Auto-scroll to latest message

### 2. File Upload

Supported types: PDF, DOCX, TXT, MD

Flow:

1. User attaches file via paperclip icon or drag-drop
2. Server extracts text content from file
3. File content is injected into the system prompt as context
4. Shown in chat as an attachment pill above the message

```js
// fileParser.js
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(buffer, mimetype) {
  if (mimetype === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimetype.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return buffer.toString("utf-8"); // TXT, MD
}
```

### 3. Usage Indicator (top bar)

Shows in real time:

- Tokens used this session (input + output combined)
- Estimated cost this session in USD
- Subtle display — not distracting from the chat

Pricing reference (update if model changes):

```
claude-sonnet-4-5-20251001:
  input:  $3.00 per 1M tokens
  output: $15.00 per 1M tokens
```

Track in state:

```js
const [usage, setUsage] = useState({ inputTokens: 0, outputTokens: 0 });

// After each API response, add to running total
// Cost = (inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15)
```

---

## Context Management Strategy

This is the most important part. Sending full conversation history every time wastes tokens fast.

### The Problem

Each API call sends the entire history as a messages array. A 20-message conversation can cost 5-10x more than necessary if not managed.

### Strategy: Sliding Window + System Prompt Summary

**Rule 1 — Sliding window (always active)**
Keep only the last N messages in full. Anything older gets summarised or dropped.

```js
const MAX_FULL_MESSAGES = 10; // keep last 10 messages verbatim
const MAX_CONTEXT_TOKENS = 4000; // rough token budget for history
```

**Rule 2 — System prompt carries persistent context**
Important information (uploaded document contents, key facts from earlier) lives in the system prompt — not message history. This keeps the messages array lean.

```js
const systemPrompt = `
You are a helpful assistant.

${documentContext ? `ATTACHED DOCUMENT:\n${documentContext}\n` : ""}
${summaryContext ? `EARLIER CONVERSATION SUMMARY:\n${summaryContext}\n` : ""}

Current date: ${new Date().toLocaleDateString()}
`;
```

**Rule 3 — Summarise old messages when window fills**
When history exceeds MAX_FULL_MESSAGES, call Claude with a cheap summarisation prompt to compress older messages into 2-3 sentences. Store the summary. Future API calls send summary + recent messages only.

```js
// contextManager.js
async function buildContext(messages, documentText) {
  const recentMessages = messages.slice(-MAX_FULL_MESSAGES);
  const olderMessages = messages.slice(0, -MAX_FULL_MESSAGES);

  let summary = "";
  if (olderMessages.length > 0) {
    summary = await summariseMessages(olderMessages); // uses haiku model
  }

  return {
    systemPrompt: buildSystemPrompt(documentText, summary),
    messages: recentMessages,
  };
}
```

**Rule 4 — Document handling**
When a user uploads a PDF:

- Extract text once on upload, store server-side in session
- Include in system prompt (not message history)
- For very long docs (>10k tokens), only include relevant chunks using basic keyword match against the user's question

**Rule 5 — Use claude-haiku for summarisation only**
Summarisation calls use claude-haiku-4-5-20251001 which costs ~20x less. All user-facing responses use sonnet/opus.

```js
const CHAT_MODEL = "claude-sonnet-4-5-20251001";
const SUMMARY_MODEL = "claude-haiku-4-5-20251001";
```

### What goes into each API call

```
System prompt:
  - Static instructions
  - Uploaded document text (if any)
  - Summary of older messages (if conversation is long)

Messages array:
  - Last 10 messages only (verbatim)
```

This keeps each API call roughly constant in token size regardless of conversation length.

---

## API Route

```js
// POST /api/chat
// Body: { message, history, sessionId }
// Returns: streaming text + usage metadata at end

app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;
  const { systemPrompt, messages } = await buildContext(
    history,
    getDocumentContext(req.sessionId),
  );

  const stream = await anthropic.messages.stream({
    model: process.env.MODEL,
    max_tokens: parseInt(process.env.MAX_TOKENS),
    system: systemPrompt,
    messages: [...messages, { role: "user", content: message }],
  });

  res.setHeader("Content-Type", "text/event-stream");

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta") {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
    }
  }

  const finalMessage = await stream.finalMessage();
  res.write(
    `data: ${JSON.stringify({ usage: finalMessage.usage, done: true })}\n\n`,
  );
  res.end();
});
```

## Railway Deployment

```toml
# railway.toml
[build]
  builder = "NIXPACKS"
  buildCommand = "npm run build"

[deploy]
  startCommand = "npm start"
  healthcheckPath = "/health"
```

```json
// package.json scripts
"scripts": {
  "build": "cd client && npm install && npm run build",
  "start": "node server/index.js"
}
```

Express serves the React build:

```js
app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});
```

Set `ANTHROPIC_API_KEY` as an environment variable in Railway dashboard — never commit it.

## How to Start Each Claude Code Session

"I am building a Claude chat UI — React (Vite) frontend + Node/Express backend, hosted on Railway. Single user, supports PDF/DOCX uploads, streaming responses, real-time token/cost display at top. Context managed via sliding window (last 10 messages) + system prompt summary of older messages. Current state: [what is built]. Today: [specific task]."
