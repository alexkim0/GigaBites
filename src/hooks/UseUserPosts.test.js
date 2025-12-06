/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { UseUserPosts } from "./UseUserPosts";

// ------------------- MOCK FIREBASE CONFIG -------------------
jest.mock("../config/firebase-config", () => ({
  db: {},
  auth: { currentUser: { uid: "me123" } },
}));

// ------------------- MOCK FIRESTORE -------------------
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn((...args) => ({ where: args })),
  orderBy: jest.fn((...args) => ({ orderBy: args })),
  limit: jest.fn((n) => ({ limit: n })),
  startAfter: jest.fn((cursor) => ({ startAfter: cursor })),
  getDocs: jest.fn(),
}));

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";

describe("UseUserPosts", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Always return a non-null collection/query so baseQuery is truthy
    collection.mockReturnValue("COLLECTION(post)");
    query.mockImplementation((...args) => ({ q: args }));
  });

  // Utility for mock snapshots
  const mockSnap = (docs) => ({
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d,
    })),
  });

  test("loads first page automatically for a profile", async () => {
    const firstPage = [
      { id: "p1", post_caption: "Hello" },
      { id: "p2", post_caption: "World" },
    ];

    getDocs.mockResolvedValueOnce(mockSnap(firstPage));

    const { result } = renderHook(() => UseUserPosts("user123"));

    await waitFor(() =>
      expect(result.current.posts.map((p) => p.id)).toEqual(["p1", "p2"])
    );

    // With default pageSize=18 and 2 docs, hasMore becomes false by design.
    expect(result.current.loading).toBe(false);
  });

  test("applies visibility rule when viewing another user's profile", async () => {
    const page = [
      { id: "p10", post_caption: "Public", post_visibility: "public" },
    ];

    getDocs.mockResolvedValueOnce(mockSnap(page));

    const { result } = renderHook(() => UseUserPosts("someoneElse"));

    await waitFor(() =>
      expect(result.current.posts.map((p) => p.id)).toEqual(["p10"])
    );

    const whereFields = where.mock.calls.map((c) => c[0]);
    expect(whereFields).toContain("post_authorId");
    expect(whereFields).toContain("post_visibility");
  });

  test("does NOT apply visibility filter for my own profile", async () => {
    const page = [
      { id: "a1", post_caption: "Mine 1" },
      { id: "a2", post_caption: "Mine 2" },
    ];

    getDocs.mockResolvedValueOnce(mockSnap(page));

    const { result } = renderHook(() => UseUserPosts("me123"));

    await waitFor(() =>
      expect(result.current.posts.map((p) => p.id)).toEqual(["a1", "a2"])
    );

    const whereFields = where.mock.calls.map((c) => c[0]);
    expect(whereFields).toContain("post_authorId");
    expect(whereFields).not.toContain("post_visibility"); // own profile → no visibility filter
  });

  test("pagination: loadMore() fetches next page and appends unique posts", async () => {
    const firstPage = [
      { id: "p1", post_caption: "A" },
      { id: "p2", post_caption: "B" },
    ];
    const secondPage = [
      { id: "p3", post_caption: "C" },
      { id: "p4", post_caption: "D" },
    ];

    // pageSize=2 so hasMore stays true after first page
    getDocs
      .mockResolvedValueOnce(mockSnap(firstPage))  // initial auto-load
      .mockResolvedValueOnce(mockSnap(secondPage)); // loadMore

    const { result } = renderHook(() => UseUserPosts("user123", 2));

    await waitFor(() =>
      expect(result.current.posts.map((p) => p.id)).toEqual(["p1", "p2"])
    );

    await act(async () => {
      await result.current.loadMore();
    });

    const ids = result.current.posts.map((p) => p.id);
    expect(ids).toEqual(["p1", "p2", "p3", "p4"]);
  });

  test("when fewer than pageSize docs returned on first page, hasMore becomes false", async () => {
    // pageSize=2, only 1 doc → hasMore should be false
    getDocs.mockResolvedValueOnce(mockSnap([{ id: "p1" }]));

    const { result } = renderHook(() => UseUserPosts("user123", 2));

    await waitFor(() =>
      expect(result.current.posts.map((p) => p.id)).toEqual(["p1"])
    );

    expect(result.current.hasMore).toBe(false);

    // loadMore should be a no-op (getDocs still called only once)
    await act(async () => {
      await result.current.loadMore();
    });
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  test("prevents duplicates when loading more pages", async () => {
    const first = [{ id: "p1" }, { id: "p2" }];
    const second = [{ id: "p2" }, { id: "p3" }]; // duplicate p2

    getDocs
      .mockResolvedValueOnce(mockSnap(first))
      .mockResolvedValueOnce(mockSnap(second));

    const { result } = renderHook(() => UseUserPosts("user123", 2));

    await waitFor(() =>
      expect(result.current.posts.map((p) => p.id)).toEqual(["p1", "p2"])
    );

    await act(async () => {
      await result.current.loadMore();
    });

    const ids = result.current.posts.map((p) => p.id);
    expect(ids).toEqual(["p1", "p2", "p3"]); // p2 not duplicated
  });

    test("resets paging when profileId changes", async () => {
    // First profile: userA
    getDocs.mockResolvedValueOnce(mockSnap([{ id: "a1" }]));

    const { result, rerender } = renderHook(
      ({ id }) => UseUserPosts(id),
      { initialProps: { id: "userA" } }
    );

    // Ensure initial posts loaded for userA
    await waitFor(() =>
      expect(result.current.posts.map((p) => p.id)).toEqual(["a1"])
    );

    // Now change to a different profile
    rerender({ id: "userB" });

    // We only care that paging state is reset: posts should be cleared
    await waitFor(() =>
      expect(result.current.posts).toEqual([])
    );
  });
});
