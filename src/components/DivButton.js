import React from "react";

const DivButton = ({ onClick, children, className = "", style = {} }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={className}
      style={{ cursor: "pointer", ...style }}
    >
      {children}
    </div>
  );
};

export default DivButton;