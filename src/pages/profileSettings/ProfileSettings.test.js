// src/pages/profileSettings/ProfileSettings.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import ProfileSettings from "./ProfileSettings";
import { useAuth } from "../../hooks/AuthProvider";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db, storage } from "../../config/firebase-config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";

// ---- Mocks ----

// react-router-dom
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: jest.fn(),
    useParams: jest.fn(),
  };
});

// DivButton -> plain button
jest.mock("../../components/DivButton", () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

// auth hook
jest.mock("../../hooks/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

// firebase-config
jest.mock("../../config/firebase-config", () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

// firestore
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

// storage
jest.mock("firebase/storage", () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// auth
jest.mock("firebase/auth", () => ({
  updateProfile: jest.fn(),
  signOut: jest.fn(),
}));

// convenient aliases for mocks
const mockUseNavigate = useNavigate;
const mockUseParams = useParams;
const mockUseAuth = useAuth;

describe("ProfileSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // default router + auth values
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseParams.mockReturnValue({ uid: "user-123" });

    mockUseAuth.mockReturnValue({
      user: { uid: "user-123", displayName: "Current Name", user_pfp: "http://pfp" },
      loading: false,
    });

    auth.currentUser = {
      uid: "user-123",
      displayName: "Auth Name",
      user_pfp: "http://auth.pic",
      targetUid: "user-123", // used by component's updateProfile check
    };

    doc.mockImplementation((dbArg, col, id) => ({
      __db: dbArg,
      __col: col,
      __id: id,
    }));

    serverTimestamp.mockReturnValue("SERVER_TIMESTAMP");
  });

  const renderComponent = () => render(<ProfileSettings />);

  test("shows loading while auth/profile are loading", () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      loading: true,
    });

    renderComponent();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("loads existing profile data and fills form", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        user_name: "ExistingUser",
        user_bio: "Existing bio",
        user_pfp: "http://example.com/pfp.jpg",
      }),
    });

    renderComponent();

    // wait for loading to finish
    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    const usernameInput = screen.getByPlaceholderText("Username");
    const bioTextarea = screen.getByPlaceholderText(
      /tell people a bit about yourself/i
    );

    expect(usernameInput.value).toBe("ExistingUser");
    expect(bioTextarea.value).toBe("Existing bio");

    const img = screen.getByRole("img", { name: /profile/i });
    expect(img).toHaveAttribute("src", "http://example.com/pfp.jpg");
  });

  test("shows error message if profile load fails", async () => {
    getDoc.mockRejectedValue(new Error("boom"));

    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load profile\./i)
      ).toBeInTheDocument()
    );
  });

  test("shows validation error when username is empty", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        user_name: "",
        user_bio: "",
        user_pfp: "",
      }),
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    // click Save with empty username
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/enter a username\./i)
    ).toBeInTheDocument();
    expect(setDoc).not.toHaveBeenCalled();
  });

  test("shows validation error when username is too long", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        user_name: "short",
        user_bio: "",
        user_pfp: "",
      }),
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    const usernameInput = screen.getByPlaceholderText("Username");
    fireEvent.change(usernameInput, { target: { value: "x".repeat(33) } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/username must be 32 characters or fewer\./i)
    ).toBeInTheDocument();
    expect(setDoc).not.toHaveBeenCalled();
  });

  test("shows validation error when biography is too long", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        user_name: "User",
        user_bio: "",
        user_pfp: "",
      }),
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    const bioTextarea = screen.getByPlaceholderText(
      /tell people a bit about yourself/i
    );
    fireEvent.change(bioTextarea, { target: { value: "y".repeat(501) } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/biography must be 500 characters or fewer\./i)
    ).toBeInTheDocument();
    expect(setDoc).not.toHaveBeenCalled();
  });

      test("successfully saves profile without changing photo", async () => {
    const navigateFn = jest.fn();
    mockUseNavigate.mockReturnValue(navigateFn);

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        user_name: "User",
        user_bio: "Bio",
        user_pfp: "http://img",
      }),
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    const usernameInput = screen.getByPlaceholderText("Username");
    fireEvent.change(usernameInput, { target: { value: "NewName" } });

    setDoc.mockResolvedValue(undefined);
    updateProfile.mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(setDoc).toHaveBeenCalled());

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __col: "user", __id: "user-123" }),
      expect.objectContaining({
        user_name: "NewName",
        user_bio: "Bio",
        user_pfp: "http://img",
        updatedAt: "SERVER_TIMESTAMP",
      }),
      { merge: true }
    );

    expect(updateProfile).toHaveBeenCalledWith(
      auth.currentUser,
      expect.objectContaining({
        displayName: "NewName",
        photoURL: "http://img",
      })
    );

    expect(navigateFn).toHaveBeenCalledWith("/profilepage/user-123");

    // we let window.location.reload() run naturally without mocking it
    // (no assertion on reload, to avoid read-only property issues)
  });


  test("clicking Back navigates to profile page", async () => {
    const navigateFn = jest.fn();
    mockUseNavigate.mockReturnValue(navigateFn);

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        user_name: "User",
        user_bio: "",
        user_pfp: "",
      }),
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(navigateFn).toHaveBeenCalledWith("/profilepage/user-123");
  });
});
