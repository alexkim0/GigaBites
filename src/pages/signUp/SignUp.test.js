// src/pages/signUp/SignUp.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { SignUp } from "./SignUp";
import { auth, db, googleProvider } from "../../config/firebase-config";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// ---- Mocks ----

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock DivButton to behave like a basic button
jest.mock("../../components/DivButton", () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

// Mock firebase-config (auth, db, googleProvider)
jest.mock("../../config/firebase-config", () => ({
  auth: { currentUser: null },
  db: {},
  googleProvider: {},
}));

// Mock firebase/auth
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

// Mock firebase/firestore
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
}));

describe("SignUp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders sign up form UI", () => {
    render(<SignUp />);

    // We don't use getByText(/sign up/i) because there are two matches (header + button).
    // Instead, assert on the button explicitly:
    expect(
      screen.getByRole("button", { name: /sign up/i })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/email address/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();

    // Google button
    expect(
      screen.getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();

    // "Already have an account? Login"
    expect(
      screen.getByText(/already have an account\?/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  test("navigates to /login when Login text is clicked", () => {
    render(<SignUp />);

    const loginLink = screen.getByText(/login/i);
    fireEvent.click(loginLink);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("successful email sign up calls Firebase and navigates to /homepage", async () => {
    const user = { uid: "user-123", email: "test@example.com" };
    createUserWithEmailAndPassword.mockResolvedValue({ user });

    const fakeDocRef = { id: "user-doc" };
    doc.mockReturnValue(fakeDocRef);
    setDoc.mockResolvedValue(undefined);

    render(<SignUp />);

    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      "test@example.com",
      "password123"
    );

    expect(doc).toHaveBeenCalledWith(db, "user", "user-123");
    expect(setDoc).toHaveBeenCalledWith(
      fakeDocRef,
      expect.objectContaining({
        user_email: "test@example.com",
        user_ID: "user-123",
        user_pref: [],
      })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/homepage");
  });

  test("shows specific error message when email already in use", async () => {
    createUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/email-already-in-use",
    });

    render(<SignUp />);

    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: "taken@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/that account is already linked to another user\./i)
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("sign in with Google creates new user doc when user does not exist", async () => {
    const googleUser = { uid: "google-123", email: "google@example.com" };
    signInWithPopup.mockResolvedValue({ user: googleUser });

    const docRefExistingCheck = { id: "doc-existing-check" };
    const docRefCreate = { id: "doc-create" };

    doc
      .mockReturnValueOnce(docRefExistingCheck) // for getDoc
      .mockReturnValueOnce(docRefCreate);       // for setDoc in createUserData

    getDoc.mockResolvedValue({
      exists: () => false,
    });

    setDoc.mockResolvedValue(undefined);

    render(<SignUp />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign in with google/i })
    );

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
    });

    expect(signInWithPopup).toHaveBeenCalledWith(auth, googleProvider);
    expect(getDoc).toHaveBeenCalledWith(docRefExistingCheck);
    expect(setDoc).toHaveBeenCalledWith(
      docRefCreate,
      expect.objectContaining({
        user_email: "google@example.com",
        user_ID: "google-123",
      })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/homepage");
  });

  test("sign in with Google skips Firestore creation when user doc exists", async () => {
    const googleUser = { uid: "google-456", email: "existing@example.com" };
    signInWithPopup.mockResolvedValue({ user: googleUser });

    const docRefExistingCheck = { id: "doc-existing-check" };
    doc.mockReturnValue(docRefExistingCheck);

    getDoc.mockResolvedValue({
      exists: () => true,
    });

    render(<SignUp />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign in with google/i })
    );

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
    });

    expect(getDoc).toHaveBeenCalledWith(docRefExistingCheck);
    expect(setDoc).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/homepage");
  });
});
