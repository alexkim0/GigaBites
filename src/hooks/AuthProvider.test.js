// AuthProvider.test.js
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./AuthProvider";

// Mocks
const mockOnAuthStateChanged = jest.fn();
const mockGetDoc = jest.fn();
const mockDoc = jest.fn();

// --- Mock Firebase Auth ---
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
}));

// --- Mock Firestore ---
jest.mock("firebase/firestore", () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
}));

// --- Mock Firebase config file ---
jest.mock("../config/firebase-config", () => ({
  auth: {}, // dummy objects so they exist
  db: {},
}));

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("sets currentUser with userData when a user logs in", async () => {
    const fakeUser = { uid: "123", email: "test@example.com" };
    const fakeUserData = { role: "admin" };

    // Make onAuthStateChanged invoke its callback with fakeUser
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(fakeUser); // simulate sign-in event
      return () => {}; // unsubscribe handler
    });

    // Mock Firestore doc + getDoc return value
    mockDoc.mockReturnValue({ path: "user/123" });

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => fakeUserData,
    });

    const { result } = renderHook(() => useAuth());

    // Wait for async code to finish
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentUser).toEqual({
      ...fakeUser,
      userData: fakeUserData,
    });
  });

  test("sets currentUser to null when no user is logged in", async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null); // simulate logged-out state
      return () => {};
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentUser).toBeNull();
  });

  test("unsubscribe function is returned on unmount", () => {
    const unsubscribeMock = jest.fn();

    // Return mocked unsubscribe function
    mockOnAuthStateChanged.mockImplementation(() => unsubscribeMock);

    const { unmount } = renderHook(() => useAuth());
    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
