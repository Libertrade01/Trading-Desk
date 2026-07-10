"use client";

import { LoginWithChatGPT } from "@opencoredev/loginwithchatgpt-react";

export default function ChatGPTSignIn({ onAuthenticated }) {
  return (
    <div className="assistant-connect">
      <LoginWithChatGPT
        consent={{ appName: "Libertrade Loop" }}
        onAuthenticated={onAuthenticated}
      />
    </div>
  );
}
