import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// We import these so we can assert on them; they'll be provided by the mocks.
import Messagepage from "./Messagepage";
import { markRead } from "../../lib/Chat";
import { send } from "../../hooks/UseMessages";

// ====== MOCKS ======

// firebase-config
jest.mock("../../config/firebase-config", () => ({
  auth: {
    currentUser: { uid: "me123" },
  },
  db: {},
}));

// firebase/firestore
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(() =>
    Promise.resolve({
      exists: () => false,
      data: () => ({}),
    })
  ),
  collection: jest.fn(),
  // IMPORTANT: always return a cleanup function so `unsub()` is callable
  onSnapshot: () => () => {},
}));

// Chat helpers – exports are mocks we can assert on
jest.mock("../../lib/Chat", () => {
  const ensureConversation = jest.fn().mockResolvedValue({ cid: "newCid" });
  const markRead = jest.fn().mockResolvedValue();

  return {
    ensureConversation,
    markRead,
  };
});

// conversations hook
jest.mock("../../hooks/UseConversations", () => ({
  useConversations: () => [
    {
      id: "c1",
      participants: ["me123", "other456"],
      lastMessage: "Hello",
      unread: { me123: 2 },
    },
  ],
}));

// messages hook – export `send` so we can assert on it
jest.mock("../../hooks/UseMessages", () => {
  const send = jest.fn();
  const loadMore = jest.fn();

  const useMessages = () => ({
    messages: [
      { id: "m1", senderId: "me123", text: "Hi there" },
      { id: "m2", senderId: "other456", text: "Hello back" },
    ],
    send,
    hasMore: false,
    loadingMore: false,
    loadMore,
  });

  return { useMessages, send, loadMore };
});

// following list hook
jest.mock("../../hooks/UseFollowingList", () => ({
  useFollowingList: () => ({
    following: [],
  }),
}));

// username map hook
jest.mock("../../hooks/UseUsernameMap", () => ({
  useUserNameMap: () => ({
    other456: "alice",
  }),
}));

// simple Modal mock – renders children when open === true
jest.mock("../../components/Modal/Modal", () => (props) => {
  if (!props.open) return null;
  return (
    <div data-testid="modal">
      <button onClick={props.onClose}>Close</button>
      {props.children}
    </div>
  );
});

// react-router-dom
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
  };
});

// ====== TESTS ======

describe("Messagepage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders conversation list with username, last message, and unread badge", () => {
    render(<Messagepage />);

    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // unread badge
  });

  test("clicking a conversation calls markRead with cid and current user id", async () => {
    render(<Messagepage />);

    const nameNode = screen.getByText("@alice");
    const convoButton = nameNode.closest("button");
    expect(convoButton).toBeInTheDocument();

    fireEvent.click(convoButton);

    await waitFor(() => {
      expect(markRead).toHaveBeenCalledWith("c1", "me123");
    });
  });

  test("sending a message uses the send function from useMessages", async () => {
    render(<Messagepage />);

    const input = screen.getByPlaceholderText("Write a message…");
    fireEvent.change(input, { target: { value: "Test message" } });

    const form = input.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith("Test message");
    });
  });

  test("clicking + New opens the modal and it can be closed", () => {
    render(<Messagepage />);

    fireEvent.click(screen.getByRole("button", { name: /\+ New/i }));

    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Start new chat")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search following…")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });
});
