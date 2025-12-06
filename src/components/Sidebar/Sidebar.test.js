// src/components/Sidebar/Sidebar.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Sidebar from "./Sidebar";

// -------------------------
// Mock react-router-dom
// -------------------------
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

// -------------------------
// Mock Firebase auth + signOut
// -------------------------
const mockSignOut = jest.fn(() => Promise.resolve());

jest.mock("firebase/auth", () => ({
  signOut: (...args) => mockSignOut(...args),
}));

jest.mock("../../config/firebase-config", () => ({
  auth: {},
}));

// -------------------------
// Mock useAuth hook
// -------------------------
jest.mock("../../hooks/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../../hooks/AuthProvider";

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      currentUser: {
        uid: "user-123",
        userData: {
          user_name: "TestUser",
          user_pfp: "",
        },
      },
    });
  });

  test("renders username and user avatar image", () => {
    const { container } = render(<Sidebar />);

    expect(screen.getByText("TestUser")).toBeInTheDocument();

    // specifically select the user avatar, not the logo
    const userImg = container.querySelector(".user-img");
    expect(userImg).toBeInTheDocument();
  });

  test("renders username as 'Guest' if no user_name", async () => {
  // For this test, override useAuth so *all* calls return a 'Guest' user
  useAuth.mockReturnValue({
    currentUser: {
      uid: "user-123",
      userData: {
        user_name: "", // triggers Guest fallback
        user_pfp: "",
      },
    },
  });

  render(<Sidebar />);

  // Wait for any useEffect that sets the username
  const guestEl = await screen.findByText(/guest/i);
  expect(guestEl).toBeInTheDocument();

  // Optional: ensure the old username isn't rendered
  expect(screen.queryByText("TestUser")).not.toBeInTheDocument();
});



  test("sidebar toggles active class when menu icon is clicked", () => {
    render(<Sidebar />);

    const sidebar = document.querySelector(".sidebar");
    const menuIcon = document.querySelector(".bx-menu");

    expect(sidebar).not.toHaveClass("active");

    fireEvent.click(menuIcon);
    expect(sidebar).toHaveClass("active");

    fireEvent.click(menuIcon);
    expect(sidebar).not.toHaveClass("active");
  });

  // helper to click the nav-item span (not the tooltip)
  const clickNavItem = (label) => {
    const elements = screen.getAllByText(label);
    const navSpan =
      elements.find((el) => el.classList.contains("nav-item")) ?? elements[0];
    fireEvent.click(navSpan);
  };

  test("clicking Feed navigates to /feed", () => {
    render(<Sidebar />);

    clickNavItem("Feed");
    expect(mockNavigate).toHaveBeenCalledWith("/feed");
  });

  test("clicking Search navigates to /search", () => {
    render(<Sidebar />);

    clickNavItem("Search");
    expect(mockNavigate).toHaveBeenCalledWith("/search");
  });

  test("clicking Create navigates to /createpage", () => {
    render(<Sidebar />);

    clickNavItem("Create");
    expect(mockNavigate).toHaveBeenCalledWith("/createpage");
  });

  test("clicking Messages navigates to /messagepage", () => {
    render(<Sidebar />);

    clickNavItem("Messages");
    expect(mockNavigate).toHaveBeenCalledWith("/messagepage");
  });

  test("clicking Maps navigates to /mapspage", () => {
    render(<Sidebar />);

    clickNavItem("Maps");
    expect(mockNavigate).toHaveBeenCalledWith("/mapspage");
  });

  test("clicking Profile navigates to correct user profile", () => {
    render(<Sidebar />);

    clickNavItem("Profile");
    expect(mockNavigate).toHaveBeenCalledWith("/profilepage/user-123");
  });

  test("logout calls signOut and then navigates to /login", async () => {
    render(<Sidebar />);

    clickNavItem("Logout");

    // signOut is called immediately
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // navigate('/login') happens after the awaited signOut
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/login")
    );
  });
});
