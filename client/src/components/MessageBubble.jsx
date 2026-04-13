import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div style={{ ...styles.wrapper, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && (
        <div style={styles.avatar}>C</div>
      )}
      <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : styles.claudeBubble) }}>
        {message.file && (
          <div style={styles.filePill}>
            <span style={styles.fileIcon}>📎</span>
            {message.file}
          </div>
        )}
        {isUser ? (
          <p style={styles.userText}>{message.content}</p>
        ) : (
          <div style={styles.markdown}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, children, ...props }) {
                  return inline ? (
                    <code style={styles.inlineCode} {...props}>{children}</code>
                  ) : (
                    <pre style={styles.codeBlock}>
                      <code {...props}>{children}</code>
                    </pre>
                  );
                },
                p({ children }) {
                  return <p style={styles.p}>{children}</p>;
                },
                ul({ children }) {
                  return <ul style={styles.ul}>{children}</ul>;
                },
                ol({ children }) {
                  return <ol style={styles.ol}>{children}</ol>;
                },
                li({ children }) {
                  return <li style={styles.li}>{children}</li>;
                },
                h1({ children }) { return <h1 style={styles.h}>{children}</h1>; },
                h2({ children }) { return <h2 style={styles.h}>{children}</h2>; },
                h3({ children }) { return <h3 style={styles.h}>{children}</h3>; },
                blockquote({ children }) {
                  return <blockquote style={styles.blockquote}>{children}</blockquote>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.streaming && <span style={styles.cursor} />}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "4px 0",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "var(--accent)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
    marginTop: 2,
  },
  bubble: {
    maxWidth: "75%",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    fontSize: 15,
    lineHeight: 1.65,
  },
  userBubble: {
    background: "var(--user-bubble)",
    borderBottomRightRadius: 4,
  },
  claudeBubble: {
    background: "var(--claude-bubble)",
    borderBottomLeftRadius: 4,
    padding: "6px 4px",
  },
  userText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  markdown: {
    wordBreak: "break-word",
  },
  filePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 12,
    color: "var(--text-muted)",
    marginBottom: 8,
  },
  fileIcon: { fontSize: 13 },
  inlineCode: {
    background: "var(--code-bg)",
    padding: "1px 5px",
    borderRadius: 4,
    fontSize: 13,
    fontFamily: "monospace",
    color: "var(--accent)",
  },
  codeBlock: {
    background: "var(--code-bg)",
    borderRadius: 8,
    padding: "12px 14px",
    overflowX: "auto",
    fontSize: 13,
    fontFamily: "monospace",
    lineHeight: 1.5,
    margin: "8px 0",
    border: "1px solid var(--border)",
  },
  p: { margin: "4px 0" },
  ul: { paddingLeft: 20, margin: "4px 0" },
  ol: { paddingLeft: 20, margin: "4px 0" },
  li: { marginBottom: 2 },
  h: { fontWeight: 600, margin: "10px 0 4px" },
  blockquote: {
    borderLeft: "3px solid var(--accent)",
    paddingLeft: 12,
    color: "var(--text-muted)",
    margin: "6px 0",
  },
  cursor: {
    display: "inline-block",
    width: 2,
    height: "1em",
    background: "var(--text)",
    verticalAlign: "text-bottom",
    marginLeft: 2,
    animation: "blink 1s step-end infinite",
  },
};
