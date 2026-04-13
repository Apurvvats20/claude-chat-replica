import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ messages, isStreaming }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={styles.window}>
      {messages.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>How can I help you today?</p>
          <p style={styles.emptySubtitle}>Ask me anything, or attach a document to discuss.</p>
        </div>
      ) : (
        <div style={styles.messages}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

const styles = {
  window: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 0",
  },
  messages: {
    maxWidth: 740,
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 8,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: "var(--text)",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "var(--text-muted)",
  },
};
