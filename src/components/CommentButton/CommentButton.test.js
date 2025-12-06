// src/components/CommentButton/CommentButton.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CommentButton from "./CommentButton";

describe("CommentButton", () => {
  test("renders with default count 0 when no count prop is given", () => {
    render(<CommentButton onToggle={() => {}} />);

    const button = screen.getByRole("button");

    // Text should show the count (default 0)
    expect(button).toHaveTextContent("0");
    // Has the expected title attribute
    expect(button).toHaveAttribute("title", "Comments");
    // Has the CSS class
    expect(button).toHaveClass("comment-btn");
  });

  test("renders with provided count", () => {
    render(<CommentButton count={5} onToggle={() => {}} />);

    const button = screen.getByRole("button");

    expect(button).toHaveTextContent("5");
  });

  test("calls onToggle when clicked", () => {
    const onToggle = jest.fn();

    render(<CommentButton count={3} onToggle={onToggle} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("can be clicked multiple times without error", () => {
    const onToggle = jest.fn();

    render(<CommentButton count={1} onToggle={onToggle} />);

    const button = screen.getByRole("button");

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledTimes(3);
  });
});
