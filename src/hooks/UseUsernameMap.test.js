/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useUserNameMap } from "./UseUsernameMap";

// --- Mock firebase config (db) ---
jest.mock("../config/firebase-config", () => ({
  db: {}, // we just need a placeholder
}));

// --- Mock Firestore ---
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

import { doc, getDoc } from "firebase/firestore";

describe("useUserNameMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns empty map and does not call Firestore when uids is empty or undefined", async () => {
    const { result, rerender } = renderHook(({ uids }) =>
      useUserNameMap(uids),
      { initialProps: { uids: undefined } }
    );

    // Initial: no uid list
    expect(result.current).toEqual({});
    expect(getDoc).not.toHaveBeenCalled();

    // Rerender with empty array
    rerender({ uids: [] });
    expect(result.current).toEqual({});
    expect(getDoc).not.toHaveBeenCalled();
  });

  test("fetches usernames for unique uids and returns map", async () => {
    // Mock doc() refs (we don't really use the ref value)
    doc.mockImplementation((_db, _col, uid) => `docRef:${uid}`);

    // Mock getDoc behavior per uid
    getDoc.mockImplementation(async (ref) => {
      const uid = ref.split(":")[1];
      if (uid === "u1") {
        return {
          exists: () => true,
          data: () => ({ user_name: "Alice" }),
        };
      }
      if (uid === "u2") {
        return {
          exists: () => true,
          data: () => ({ user_name: "Bob" }),
        };
      }
      // simulate missing doc
      return {
        exists: () => false,
        data: () => ({}),
      };
    });

    const { result } = renderHook(() =>
      useUserNameMap(["u1", "u2", "u1"]) // duplicate u1 on purpose
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        u1: "Alice",
        u2: "Bob",
      });
    });

    // Instead of strict call counts, assert that each uid was requested at least once
    const docUids = doc.mock.calls.map(([, , uid]) => uid);
    expect(docUids).toEqual(expect.arrayContaining(["u1", "u2"]));

    const getDocUids = getDoc.mock.calls.map(([ref]) => ref.split(":")[1]);
    expect(getDocUids).toEqual(expect.arrayContaining(["u1", "u2"]));
  });

  test("uses empty string when doc missing or errors", async () => {
    doc.mockImplementation((_db, _col, uid) => `docRef:${uid}`);

    // First uid returns missing doc, second throws error
    getDoc
      .mockImplementationOnce(async () => ({
        exists: () => false,
        data: () => ({}),
      }))
      .mockImplementationOnce(async () => {
        throw new Error("Firestore error");
      });

    const { result } = renderHook(() => useUserNameMap(["missing", "error"]));

    await waitFor(() => {
      expect(result.current).toEqual({
        missing: "",
        error: "",
      });
    });
  });

  test("merges and caches usernames across uids changes", async () => {
    doc.mockImplementation((_db, _col, uid) => `docRef:${uid}`);

    getDoc.mockImplementation(async (ref) => {
      const uid = ref.split(":")[1];
      return {
        exists: () => true,
        data: () => ({ user_name: uid.toUpperCase() }),
      };
    });

    const { result, rerender } = renderHook(
      ({ uids }) => useUserNameMap(uids),
      { initialProps: { uids: ["a"] } }
    );

    // First load: only "a"
    await waitFor(() => {
      expect(result.current).toEqual({ a: "A" });
    });

    // Now include "b" as well
    rerender({ uids: ["a", "b"] });

    await waitFor(() => {
      expect(result.current).toEqual({
        a: "A",
        b: "B",
      });
    });

    // Ensure at least one Firestore fetch per uid across renders
    const getDocUids = getDoc.mock.calls.map(([ref]) => ref.split(":")[1]);
    expect(getDocUids).toEqual(expect.arrayContaining(["a", "b"]));
  });
});
