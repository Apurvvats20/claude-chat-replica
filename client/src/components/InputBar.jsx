import React, { useRef, useState } from "react";

const ACCEPTED = ".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown";

export default function InputBar({ onSend, onUpload, attachedFile, onClearFile, disabled }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    textareaRef.current?.focus();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  }

  function autoResize(e) {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
    setText(el.value);
  }

  return (
    <div style={styles.outer}>
      <div style={styles.container}>
        {attachedFile && (
          <div style={styles.filePill}>
            <span>📎 {attachedFile}</span>
            <button style={styles.clearBtn} onClick={onClearFile} title="Remove file">✕</button>
          </div>
        )}
        <div style={styles.inputRow}>
          <button
            style={styles.iconBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            disabled={disabled}
          >
            <PaperclipIcon />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="Message Claude..."
            rows={1}
            style={styles.textarea}
            disabled={disabled}
          />
          <button
            style={{ ...styles.sendBtn, opacity: (!text.trim() || disabled) ? 0.35 : 1 }}
            onClick={submit}
            disabled={!text.trim() || disabled}
            title="Send"
          >
            <SendIcon />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <p style={styles.hint}>Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

const styles = {
  outer: {
    borderTop: "1px solid var(--border)",
    background: "var(--bg)",
    padding: "12px 20px 16px",
    flexShrink: 0,
  },
  container: {
    maxWidth: 740,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  filePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    color: "var(--text-muted)",
    alignSelf: "flex-start",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 11,
    padding: "0 2px",
    lineHeight: 1,
  },
  inputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "8px 10px",
    transition: "border-color 0.15s",
  },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--text)",
    fontSize: 15,
    lineHeight: 1.5,
    maxHeight: 200,
    overflowY: "auto",
  },
  iconBtn: {
    color: "var(--text-muted)",
    padding: 4,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.15s",
    flexShrink: 0,
  },
  sendBtn: {
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.15s",
    flexShrink: 0,
  },
  hint: {
    fontSize: 11,
    color: "var(--text-muted)",
    textAlign: "center",
    opacity: 0.5,
  },
};
