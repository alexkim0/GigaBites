// src/pages/homepage/Homepage.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import Homepage from "./Homepage";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { updateDoc, doc } from "firebase/firestore";

// --- Mocks ---

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock DivButton to behave like a simple <button>
jest.mock("../../components/DivButton", () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

// Mock firebase-config (auth + db). We export real objects directly from the factory
// and then import `auth` above to mutate `auth.currentUser` in tests.
jest.mock("../../config/firebase-config", () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock firebase/auth
jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
}));

// Mock firebase/firestore
jest.mock("firebase/firestore", () => ({
  getDocs: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

describe("Homepage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default logged-in user for tests
    auth.currentUser = {
      uid: "user-123",
      email: "test@example.com",
    };
  });

  test("renders interests UI when user is logged in", () => {
    render(<Homepage />);

    // Header text
    expect(
      screen.getByRole("heading", { name: /choose your interests/i })
    ).toBeInTheDocument();

    // Shows signed-in email
    expect(screen.getByText(/signed in as/i)).toHaveTextContent(
      "test@example.com"
    );

    // At least one food option
    expect(
      screen.getByRole("button", { name: /japanese/i })
    ).toBeInTheDocument();
  });

  test("toggles an interest pill selection state", () => {
    render(<Homepage />);

    const japaneseButton = screen.getByRole("button", { name: /japanese/i });

    // Initially not selected
    expect(japaneseButton).toHaveAttribute("aria-pressed", "false");
    expect(japaneseButton).not.toHaveClass("selected");

    // Click to select
    fireEvent.click(japaneseButton);
    expect(japaneseButton).toHaveAttribute("aria-pressed", "true");
    expect(japaneseButton).toHaveClass("selected");

    // Click again to deselect
    fireEvent.click(japaneseButton);
    expect(japaneseButton).toHaveAttribute("aria-pressed", "false");
    expect(japaneseButton).not.toHaveClass("selected");
  });

  test("Next button is disabled when no interests selected and enabled when there are selections", () => {
    render(<Homepage />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeDisabled();

    const japaneseButton = screen.getByRole("button", { name: /japanese/i });
    fireEvent.click(japaneseButton);

    expect(nextButton).not.toBeDisabled();
  });

  test("clicking Next saves interests and navigates to /profileCreation", async () => {
    // Make doc() return a fake document reference so updateDoc's first arg
    // is not undefined.
    const fakeDocRef = { id: "mock-doc" };
    doc.mockReturnValue(fakeDocRef);

    render(<Homepage />);

    // Select one interest
    const japaneseButton = screen.getByRole("button", { name: /japanese/i });
    fireEvent.click(japaneseButton);

    const nextButton = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
    });

    // doc() should be called with db, "user", uid
    expect(doc).toHaveBeenCalledWith(expect.anything(), "user", "user-123");

    // updateDoc called with the user_pref data
    expect(updateDoc).toHaveBeenCalledWith(
      fakeDocRef,
      { user_pref: ["Japanese"] }
    );

    expect(mockNavigate).toHaveBeenCalledWith("/profileCreation");
  });

  test("clicking Skip navigates to /profileCreation without saving", () => {
    render(<Homepage />);

    const skipButton = screen.getByRole("button", { name: /skip/i });
    fireEvent.click(skipButton);

    expect(mockNavigate).toHaveBeenCalledWith("/profileCreation");
    expect(updateDoc).not.toHaveBeenCalled();
  });

  test("clicking Logout signs out and navigates to /login", async () => {
    render(<Homepage />);

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });

    expect(signOut).toHaveBeenCalledWith(auth);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
