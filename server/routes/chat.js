const express = require("express");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk");
const { extractText } = require("../utils/fileParser");
const { buildContext } = require("../utils/contextManager");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to get response from Claude" });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
      res.end();
    }
  }
});

// DELETE /api/chat/session — clear doc context
router.delete("/session", (req, res) => {
  const { sessionId = "default" } = req.body;
  sessionDocs.delete(sessionId);
  res.json({ ok: true });
});

module.exports = router;
