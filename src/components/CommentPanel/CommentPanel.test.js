// src/components/CommentPanel.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CommentPanel from "./CommentPanel";

// -------------------------
// Mock Firebase auth
// -------------------------
jest.mock("../../config/firebase-config", () => ({
  auth: {
    currentUser: { uid: "test-user-id" }
  }
}));

// -------------------------
// Mock Comments API
// -------------------------
const mockAddComment = jest.fn();
const mockWatchComments = jest.fn();

jest.mock("../../lib/Comments", () => ({
  addComment: (...args) => mockAddComment(...args),
  watchComments: (...args) => mockWatchComments(...args)
}));

describe("CommentPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default watchComments behavior = immediately call callback with an empty list
    mockWatchComments.mockImplementation((_postId, callback) => {
      callback([]);
      return () => {}; // unsubscribe
    });
  });

  test("renders header and Close button", () => {
    render(<CommentPanel postId="post1" onClose={() => {}} />);

    expect(screen.getByText("Comments")).toBeInTheDocument();
    expect(screen.getByTitle("Close")).toBeInTheDocument();
  });

  test("calls onClose when Close button is clicked", () => {
    const onClose = jest.fn();

    render(<CommentPanel postId="post1" onClose={onClose} />);

    fireEvent.click(screen.getByTitle("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

    test("starts by rendering no comments", () => {
    const { container } = render(
      <CommentPanel postId="post123" onClose={() => {}} />
    );

    // The comments list container exists
    const list = container.querySelector(".cp-list");
    expect(list).toBeInTheDocument();

    // No comment items are rendered initially
    const items = container.querySelectorAll(".cp-item");
    expect(items.length).toBe(0);
  });


  test("renders comments from watchComments", async () => {
    mockWatchComments.mockImplementation((_postId, callback) => {
      callback([
        { id: "1", username: "alice123", text: "hello" },
        { id: "2", username: "bobzzz", text: "goodbye" }
      ]);
      return () => {};
    });

    render(<CommentPanel postId="postABC" onClose={() => {}} />);

    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/hello/i)).toBeInTheDocument();
    expect(screen.getByText(/bobzzz/i)).toBeInTheDocument();
    expect(screen.getByText(/goodbye/i)).toBeInTheDocument();
  });

  test("does NOT submit when input is empty", async () => {
    render(<CommentPanel postId="post1" onClose={() => {}} />);

    fireEvent.click(screen.getByText("Send"));

    expect(mockAddComment).not.toHaveBeenCalled();
  });

  test("submits a comment when text is entered", async () => {
    mockAddComment.mockResolvedValueOnce();

    render(<CommentPanel postId="post1" onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/write a comment/i);
    const button = screen.getByText("Send");

    fireEvent.change(input, { target: { value: "Nice post!" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith(
        "post1",
        "test-user-id",
        "Nice post!"
      );
    });
  });

  test("clears the input after successful submit", async () => {
    mockAddComment.mockResolvedValueOnce();

    render(<CommentPanel postId="post1" onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/write a comment/i);

    fireEvent.change(input, { target: { value: "Hello!" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => expect(mockAddComment).toHaveBeenCalled());

    expect(input.value).toBe("");
  });
});
