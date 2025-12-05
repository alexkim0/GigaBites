// src/pages/login/LogIn.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---- mocks ----
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockSignInWithEmailAndPassword = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockSignOut = jest.fn();

const mockDoc = jest.fn((db, col, id) => ({ db, col, id }));
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();

// firebase config
jest.mock("../../config/firebase-config", () => ({
  auth: {},
  googleProvider: {},
  db: {},
}));

// firebase/auth
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: (...args) => mockSignInWithPopup(...args),
  signOut: (...args) => mockSignOut(...args),
  signInWithEmailAndPassword: (...args) =>
    mockSignInWithEmailAndPassword(...args),
}));

// firebase/firestore
jest.mock("firebase/firestore", () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
}));

// CSS + assets + DivButton so Jest doesn't choke
jest.mock("./Login.css", () => ({}));
jest.mock("../../assets/email.png", () => "email.png");
jest.mock("../../assets/password.png", () => "password.png");
jest.mock("../../assets/Google__G__logo.svg", () => "google.png");

// Simple button replacement for DivButton
jest.mock("../../components/DivButton", () => {
  // eslint-disable-next-line react/display-name
  return (props) => (
    <button type="button" {...props}>
      {props.children}
    </button>
  );
});

// Import AFTER mocks
import { Login } from "./LogIn";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Login component", () => {
  test("renders email, password fields and buttons", () => {
    render(<Login />);

    expect(
      screen.getByPlaceholderText(/email address/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();

    // "Log In" DivButton (mocked as a <button>)
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();

    // Google button
    expect(
      screen.getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();

    // Sign up link text
    expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });

  test("successful email/password login calls firebase and navigates", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "123" },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.any(Object), // auth
      "test@example.com",
      "secret123"
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/homepage");
    });
  });

  test("shows an error message when login fails with invalid email", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-email",
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: "bad-email" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "whatever" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email address/i)
      ).toBeInTheDocument();
    });
  });

  test("sign in with Google creates user doc when user does not exist", async () => {
    const fakeUser = { uid: "u1", email: "guser@example.com" };

    mockSignInWithPopup.mockResolvedValue({ user: fakeUser });
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    render(<Login />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign in with google/i })
    );

    await waitFor(() => {
      expect(mockSignInWithPopup).toHaveBeenCalled();
    });

    // should check Firestore user doc
    expect(mockDoc).toHaveBeenCalledWith(expect.any(Object), "user", "u1");
    expect(mockGetDoc).toHaveBeenCalled();

    // since userSnap.exists() === false, createUserData -> setDoc called
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    // navigation to homepage
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/homepage");
    });
  });

  test("sign in with Google does not create user doc when it already exists", async () => {
    const fakeUser = { uid: "u2", email: "existing@example.com" };

    mockSignInWithPopup.mockResolvedValue({ user: fakeUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
    });

    render(<Login />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign in with google/i })
    );

    await waitFor(() => {
      expect(mockSignInWithPopup).toHaveBeenCalled();
    });

    expect(mockGetDoc).toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/homepage");
    });
  });
});
