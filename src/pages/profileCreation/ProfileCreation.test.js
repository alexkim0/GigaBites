// src/pages/profileCreation/ProfileCreation.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileCreation from "./ProfileCreation";

// Mock firebase config (auth + db)
jest.mock("../../config/firebase-config", () => ({
  auth: {
    currentUser: {
      email: "testuser@example.com",
      uid: "test-uid",
    },
  },
  db: {}, // we only need a placeholder here
}));

// Mock firebase/auth signOut
const mockSignOut = jest.fn();
jest.mock("firebase/auth", () => ({
  signOut: (...args) => mockSignOut(...args),
}));

// Mock firebase/firestore
const mockDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock("firebase/firestore", () => ({
  doc: (...args) => mockDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
}));

// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  // preserve other exports if needed
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock the AuthProvider hook
const mockUseAuth = jest.fn();
jest.mock("../../hooks/AuthProvider", () => ({
  useAuth: (...args) => mockUseAuth(...args),
}));

// Mock DivButton as a simple button
jest.mock("../../components/DivButton", () => (props) => {
  const { children, onClick, ...rest } = props;
  return (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  );
});

describe("ProfileCreation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows loading state when auth is loading", () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: true,
    });

    render(<ProfileCreation />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("renders email when user is loaded", () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: "test-uid" },
      loading: false,
    });

    render(<ProfileCreation />);

    expect(
      screen.getByText(/Signed in as/i)
    ).toBeInTheDocument();
    expect(screen.getByText("testuser@example.com")).toBeInTheDocument();
  });

  test("shows error message when clicking Next with empty username", () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: "test-uid" },
      loading: false,
    });

    render(<ProfileCreation />);

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    expect(
      screen.getByText("Create a username.")
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("updates username and navigates to /feed when valid username is provided", async () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: "test-uid" },
      loading: false,
    });

    mockDoc.mockReturnValue({}); // dummy doc ref
    mockUpdateDoc.mockResolvedValue(); // simulate successful update

    render(<ProfileCreation />);

    const input = screen.getByPlaceholderText(/Username/i);
    fireEvent.change(input, { target: { value: "new_username" } });

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockDoc).toHaveBeenCalledWith(
        expect.any(Object), // db
        "user",
        "test-uid"
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.any(Object), // user doc ref
        { user_name: "new_username" }
      );
      expect(mockNavigate).toHaveBeenCalledWith("/feed");
    });
  });

  test("logs out and navigates to /login when Logout is clicked", async () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: "test-uid" },
      loading: false,
    });

    render(<ProfileCreation />);

    const logoutButton = screen.getByText(/Logout/i);
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
