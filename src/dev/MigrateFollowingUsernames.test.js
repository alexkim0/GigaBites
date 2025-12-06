/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MigrateFollowingUsernames from "./MigrateFollowingUsernames";

// --- Mock Firestore functions ---
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
} from "firebase/firestore";

// --- Mock db ---
jest.mock("../config/firebase-config", () => ({
  db: {},
}));

// --- Utility to build mock snapshots ---
const mockSnap = (docs) => ({
  size: docs.length,
  empty: docs.length === 0,
  docs: docs.map((d) => ({
    id: d.id,
    data: () => d.data,
    ref: { path: d.path },
  })),
});

describe("MigrateFollowingUsernames", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("runs migration and updates missing following docs", async () => {
    // --------------------------
    // 1) Mock /user/*      (two users)
    // --------------------------
    collection
      .mockReturnValueOnce("userCollection") // getDocs(user)
      .mockReturnValueOnce("followingForUserA") // getDocs(user/A/following)
      .mockReturnValueOnce("followingForUserB"); // getDocs(user/B/following)

    getDocs
      // users collection
      .mockResolvedValueOnce(
        mockSnap([
          { id: "A", data: {}, path: "user/A" },
          { id: "B", data: {}, path: "user/B" },
        ])
      )

      // following for user A → 1 doc missing user_name
      .mockResolvedValueOnce(
        mockSnap([
          {
            id: "targetX",
            path: "user/A/following/targetX",
            data: { targetUid: "X" },
          },
        ])
      )

      // following for user B → already has data (should skip)
      .mockResolvedValueOnce(
        mockSnap([
          {
            id: "targetY",
            path: "user/B/following/targetY",
            data: { targetUid: "Y", user_name: "AlreadyThere", photoURL: null },
          },
        ])
      );

    // -----------------------------------------
    // 2) Mock target user documents (user/X, user/Y)
    // -----------------------------------------
    doc
      .mockReturnValueOnce("doc-user-X") // doc(db, "user", "X")
      .mockReturnValueOnce("doc-user-Y"); // doc(db, "user", "Y")

    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ user_name: "UserX", photoURL: "picX" }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ user_name: "UserY", photoURL: "picY" }),
      });

    // updateDoc should be called once (only user A’s following doc is missing data)
    updateDoc.mockResolvedValueOnce();

    // -----------------------------------------
    // 3) Render and run migration
    // -----------------------------------------
    render(<MigrateFollowingUsernames />);

    const button = screen.getByRole("button", { name: /run migration/i });
    fireEvent.click(button);

    // Wait for summary to appear
    await waitFor(() =>
      expect(screen.getByText(/Summary:/)).toBeInTheDocument()
    );

    // -----------------------------------------
    // 4) Assertions
    // -----------------------------------------

    // Summary counts
    expect(screen.getByText(/Updated docs: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Skipped \(already had data\): 1/)).toBeInTheDocument();
    expect(screen.getByText(/Errors: 0/)).toBeInTheDocument();

    // updateDoc called with correct ref + data
    expect(updateDoc).toHaveBeenCalledTimes(1);

    const [refArg, dataArg] = updateDoc.mock.calls[0];

    // refArg is the followRef object we put in mockSnap: { path: "user/A/following/targetX" }
    expect(refArg.path).toBe("user/A/following/targetX");

    expect(dataArg).toEqual({
    targetUid: "X",
    user_name: "UserX",
    photoURL: "picX",
    });

    // log should contain migration steps
    expect(screen.getByText(/Starting migration/i)).toBeInTheDocument();
    expect(screen.getByText(/Found 2 user docs/i)).toBeInTheDocument();
    expect(screen.getByText(/Updated following doc/i)).toBeInTheDocument();
  });

  test("handles missing target user and logs skip", async () => {
    // Mock users list
    collection.mockReturnValueOnce("userCollection");
    collection.mockReturnValueOnce("followingCol");

    getDocs
      .mockResolvedValueOnce(
        mockSnap([{ id: "A", data: {}, path: "user/A" }])
      )
      .mockResolvedValueOnce(
        mockSnap([{ id: "MISSING", data: {}, path: "user/A/following/MISSING" }])
      );

    doc.mockReturnValueOnce("doc-missing");

    getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({}),
    });

    render(<MigrateFollowingUsernames />);

    fireEvent.click(screen.getByRole("button", { name: /run migration/i }));

    await waitFor(() =>
      expect(screen.getByText(/does not exist/i)).toBeInTheDocument()
    );

    expect(screen.getByText(/Skipped \(already had data\): 1/)).toBeInTheDocument();
  });
});
