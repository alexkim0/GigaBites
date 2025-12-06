/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useFollowingList } from "./UseFollowingList";

// --- Mock Firebase config (db) ---
jest.mock("../config/firebase-config", () => ({
  db: {}, // we don't need a real db, just a placeholder
}));

// --- Mock Firestore functions used in the hook ---
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
}));

import { collection, onSnapshot } from "firebase/firestore";

describe("useFollowingList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns empty lists and does not subscribe when currentUid is missing", () => {
    const { result } = renderHook(() => useFollowingList(null));

    expect(onSnapshot).not.toHaveBeenCalled();
    expect(result.current.following).toEqual([]);
    expect(result.current.rawFollowing).toEqual([]);
  });

  test("subscribes to /user/{uid}/following and sets following list", async () => {
    const mockUnsub = jest.fn();

    // Fake snapshot data
    const fakeSnap = {
      docs: [
        {
          id: "u1",
          data: () => ({ user_name: "Alice", photoURL: "alice.png" }),
        },
        {
          id: "u2",
          data: () => ({ user_name: "Bob", photoURL: "bob.png" }),
        },
      ],
    };

    collection.mockReturnValue("mockCollectionRef");
    onSnapshot.mockImplementation((_colRef, onNext, _onError) => {
      // Immediately call the "next" handler with our fake snapshot
      onNext(fakeSnap);
      return mockUnsub;
    });

    const { result, unmount } = renderHook(() =>
      useFollowingList("currentUser123")
    );

    await waitFor(() => {
      expect(result.current.rawFollowing).toHaveLength(2);
    });

    // Check collection path and subscription
    expect(collection).toHaveBeenCalledWith(
      expect.any(Object), // db
      "user",
      "currentUser123",
      "following"
    );
    expect(onSnapshot).toHaveBeenCalledWith(
      "mockCollectionRef",
      expect.any(Function),
      expect.any(Function)
    );

    // Check mapped data
    expect(result.current.rawFollowing).toEqual([
      { id: "u1", user_name: "Alice", photoURL: "alice.png" },
      { id: "u2", user_name: "Bob", photoURL: "bob.png" },
    ]);
    // No searchTerm given → filtered == raw
    expect(result.current.following).toEqual(result.current.rawFollowing);

    // Cleanup should call unsubscribe
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });

  test("handles errors from onSnapshot by clearing following list", async () => {
    const mockUnsub = jest.fn();

    collection.mockReturnValue("mockCollectionRef");
    onSnapshot.mockImplementation((_colRef, _onNext, onError) => {
      onError(new Error("Firestore error"));
      return mockUnsub;
    });

    const { result } = renderHook(() => useFollowingList("currentUser123"));

    await waitFor(() => {
      expect(result.current.rawFollowing).toEqual([]);
    });
    expect(result.current.following).toEqual([]);
  });

  test("filters following list by user_name with searchTerm", async () => {
    const fakeSnap = {
      docs: [
        {
          id: "u1",
          data: () => ({ user_name: "Alice", photoURL: "alice.png" }),
        },
        {
          id: "u2",
          data: () => ({ user_name: "Bob", photoURL: "bob.png" }),
        },
        {
          id: "u3",
          data: () => ({ user_name: "ALFRED", photoURL: "alfred.png" }),
        },
      ],
    };

    collection.mockReturnValue("mockCollectionRef");
    onSnapshot.mockImplementation((_colRef, onNext) => {
      onNext(fakeSnap);
      return jest.fn();
    });

    const { result } = renderHook(() =>
      useFollowingList("currentUser123", "al")
    );

    await waitFor(() => {
      // raw list should contain all 3
      expect(result.current.rawFollowing).toHaveLength(3);
    });

    // searchTerm "al" matches Alice & ALFRED (case-insensitive)
    expect(result.current.following).toEqual([
      { id: "u1", user_name: "Alice", photoURL: "alice.png" },
      { id: "u3", user_name: "ALFRED", photoURL: "alfred.png" },
    ]);
  });
});
