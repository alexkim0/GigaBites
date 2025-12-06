// src/components/DivButton.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DivButton from "./DivButton";

describe("DivButton", () => {
  test("renders children and has button role/tabIndex", () => {
    render(<DivButton onClick={() => {}}>Click me</DivButton>);

    const button = screen.getByRole("button", { name: /click me/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("tabindex", "0");
  });

  test("calls onClick when clicked", () => {
    const handleClick = jest.fn();

    render(<DivButton onClick={handleClick}>Click me</DivButton>);

    const button = screen.getByRole("button", { name: /click me/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("calls onClick when Enter key is pressed", () => {
    const handleClick = jest.fn();

    render(<DivButton onClick={handleClick}>Press Enter</DivButton>);

    const button = screen.getByRole("button", { name: /press enter/i });

    fireEvent.keyDown(button, { key: "Enter" });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("calls onClick when Space key is pressed", () => {
    const handleClick = jest.fn();

    render(<DivButton onClick={handleClick}>Press Space</DivButton>);

    const button = screen.getByRole("button", { name: /press space/i });

    // Space key is " "
    fireEvent.keyDown(button, { key: " " });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("does not call onClick for other keys", () => {
    const handleClick = jest.fn();

    render(<DivButton onClick={handleClick}>Other key</DivButton>);

    const button = screen.getByRole("button", { name: /other key/i });

    fireEvent.keyDown(button, { key: "a" });
    fireEvent.keyDown(button, { key: "ArrowDown" });

    expect(handleClick).not.toHaveBeenCalled();
  });

  test("applies className and merges style with cursor: pointer", () => {
    const customStyle = { color: "red" };

    render(
      <DivButton
        onClick={() => {}}
        className="my-button"
        style={customStyle}
      >
        Styled
      </DivButton>
    );

    const button = screen.getByRole("button", { name: /styled/i });

    expect(button).toHaveClass("my-button");
    expect(button).toHaveStyle("cursor: pointer");
    expect(button).toHaveStyle("color: red");
  });
});
