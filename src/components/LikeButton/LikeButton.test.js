// src/components/LikeButton/LikeButton.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LikeButton from "./LikeButton";

// Mock Firebase auth and Likes helpers
jest.mock("../../config/firebase-config", () => ({
  auth: {
    currentUser: { uid: "test-user-id" },
  },
}));

jest.mock("../../lib/Likes", () => ({
  toggleLike: jest.fn(),
  watchIsLiked: jest.fn(),
  watchLikeCount: jest.fn(),
}));

// pull the mocked functions so we can configure them
import { toggleLike, watchIsLiked, watchLikeCount } from "../../lib/Likes";

beforeEach(() => {
  jest.clearAllMocks();

  // Default: watchers do nothing, just return an unsubscribe function
  watchIsLiked.mockImplementation(() => () => {});
  watchLikeCount.mockImplementation(() => () => {});
});

describe("LikeButton", () => {
  test("renders initial count and is not liked by default", () => {
    render(<LikeButton postId="post-1" initialCount={3} />);

    const button = screen.getByRole("button");

    // text includes the like count
    expect(button).toHaveTextContent("3");

    // should not have the 'liked' class initially
    expect(button).not.toHaveClass("liked");

    // uses the unfilled heart icon class when not liked
    const icon = button.querySelector("i");
    expect(icon).toHaveClass("bx", "bx-heart");
  });

  test("clicking the button increments count and calls toggleLike", async () => {
    toggleLike.mockResolvedValueOnce(); // pretend it succeeds

    render(<LikeButton postId="post-123" initialCount={0} />);

    const button = screen.getByRole("button");

    // Click the like button
    fireEvent.click(button);

    // Optimistic UI: count should update immediately
    expect(button).toHaveTextContent("1");

    // toggleLike should be called with postId and userId
    expect(toggleLike).toHaveBeenCalledTimes(1);
    expect(toggleLike).toHaveBeenCalledWith("post-123", "test-user-id");
  });

  test("component starts in liked state if watchIsLiked reports true", () => {
    // make the watcher immediately set liked = true
    watchIsLiked.mockImplementation((_postId, _userId, setLiked) => {
      setLiked(true);
      return () => {};
    });

    render(<LikeButton postId="post-1" initialCount={5} />);

    const button = screen.getByRole("button");
    const icon = button.querySelector("i");

    // button reflects liked state
    expect(button).toHaveClass("liked");
    expect(icon).toHaveClass("bx", "bxs-heart");
    expect(button).toHaveAttribute("title", "Unlike");
  });

  test("unliking decrements the count when already liked", () => {
    // Start as liked (watcher sets liked = true)
    watchIsLiked.mockImplementation((_postId, _userId, setLiked) => {
      setLiked(true);
      return () => {};
    });

    toggleLike.mockResolvedValueOnce();

    render(<LikeButton postId="post-1" initialCount={10} />);

    const button = screen.getByRole("button");

    // initial liked state from watcher
    expect(button).toHaveClass("liked");
    expect(button).toHaveTextContent("10");

    // click to unlike
    fireEvent.click(button);

    // optimistic UI: count should go down
    expect(button).toHaveTextContent("9");
    expect(button).not.toHaveClass("liked");
  });

  test("reverts like state and count if toggleLike fails", async () => {
    toggleLike.mockRejectedValueOnce(new Error("Network error"));

    render(<LikeButton postId="post-1" initialCount={0} />);

    const button = screen.getByRole("button");

    // click to like
    fireEvent.click(button);

    // optimistic UI: immediately increments
    expect(button).toHaveTextContent("1");
    expect(button).toHaveClass("liked");

    // after the promise rejects, state should revert
    await waitFor(() => {
      expect(button).toHaveTextContent("0");
      expect(button).not.toHaveClass("liked");
      expect(button).toBeEnabled();
    });
  });

  test("does nothing when busy to prevent double-clicks", () => {
    // Make toggleLike never resolve so 'busy' stays true
    toggleLike.mockImplementation(
      () => new Promise(() => {}) // pending promise
    );

    render(<LikeButton postId="post-1" initialCount={0} />);

    const button = screen.getByRole("button");

    // First click -> sets busy = true, calls toggleLike once
    fireEvent.click(button);

    // Second click while busy should be ignored
    fireEvent.click(button);

    expect(toggleLike).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });
});
