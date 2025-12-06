// src/pages/searchpage/Searchpage.test.js
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";

import Searchpage from "./Searchpage";
import { db } from "../../config/firebase-config";
import { collection, getDocs, limit, query } from "firebase/firestore";

// --- Mocks ---

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("../../config/firebase-config", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn((n) => n),
  query: jest.fn(),
}));

describe("Searchpage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const makeSnapshot = (users) => ({
    docs: users.map((u) => ({
      id: u.id,
      data: () => u,
    })),
  });

  test("renders basic UI and shows empty state when no users", async () => {
    getDocs.mockResolvedValueOnce(makeSnapshot([]));

    render(<Searchpage />);

    // header, input, and button present
    expect(
      screen.getByRole("heading", { name: /search users/i })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search by username/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /search/i })
    ).toBeInTheDocument();

    // run debounced search
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() =>
      expect(getDocs).toHaveBeenCalledWith(
        query(collection(db, "user"), limit(100))
      )
    );

    // empty-state message
    expect(
      screen.getByText(/type a username to search users\./i)
    ).toBeInTheDocument();
  });

  test("shows all users when search term is empty after fetch", async () => {
    const users = [
      { id: "u1", user_name: "Alice", user_bio: "Loves sushi" },
      { id: "u2", user_name: "Bob" },
    ];
    getDocs.mockResolvedValue(makeSnapshot(users));

    render(<Searchpage />);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(getDocs).toHaveBeenCalled());

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  test("filters users by username (supports @ prefix)", async () => {
    const users = [
      { id: "u1", user_name: "Alice", user_bio: "Hello" },
      { id: "u2", user_name: "Bob", user_bio: "World" },
    ];
    getDocs.mockResolvedValue(makeSnapshot(users));

    render(<Searchpage />);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    fireEvent.change(screen.getByPlaceholderText(/search by username/i), {
      target: { value: "@ali" },
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(getDocs).toHaveBeenCalled());

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  test("shows 'No users found.' when no matches", async () => {
    const users = [{ id: "u1", user_name: "Alice" }];
    getDocs.mockResolvedValue(makeSnapshot(users));

    render(<Searchpage />);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    fireEvent.change(screen.getByPlaceholderText(/search by username/i), {
      target: { value: "zzz" },
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(getDocs).toHaveBeenCalled());

    expect(screen.getByText(/no users found\./i)).toBeInTheDocument();
  });

  test("navigates to profile page when clicking a user", async () => {
    const users = [
      { id: "u1", user_name: "Alice", user_bio: "Hi" },
      { id: "u2", user_name: "Bob", user_bio: "Yo" },
    ];
    getDocs.mockResolvedValue(makeSnapshot(users));

    render(<Searchpage />);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(getDocs).toHaveBeenCalled());

    const aliceRow = screen.getByText("Alice").closest("button");
    fireEvent.click(aliceRow);

    expect(mockNavigate).toHaveBeenCalledWith("/profilepage/u1");
  });

  test("shows error message when Firestore query fails", async () => {
    getDocs.mockRejectedValueOnce(new Error("boom"));

    render(<Searchpage />);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(getDocs).toHaveBeenCalled());

    expect(
      screen.getByText(/search failed\. please try again\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/type a username to search users\./i)
    ).toBeInTheDocument();
  });
});
