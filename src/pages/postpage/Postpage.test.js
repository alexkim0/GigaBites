// src/pages/postpage/Postpage.test.js
// Tests for Postpage.js :contentReference[oaicite:0]{index=0}

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import Postpage from "./Postpage";

// ----------------------------
// Mock react-router-dom
// ----------------------------
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ postId: "testPostId" }),
}));

// ----------------------------
// Mock child components
// ----------------------------
jest.mock("../../components/LikeButton/LikeButton", () => () => (
  <div data-testid="mock-like-btn">LIKE</div>
));
jest.mock("../../components/DivButton", () => (props) => (
  <button onClick={props.onClick}>{props.children}</button>
));
jest.mock("../../components/CommentPanel/CommentPanel", () => () => (
  <div data-testid="mock-comment-panel">COMMENTS</div>
));

// ----------------------------
// Mock Firebase
// ----------------------------
const mockOnSnapshot = jest.fn();
const mockGetDoc = jest.fn();
const mockDeleteDoc = jest.fn();

jest.mock("../../config/firebase-config", () => ({
  auth: { currentUser: { uid: "user123" } },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((...args) => ({ path: args.join("/") })),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  getDoc: (...args) => mockGetDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
}));

// Hold the callbacks passed into onSnapshot
let snapshotSuccess;
let snapshotError;

// Helper to create a fake snapshot
const makeSnap = (data, exists = true) => ({
  exists: () => exists,
  id: "testPostId",
  data: () => data,
});

beforeEach(() => {
  jest.clearAllMocks();
  snapshotSuccess = undefined;
  snapshotError = undefined;

  // default: just capture callbacks; don't call them yet
  mockOnSnapshot.mockImplementation((ref, onSuccess, onErr) => {
    snapshotSuccess = onSuccess;
    snapshotError = onErr;
    return () => {}; // unsubscribe fn
  });
});

// ----------------------------
// STATE RENDER TESTS
// ----------------------------
test("renders loading state initially", () => {
  render(<Postpage />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test("renders 'Post not found' if snapshot document does not exist", async () => {
  render(<Postpage />);

  // wait until onSnapshot is subscribed
  await waitFor(() => expect(snapshotSuccess).toBeDefined());

  act(() => {
    snapshotSuccess(makeSnap({}, false));
  });

  expect(screen.getByText(/post not found/i)).toBeInTheDocument();
});

test("renders 'forbidden' when visibility is not public and user is not owner", async () => {
  render(<Postpage />);

  await waitFor(() => expect(snapshotSuccess).toBeDefined());

  act(() => {
    snapshotSuccess(
      makeSnap({
        post_visibility: "private",
        post_authorId: "someone_else",
        post_caption: "hello",
      })
    );
  });

  expect(screen.getByText(/don’t have access/i)).toBeInTheDocument();
});

test("renders error state when onSnapshot fails", () => {
  // override implementation for this test
  mockOnSnapshot.mockImplementation((ref, onSuccess, onErr) => {
    onErr(new Error("fail"));
    return () => {};
  });

  render(<Postpage />);

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});

// ----------------------------
// NORMAL POST RENDER
// ----------------------------
test("renders post when snapshot loads valid data", async () => {
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ user_name: "AuthorUser", user_pfp: "" }),
  });

  render(<Postpage />);

  await waitFor(() => expect(snapshotSuccess).toBeDefined());

  act(() => {
    snapshotSuccess(
      makeSnap({
        post_visibility: "public",
        post_authorId: "user123", // owner
        post_caption: "My Post!",
        post_likeCount: 5,
        post_commentCount: 2,
        post_media: [{ downloadURL: "img.jpg", mimeType: "image/jpeg" }],
        post_type: "image",
        post_stars: 4,
      })
    );
  });

  const commentEls = screen.getAllByText(/💬 2/);
    expect(commentEls.length).toBeGreaterThan(0);

});

// ----------------------------
// COMMENT PANEL TOGGLE
// ----------------------------
test("opens comment panel when comment button clicked", async () => {
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ user_name: "Author", user_pfp: "" }),
  });

  render(<Postpage />);

  await waitFor(() => expect(snapshotSuccess).toBeDefined());

  act(() => {
    snapshotSuccess(
      makeSnap({
        post_visibility: "public",
        post_authorId: "user123",
        post_caption: "Hi",
        post_commentCount: 3,
        post_likeCount: 1,
        post_media: [],
        post_type: "image",
      })
    );
  });

  const btn = await screen.findByTitle("Comments");
  fireEvent.click(btn);

  expect(screen.getByTestId("mock-comment-panel")).toBeInTheDocument();
});

// ----------------------------
// DELETE POST BEHAVIOR
// ----------------------------
test("deletes post when owner confirms", async () => {
  window.confirm = jest.fn(() => true);
  mockDeleteDoc.mockResolvedValue();

  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ user_name: "Author", user_pfp: "" }),
  });

  render(<Postpage />);

  await waitFor(() => expect(snapshotSuccess).toBeDefined());

  act(() => {
    snapshotSuccess(
      makeSnap({
        post_visibility: "public",
        post_authorId: "user123", // owner
        post_caption: "delete me",
        post_likeCount: 0,
        post_commentCount: 0,
        post_media: [],
        post_type: "image",
      })
    );
  });

  const deleteBtn = await screen.findByTitle("Delete post");
  fireEvent.click(deleteBtn);

  await waitFor(() => {
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/feed");
  });
});

test("does not delete post if cancel is pressed", async () => {
  window.confirm = jest.fn(() => false);

  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ user_name: "Author", user_pfp: "" }),
  });

  render(<Postpage />);

  await waitFor(() => expect(snapshotSuccess).toBeInTheDocument);

  act(() => {
    snapshotSuccess(
      makeSnap({
        post_visibility: "public",
        post_authorId: "user123",
        post_caption: "delete me",
        post_media: [],
        post_type: "image",
      })
    );
  });

  const deleteBtn = await screen.findByTitle("Delete post");
  fireEvent.click(deleteBtn);

  expect(mockDeleteDoc).not.toHaveBeenCalled();
});

// ----------------------------
// MAP BUTTON
// ----------------------------
test("navigates to map page when location button clicked", async () => {
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ user_name: "Author", user_pfp: "" }),
  });

  render(<Postpage />);

  await waitFor(() => expect(snapshotSuccess).toBeDefined());

  act(() => {
    snapshotSuccess(
      makeSnap({
        post_visibility: "public",
        post_authorId: "user123",
        post_caption: "hello",
        post_media: [],
        post_type: "image",
        post_likeCount: 0,
        post_commentCount: 0,
        post_stars: 3,
        post_restaurant: {
          name: "Food Place",
          lat: 10,
          lng: 20,
          placeId: "xyz",
        },
      })
    );
  });

  const mapBtn = await screen.findByTitle("View on map");
  fireEvent.click(mapBtn);

  expect(mockNavigate).toHaveBeenCalledWith(
    expect.stringContaining("/mapspage?")
  );
});
