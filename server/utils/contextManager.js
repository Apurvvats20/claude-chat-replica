const MAX_FULL_MESSAGES = 10;
const CHAT_MODEL = process.env.MODEL || "claude-sonnet-4-5-20251001";
const SUMMARY_MODEL = "claude-haiku-4-5-20251001";
// Rough chars-per-token estimate; used only to decide if doc needs chunking
const CHARS_PER_TOKEN = 4;
const MAX_DOC_TOKENS = 10000;

function buildSystemPrompt(docContext, summaryContext) {
  const parts = ["You are a helpful assistant."];

  if (docContext) {
    let docText = docContext.text;
    // Truncate very long documents
    if (docText.length / CHARS_PER_TOKEN > MAX_DOC_TOKENS) {
      docText = docText.slice(0, MAX_DOC_TOKENS * CHARS_PER_TOKEN) + "\n\n[Document truncated for length]";
    }
    parts.push(`\nATTACHED DOCUMENT (${docContext.filename}):\n${docText}`);
  }

  if (summaryContext) {
    parts.push(`\nEARLIER CONVERSATION SUMMARY:\n${summaryContext}`);
  }

  parts.push(`\nCurrent date: ${new Date().toLocaleDateString()}`);
  return parts.join("\n");
}

async function summariseMessages(messages, anthropic) {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Summarise this conversation in 2-3 sentences, preserving key facts and decisions:\n\n${transcript}`,
      },
    ],
  });

  return response.content[0].text;
}

async function buildContext(messages, docContext, anthropic) {
  const recentMessages = messages.slice(-MAX_FULL_MESSAGES);
  const olderMessages = messages.slice(0, -MAX_FULL_MESSAGES);

  let summary = "";
  if (olderMessages.length > 0) {
    summary = await summariseMessages(olderMessages, anthropic);
  }

  return {
    systemPrompt: buildSystemPrompt(docContext, summary),
    messages: recentMessages,
  };
}

module.exports = { buildContext };
