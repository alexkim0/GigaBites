// src/components/CategoryOverlay.js
import React from "react";
import "./CategoryOverlay.css";

const CategoryOverlay = ({
  open,
  title = "Choose categories",
  subtitle,
  options,
  selected,
  onToggle,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="cat-overlay-backdrop" onClick={onClose}>
      <div
        className="cat-overlay-panel"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <header className="cat-overlay-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>

        <div className="cat-overlay-grid">
          {options.map(({ id, label, emoji }) => {
            const isSelected = selected.includes(label);
            return (
              <button
                key={id}
                type="button"
                className={`pill ${isSelected ? "selected" : ""}`}
                onClick={() => onToggle(label)}
                aria-pressed={isSelected}
              >
                <span
                  className={`check ${isSelected ? "show" : ""}`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className="label">
                  {emoji} {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="cat-overlay-actions">
          <button type="button" className="cat-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="cat-btn primary"
            onClick={onConfirm || onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryOverlay;
