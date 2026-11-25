import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
window.__APP_BOOTED__ = true; // BUG-661: boot guard (public/index.html)
try { sessionStorage.removeItem('mg_boot_retry'); } catch (e) { /* storage unavailable */ }
