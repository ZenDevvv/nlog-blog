import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthContextProvider } from "./context/AuthContext";
import { NotifProvider } from "./context/NotifContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthContextProvider>
      <NotifProvider>
        <App />
      </NotifProvider>
    </AuthContextProvider>
  </StrictMode>
);
