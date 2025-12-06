/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Feed } from "./Feedpage";

// --- Mock firebase config (db + auth) ---
jest.mock("../../config/firebase-config", () => ({
  db: {},
  auth: { currentUser: { uid: "me123" } },
}));

// --- Mock Firestore ---
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

// --- Mock child components ---
jest.mock("../../components/LikeButton/LikeButton", () => ({
  __esModule: true,
  default: ({ postId, initialCount }) => (
    <button data-testid="like-button">
      Like {postId}:{initialCount}
    </button>
  ),
}));

jest.mock("../../components/CommentPanel/CommentPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="comment-panel">Comments</div>,
}));

// IntersectionObserver is used for active card detection – mock it
beforeAll(() => {
  class IO {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-ignore
  global.IntersectionObserver = IO;
});

// Minimal navigator stubs
beforeAll(() => {
  Object.assign(navigator, {
    share: undefined,
    clipboard: { writeText: jest.fn() },
  });
});

describe("Feedpage Feed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders posts from Firestore snapshot and hides loader", async () => {
    // Mock Firestore query setup
    collection.mockReturnValue("postCollection");
    where.mockReturnValue("where");
    orderBy.mockReturnValue("orderBy");
    query.mockReturnValue("queryObj");

    // When Feed subscribes, immediately call the snapshot callback once
    onSnapshot.mockImplementation((_q, onNext) => {
      const snap = {
        docs: [
          {
            id: "p1",
            data: () => ({
              post_authorId: "u1",
              post_caption: "Yum!",
              post_stars: 4,
              post_likeCount: 3,
              post_commentCount: 2,
              post_date: { seconds: 0 },
              post_visibility: "public",
              post_media: [
                {
                  downloadURL: "https://example.com/img.jpg",
                  mimeType: "image/jpeg",
                },
              ],
              post_restaurant: {
                name: "Sushi Place",
                lat: 1,
                lng: 2,
                placeId: "place123",
              },
              post_categories: ["Japanese"],
            }),
          },
        ],
      };
      onNext(snap);
      return jest.fn(); // unsubscribe
    });

    // Author profile lookup
    doc.mockReturnValue("userDocRef");
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ user_name: "Alice", user_pfp: "avatar.png" }),
    });

    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <Feed />
      </MemoryRouter>
    );

    // Wait for normalized posts to be built and rendered
    await waitFor(() =>
      expect(screen.getByText("Sushi Place")).toBeInTheDocument()
    );

    // Caption
    expect(screen.getByText("Yum!")).toBeInTheDocument();

    // Like/comment counts chip
    expect(screen.getByText(/❤ 3 · 💬 2/)).toBeInTheDocument();

    // Author handle
    expect(screen.getByText(/@Alice/)).toBeInTheDocument();

    // Loader should be gone (no element whose text contains "Loading")
    const maybeLoader = screen.queryByText((_, node) => {
      const text = node.textContent || "";
      return text.toLowerCase().includes("loading");
    });
    expect(maybeLoader).toBeNull();
  });

  test("shows place filter banner when placeId query param is present", () => {
    onSnapshot.mockImplementation(() => jest.fn());

    render(
      <MemoryRouter
        initialEntries={["/feed?placeId=abc123&name=Sushi%20Heaven"]}
      >
        <Feed />
      </MemoryRouter>
    );

    expect(screen.getByText(/showing posts for/i)).toBeInTheDocument();
    expect(screen.getByText(/Sushi Heaven/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });
});
