// src/components/FollowListPanel.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FollowListPanel from "./FollowListPanel";

// -------------------------
// Mock react-router-dom
// -------------------------
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

// -------------------------
// Mock Follows API
// -------------------------
const mockWatchFollowers = jest.fn();
const mockWatchFollowing = jest.fn();

jest.mock("../../lib/Follows", () => ({
  watchFollowers: (...args) => mockWatchFollowers(...args),
  watchFollowing: (...args) => mockWatchFollowing(...args),
}));

// Mock child components (DivButton + FollowButton) to simplify rendering
jest.mock("../../components/DivButton", () => ({ children, ...props }) => (
  <div data-testid="div-button" {...props}>{children}</div>
));

jest.mock("../../components/FollowButton/FollowButton", () => (props) => (
  <div data-testid="follow-button">FollowButton Mock</div>
));

describe("FollowListPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: watchers call setItems([]) and return unsubscribe
    mockWatchFollowers.mockImplementation((_uid, cb) => {
      cb([]); 
      return () => {};
    });

    mockWatchFollowing.mockImplementation((_uid, cb) => {
      cb([]);
      return () => {};
    });
  });

  test("renders correct title for followers mode", () => {
    render(<FollowListPanel mode="followers" userId="user1" />);

    expect(screen.getByText("Followers")).toBeInTheDocument();
  });

  test("renders correct title for following mode", () => {
    render(<FollowListPanel mode="following" userId="user1" />);

    expect(screen.getByText("Following")).toBeInTheDocument();
  });

  test("renders empty state when no items", () => {
    render(<FollowListPanel mode="followers" userId="user1" />);

    expect(screen.getByText(/No followers yet/i)).toBeInTheDocument();
  });

  test("loads followers from watchFollowers", () => {
    mockWatchFollowers.mockImplementation((_uid, cb) => {
      cb([
        {
          uid: "u1",
          profile: { user_name: "alice", user_pfp: "" },
          user_follower: 10,
        },
      ]);
      return () => {};
    });

    render(<FollowListPanel mode="followers" userId="user123" />);

    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toBeInTheDocument();
  });

  test("loads following list from watchFollowing", () => {
    mockWatchFollowing.mockImplementation((_uid, cb) => {
      cb([
        {
          uid: "u2",
          profile: { user_name: "bob", user_pfp: "" },
          user_follower: 20,
        },
      ]);
      return () => {};
    });

    render(<FollowListPanel mode="following" userId="user456" />);

    expect(screen.getByText("@bob")).toBeInTheDocument();
  });

  test("clicking a username navigates to the profile and calls onCloseModal", () => {
    const onCloseModal = jest.fn();

    mockWatchFollowers.mockImplementation((_uid, cb) => {
      cb([
        {
          uid: "u3",
          profile: { user_name: "charlie", user_pfp: "" },
          user_follower: 5,
        },
      ]);
      return () => {};
    });

    render(
      <FollowListPanel
        mode="followers"
        userId="userABC"
        onCloseModal={onCloseModal}
      />
    );

    // The username is rendered inside our mocked DivButton wrapper
    const nameDiv = screen.getByText("@charlie");

    fireEvent.click(nameDiv);

    expect(onCloseModal).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/profilepage/u3");
  });
});
