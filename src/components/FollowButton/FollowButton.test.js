// src/components/FollowButton.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import FollowButton from "./FollowButton";

// Mock Firebase auth
jest.mock("../../config/firebase-config", () => ({
  auth: {
    currentUser: { uid: "test-user-id" },
  },
}));

// Mock Follows helpers
jest.mock("../../lib/Follows", () => ({
  toggleFollow: jest.fn(),
  watchIsFollowing: jest.fn(),
  watchFollowerCount: jest.fn(),
}));

import { auth } from "../../config/firebase-config";
import {
  toggleFollow,
  watchIsFollowing,
  watchFollowerCount,
} from "../../lib/Follows";

beforeEach(() => {
  jest.clearAllMocks();

  // Default auth user
  auth.currentUser = { uid: "user-1" };

  // Default watchers: no-op, return unsubscribe fn
  watchIsFollowing.mockImplementation(() => () => {});
  watchFollowerCount.mockImplementation(() => () => {});
});

describe("FollowButton", () => {
  test("does not render anything when viewing own profile (isSelf)", () => {
    auth.currentUser = { uid: "same-user" };

    const { container } = render(
      <FollowButton targetUid="same-user" initialFollowerCount={10} />
    );

    expect(container.querySelector("button")).toBeNull();
  });

  test("renders 'Follow' button when not following yet", () => {
    render(
      <FollowButton targetUid="user-2" initialFollowerCount={0} />
    );

    const button = screen.getByRole("button");

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Follow");
    expect(button).toHaveClass("follow-btn");
    expect(button).not.toHaveClass("following");
    expect(button).toHaveAttribute("title", "Follow");
  });

  test("starts in 'Following' state when watchIsFollowing reports true", () => {
    watchIsFollowing.mockImplementation((_targetUid, _userId, setFollowing) => {
      setFollowing(true);
      return () => {};
    });

    render(
      <FollowButton targetUid="user-2" initialFollowerCount={5} />
    );

    const button = screen.getByRole("button");

    expect(button).toHaveTextContent("Following");
    expect(button).toHaveClass("following");
    expect(button).toHaveAttribute("title", "Unfollow");
  });

  test("clicking the button calls toggleFollow and updates UI optimistically", async () => {
    // Not following initially
    watchIsFollowing.mockImplementation((_targetUid, _userId, setFollowing) => {
      setFollowing(false);
      return () => {};
    });

    toggleFollow.mockResolvedValueOnce({ following: true });

    render(
      <FollowButton targetUid="target-user" initialFollowerCount={0} />
    );

    const button = screen.getByRole("button");

    // Click to follow
    fireEvent.click(button);

    // Optimistic UI: text changes immediately
    expect(button).toHaveTextContent("Following");
    expect(toggleFollow).toHaveBeenCalledTimes(1);
    expect(toggleFollow).toHaveBeenCalledWith("target-user", "user-1");

    await waitFor(() => {
      expect(button).toHaveTextContent("Following");
      expect(button).not.toBeDisabled();
    });
  });

  test("reverts state on error from toggleFollow", async () => {
    // Start as not following
    watchIsFollowing.mockImplementation((_targetUid, _userId, setFollowing) => {
      setFollowing(false);
      return () => {};
    });

    toggleFollow.mockRejectedValueOnce(new Error("Network error"));

    render(
      <FollowButton targetUid="target-user" initialFollowerCount={0} />
    );

    const button = screen.getByRole("button");

    // Initial state: Follow
    expect(button).toHaveTextContent("Follow");

    // Click -> optimistic "Following"
    fireEvent.click(button);
    expect(button).toHaveTextContent("Following");

    // After error, should revert to Follow and re-enable
    await waitFor(() => {
      expect(button).toHaveTextContent("Follow");
      expect(button).not.toBeDisabled();
    });
  });

  test("does nothing when busy to prevent double clicks", () => {
    // Make toggleFollow never resolve so busy stays true
    toggleFollow.mockImplementation(
      () => new Promise(() => {}) // pending promise
    );

    render(
      <FollowButton targetUid="target-user" initialFollowerCount={0} />
    );

    const button = screen.getByRole("button");

    // First click: goes busy & calls toggleFollow
    fireEvent.click(button);
    // Second click while busy: should be ignored
    fireEvent.click(button);

    expect(toggleFollow).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });
});
