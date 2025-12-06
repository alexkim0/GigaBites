// src/pages/profilepage/Profilepage.test.js
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// --- Mocks ---
// react-router-dom
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: jest.fn(),
    useParams: jest.fn(),
  };
});

// firebase config
jest.mock("../../config/firebase-config", () => ({
  auth: { currentUser: null },
  db: {},
}));

// firestore
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// user posts hook
jest.mock("../../hooks/UseUserPosts", () => ({
  UseUserPosts: jest.fn(),
}));

// follower count listener
jest.mock("../../lib/Follows", () => ({
  watchFollowerCount: jest.fn(),
}));

// DivButton -> simple button
jest.mock("../../components/DivButton", () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

// FollowButton -> identifiable stub
jest.mock("../../components/FollowButton/FollowButton", () => {
  return ({ targetUid, initialFollowerCount }) => (
    <button data-testid="follow-button">
      {`Follow ${targetUid} (${initialFollowerCount})`}
    </button>
  );
});

// Modal -> just render children when open
jest.mock("../../components/Modal/Modal", () => {
  return ({ open, children }) =>
    open ? <div data-testid="modal">{children}</div> : null;
});

// FollowListPanel -> show mode & userId
jest.mock("../../components/FollowListPanel/FollowListPanel", () => {
  return ({ mode, userId, onCloseModal }) => (
    <div data-testid="follow-list-panel">
      {mode}-{userId}
      <button onClick={onCloseModal}>Close</button>
    </div>
  );
});

// Import after mocks
import { Profilepage } from "./Profilepage";
import { useNavigate, useParams } from "react-router-dom";
import { UseUserPosts } from "../../hooks/UseUserPosts";
import { watchFollowerCount } from "../../lib/Follows";
import { auth, db } from "../../config/firebase-config";
import { doc, getDoc } from "firebase/firestore";

const mockUseNavigate = useNavigate;
const mockUseParams = useParams;
const mockUseUserPosts = UseUserPosts;
const mockWatchFollowerCount = watchFollowerCount;

describe("Profilepage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParams.mockReturnValue({ uid: "user-123" });
    mockUseNavigate.mockReturnValue(jest.fn());

    auth.currentUser = { uid: "user-123" };

    mockUseUserPosts.mockReturnValue({
      posts: [],
      loadingPost: false,
      hasMore: false,
      loadMore: jest.fn(),
    });

    mockWatchFollowerCount.mockImplementation((uid, cb) => {
      cb(5);
      return jest.fn();
    });

    doc.mockImplementation((dbArg, col, id) => ({
      __db: dbArg,
      __col: col,
      __id: id,
    }));

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        user_name: "Alice",
        user_bio: "Hello world",
        user_pfp: "http://example.com/pfp.jpg",
        user_following: 7,
        user_follower: 3,
      }),
    });
  });

  const renderComponent = () => render(<Profilepage />);

  test("shows login message when no user is logged in", () => {
    auth.currentUser = null;

    renderComponent();

    expect(
      screen.getByText(/you must be logged in to view your profile\./i)
    ).toBeInTheDocument();
  });

  test("shows loading then profile data", async () => {
    const { container } = renderComponent();

    // Loading first
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    // Username & bio
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();

    // Counts
    expect(screen.getByText(/posts: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/follower: 5/i)).toBeInTheDocument();
    expect(screen.getByText(/following: 7/i)).toBeInTheDocument();

    // Profile icon: <img className="pUserIcon" src={photoURL} alt="" />
    const icon = container.querySelector(".pUserIcon");
    expect(icon).toBeInTheDocument();
    expect(icon.getAttribute("src")).toBe("http://example.com/pfp.jpg");
  });

  test("shows 'Profile not found.' when Firestore document is missing", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({}),
    });

    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByText(/profile not found\./i)
      ).toBeInTheDocument()
    );
  });

  test("shows settings button and hides FollowButton on own profile", async () => {
    auth.currentUser = { uid: "user-123" };

    const navigateFn = jest.fn();
    mockUseNavigate.mockReturnValue(navigateFn);

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    // settings button (from DivButton) has text "⚙️"
    expect(screen.getByRole("button", { name: "⚙️" })).toBeInTheDocument();

    expect(screen.queryByTestId("follow-button")).not.toBeInTheDocument();
  });

  test("shows FollowButton and hides settings button on other user's profile", async () => {
    auth.currentUser = { uid: "another-user" };

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    expect(screen.queryByRole("button", { name: "⚙️" })).not.toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toBeInTheDocument();
  });

  test("renders image and video posts and navigates when clicked", async () => {
    const navigateFn = jest.fn();
    mockUseNavigate.mockReturnValue(navigateFn);

    mockUseUserPosts.mockReturnValue({
      posts: [
        {
          id: "post-img",
          post_caption: "A nice picture",
          post_media: [
            {
              mimeType: "image/jpeg",
              downloadURL: "http://example.com/img.jpg",
            },
          ],
        },
        {
          id: "post-vid",
          post_caption: "A cool video",
          post_media: [
            {
              mimeType: "video/mp4",
              downloadURL: "http://example.com/vid.mp4",
            },
          ],
        },
      ],
      loadingPost: false,
      hasMore: false,
      loadMore: jest.fn(),
    });

    const { container } = renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    // image tile: <img ... alt={post_caption} />
    const img = screen.getByAltText("A nice picture");
    expect(img).toHaveAttribute("src", "http://example.com/img.jpg");
    const imgTile = img.closest("button");
    fireEvent.click(imgTile);
    expect(navigateFn).toHaveBeenCalledWith("/postpage/post-img");

    // video tile: look for <video> and its button wrapper
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    const videoTile = video.closest("button");
    fireEvent.click(videoTile);
    expect(navigateFn).toHaveBeenCalledWith("/postpage/post-vid");
  });

  test("shows Load more button when hasMore is true and calls loadMore on click", async () => {
    const loadMoreMock = jest.fn();
    mockUseUserPosts.mockReturnValue({
      posts: [],
      loadingPost: false,
      hasMore: true,
      loadMore: loadMoreMock,
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    const loadMoreBtn = screen.getByRole("button", { name: /load more/i });
    fireEvent.click(loadMoreBtn);

    expect(loadMoreMock).toHaveBeenCalled();
  });

  test("clicking follower and following opens modal with correct mode", async () => {
    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    // Follower link
    fireEvent.click(screen.getByText(/follower:/i));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByTestId("follow-list-panel")).toHaveTextContent(
      "followers-user-123"
    );

    fireEvent.click(screen.getByText(/close/i));
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();

    // Following link
    fireEvent.click(screen.getByText(/following:/i));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByTestId("follow-list-panel")).toHaveTextContent(
      "following-user-123"
    );
  });
});
