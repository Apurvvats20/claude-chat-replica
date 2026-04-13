import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

const SESSION_ID = uuidv4();

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [usage, setUsage] = useState({ inputTokens: 0, outputTokens: 0 });
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const abortRef = useRef(null);

  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sessionId", SESSION_ID);

    try {
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      setAttachedFile(file.name);
    } catch (err) {
      console.error("File upload error:", err);
      alert("Failed to upload file: " + err.message);
    }
  }, []);

  const clearFile = useCallback(async () => {
    setAttachedFile(null);
    await fetch("/api/chat/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID }),
    });
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = {
      id: uuidv4(),
      role: "user",
      content: text,
      file: attachedFile || null,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantId = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    // Build history — previous messages only; server appends the new user message itself
    const history = messages.map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, sessionId: SESSION_ID }),
        signal: (abortRef.current = new AbortController()).signal,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + data.text } : m
                )
              );
            }

            if (data.done) {
              if (data.usage) {
                setUsage((prev) => ({
                  inputTokens: prev.inputTokens + (data.usage.input_tokens || 0),
                  outputTokens: prev.outputTokens + (data.usage.output_tokens || 0),
                }));
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, streaming: false } : m
                )
              );
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseErr) {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Stream error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.message}`, streaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, attachedFile]);

  return { messages, usage, isStreaming, sendMessage, uploadFile, attachedFile, clearFile };
}
