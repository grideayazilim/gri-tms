import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import App from "./App";
import { ToastProvider } from "./components/ToastBar/ToastContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
    <ToastProvider>
    <App />
    </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);
