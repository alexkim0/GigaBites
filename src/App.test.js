/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { useAuth } from "./hooks/AuthProvider";

// Mock useAuth so we can simulate logged-in / logged-out states
jest.mock("./hooks/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

// Mock Sidebar so we can detect whether it renders
jest.mock("./components/Sidebar/Sidebar", () => () => (
  <div data-testid="sidebar" />
));

// Mock route components so we can detect navigation
jest.mock("./pages/login/LogIn", () => ({
  Login: () => <div>Login Page</div>,
}));
jest.mock("./pages/homepage/Homepage", () => ({
  Homepage: () => <div>Homepage</div>,
}));
jest.mock("./pages/feedpage/Feedpage", () => ({
  Feed: () => <div>Feed Page</div>,
}));

// For ProtectedRoute: simplify it to always render children
jest.mock("./components/ProtectedRoute", () => (props) => (
  <>{props.children}</>
));

// Silence react-hot-toast Toaster
jest.mock("react-hot-toast", () => ({
  Toaster: () => null,
}));

describe("App routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows Login when user is NOT logged in", () => {
    useAuth.mockReturnValue({ currentUser: null, loading: false });

    // simulate going to "/"
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  test("redirects '/' to '/homepage' when logged in", () => {
    useAuth.mockReturnValue({ currentUser: { uid: "abc" }, loading: false });

    window.history.pushState({}, "", "/");

    render(<App />);

    // We only care that the user is taken to Homepage
    expect(screen.getByText("Homepage")).toBeInTheDocument();

    // Sidebar is intentionally hidden on /homepage, so we DON'T assert it here.
    // (Sidebar visibility is covered in the other tests.)
  });


  test("hides sidebar on /homepage and /profileCreation", () => {
    useAuth.mockReturnValue({ currentUser: { uid: "abc" }, loading: false });

    // /homepage → NO sidebar
    window.history.pushState({}, "", "/homepage");
    const { rerender } = render(<App />);
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    expect(screen.getByText("Homepage")).toBeInTheDocument();

    // /profileCreation → NO sidebar
    window.history.pushState({}, "", "/profileCreation");
    rerender(<App />);
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  test("shows sidebar on /feed when logged in", () => {
    useAuth.mockReturnValue({ currentUser: { uid: "abc" }, loading: false });

    window.history.pushState({}, "", "/feed");

    render(<App />);

    expect(screen.getByText("Feed Page")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });
});
