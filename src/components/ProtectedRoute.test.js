import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProtectedRoute from "./ProtectedRoute";

// Mock Navigate only
jest.mock("react-router-dom", () => ({
  __esModule: true,
  Navigate: ({ to }) => <div>REDIRECT TO: {to}</div>,
}));

// Mock useAuth hook
jest.mock("../hooks/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../hooks/AuthProvider";

describe("ProtectedRoute", () => {
  test("shows loading state when loading = true", () => {
    useAuth.mockReturnValue({ currentUser: null, loading: true });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("redirects to /login when no currentUser", () => {
    useAuth.mockReturnValue({ currentUser: null, loading: false });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/REDIRECT TO: \/login/i)).toBeInTheDocument();
  });

  test("renders children when authenticated and no redirect conditions met", () => {
    useAuth.mockReturnValue({
      loading: false,
      currentUser: {
        userData: {
          user_pref: {},
          user_name: "",
        },
      },
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });

  test("redirects when redirectIfPref is provided AND user_pref exists", () => {
    useAuth.mockReturnValue({
      loading: false,
      currentUser: {
        userData: {
          user_pref: { darkmode: true },
          user_name: "",
        },
      },
    });

    render(
      <ProtectedRoute redirectIfPref="/feed">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("REDIRECT TO: /feed")).toBeInTheDocument();
  });

  test("redirects when redirectIfName is provided AND user_name exists", () => {
    useAuth.mockReturnValue({
      loading: false,
      currentUser: {
        userData: {
          user_pref: {},
          user_name: "Bob",
        },
      },
    });

    render(
      <ProtectedRoute redirectIfName="/welcome">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("REDIRECT TO: /welcome")).toBeInTheDocument();
  });

  test("does not redirect when redirectIfPref given but user_pref is empty", () => {
    useAuth.mockReturnValue({
      loading: false,
      currentUser: {
        userData: {
          user_pref: {},
          user_name: "",
        },
      },
    });

    render(
      <ProtectedRoute redirectIfPref="/feed">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });

  test("does not redirect when redirectIfName given but user_name empty", () => {
    useAuth.mockReturnValue({
      loading: false,
      currentUser: {
        userData: {
          user_pref: {},
          user_name: "",
        },
      },
    });

    render(
      <ProtectedRoute redirectIfName="/welcome">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });
});
