import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/app.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

root.textContent = "Loading SkillSpring Quantum...";

function renderBootError(message: string) {
  root.innerHTML = `
    <div style="padding: 24px; color: #e8ecf8; font-family: Aptos, 'Segoe UI Variable Text', 'Trebuchet MS', sans-serif;">
      <h2 style="margin: 0 0 12px;">Renderer Boot Problem</h2>
      <p style="margin: 0 0 10px; color: #9aa6c7;">SkillSpring Quantum failed before the React app finished mounting.</p>
      <pre style="white-space: pre-wrap; background: #0f152b; border: 1px solid #24304f; border-radius: 12px; padding: 14px; color: #e8ecf8;">${message}</pre>
    </div>
  `;
}

window.addEventListener("error", (event) => {
  const message = event.error instanceof Error
    ? event.error.stack || event.error.message
    : String(event.message || "Unknown renderer boot error");
  renderBootError(message);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message =
    reason instanceof Error
      ? reason.stack || reason.message
      : String(reason || "Unknown renderer boot rejection");
  renderBootError(message);
});

import("./App")
  .then(({ default: App }) => {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    renderBootError(message);
  });
