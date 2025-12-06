/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { useConversations } from "./UseConversations";

// Mock watchConversations from ../lib/Chat
jest.mock("../lib/Chat", () => ({
  watchConversations: jest.fn(),
}));

import { watchConversations } from "../lib/Chat";

describe("useConversations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does NOT call watchConversations if currentUid is missing", () => {
    renderHook(() => useConversations(null));

    expect(watchConversations).not.toHaveBeenCalled();
  });

  test("calls watchConversations when a uid is provided", () => {
    const mockUnsub = jest.fn();
    watchConversations.mockReturnValue(mockUnsub);

    renderHook(() => useConversations("user123"));

    expect(watchConversations).toHaveBeenCalledWith(
      "user123",
      expect.any(Function)
    );
  });

  test("updates items when watchConversations pushes new data", () => {
    // This simulates Firebase-like subscription behavior.
    let callbackFn = null;

    watchConversations.mockImplementation((_uid, cb) => {
      callbackFn = cb;
      return jest.fn(); // unsubscribe function
    });

    const { result } = renderHook(() => useConversations("user123"));

    // Simulate new conversations being received
    const fakeData = [
      { id: "1", lastMessage: "Hello" },
      { id: "2", lastMessage: "What's up" },
    ];

    act(() => {
      callbackFn(fakeData);
    });

    expect(result.current).toEqual(fakeData);
  });

  test("cleans up the listener on unmount", () => {
    const mockUnsub = jest.fn();
    watchConversations.mockReturnValue(mockUnsub);

    const { unmount } = renderHook(() => useConversations("user123"));

    unmount();

    expect(mockUnsub).toHaveBeenCalled();
  });
});
