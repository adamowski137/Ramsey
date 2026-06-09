import React from "react";
import { Layers, RotateCcw } from "lucide-react";

export default function Header({ onReset, showReset }) {
  return (
    <header
      className="main-header glass-panel"
      style={{ padding: "1rem 1.5rem" }}
    >
      <div className="app-logo">
        <Layers className="logo-icon" size={28} color="#6366f1" />
        <div>
          <h1 className="logo-text">Liczby Ramseya Online</h1>
          <div className="subtitle">Konstruktor vs Malarz </div>
        </div>
      </div>
      <div className="header-actions">
        {showReset && (
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            onClick={onReset}
          >
            <RotateCcw size={16} /> Resetuj Grę
          </button>
        )}
      </div>
    </header>
  );
}
