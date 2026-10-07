import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";

// Daftarkan Service Worker: wajib untuk notifikasi web/PWA, karena
// registration.showNotification() hanya bisa dipanggil dari konteks SW.
// immediate: true = SW controlling halaman tanpa perlu reload.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
