const express = require("express");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk");
const { extractText } = require("../utils/fileParser");
const { buildContext } = require("../utils/contextManager");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Create client lazily so missing API key doesn't crash the server at startup
function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// In-memory session document store (single user — simple map)
const sessionDocs = new Map();

// POST /api/chat/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const text = await extractText(req.file.buffer, req.file.mimetype);
    const sessionId = req.body.sessionId || "default";
    sessionDocs.set(sessionId, { text, filename: req.file.originalname });

    res.json({ filename: req.file.originalname, charCount: text.length });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to parse file" });
  }
});

// POST /api/chat
router.post("/", async (req, res) => {
  const { message, history = [], sessionId = "default" } = req.body;

  if (!message) return res.status(400).json({ error: "message is required" });

  const docContext = sessionDocs.get(sessionId) || null;

  try {
    const anthropic = getAnthropic();
    const { systemPrompt, messages } = await buildContext(history, docContext, anthropic);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = anthropic.messages.stream({
      model: process.env.MODEL || "claude-sonnet-4-5-20251001",
      max_tokens: parseInt(process.env.MAX_TOKENS || "8192"),
      system: systemPrompt,
      messages: [...messages, { role: "user", content: message }],
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const finalMessage = await stream.finalMessage();
    res.write(
      `data: ${JSON.stringify({ usage: finalMessage.usage, done: true })}\n\n`
    );
    res.end();
  } catch (err) {
    console.error("Chat error:", err?.status, err?.message, err?.error);
    const detail = err?.error?.error?.message || err?.message || "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({ error: detail });
    } else {
      res.write(`data: ${JSON.stringify({ error: detail, done: true })}\n\n`);
      res.end();
    }
  }
});

// GET /api/chat/debug — check env config (never expose key in prod)
router.get("/debug", (req, res) => {
  res.json({
    model: process.env.MODEL || "(not set, using default)",
    maxTokens: process.env.MAX_TOKENS || "(not set)",
    apiKeySet: !!process.env.ANTHROPIC_API_KEY,
    apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 16) + "...",
  });
});

// DELETE /api/chat/session — clear doc context
router.delete("/session", (req, res) => {
  const { sessionId = "default" } = req.body;
  sessionDocs.delete(sessionId);
  res.json({ ok: true });
});

module.exports = router;
