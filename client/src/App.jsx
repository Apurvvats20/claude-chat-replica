import React from "react";
import UsageBar from "./components/UsageBar";
import ChatWindow from "./components/ChatWindow";
import InputBar from "./components/InputBar";
import { useChat } from "./hooks/useChat";

export default function App() {
  const { messages, usage, isStreaming, sendMessage, uploadFile, attachedFile, clearFile } =
    useChat();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <UsageBar usage={usage} />
      <ChatWindow messages={messages} isStreaming={isStreaming} />
      <InputBar
        onSend={sendMessage}
        onUpload={uploadFile}
        attachedFile={attachedFile}
        onClearFile={clearFile}
        disabled={isStreaming}
      />
    </div>
  );
}
