/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useMessages } from "./UseMessages";

// ----------------- MOCK FIREBASE AUTH -----------------
jest.mock("../config/firebase-config", () => ({
  auth: { currentUser: { uid: "me123" } },
}));

// ----------------- MOCK CHAT FUNCTIONS -----------------
jest.mock("../lib/Chat", () => ({
  watchMessages: jest.fn(),
  markRead: jest.fn(),
  sendMessage: jest.fn(),
  fetchOlderMessages: jest.fn(),
}));

import {
  watchMessages,
  sendMessage,
  fetchOlderMessages,
} from "../lib/Chat";

describe("useMessages()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Utility: Fake createdAt milliseconds
  const ts = (ms) => ({ toMillis: () => ms });

  test("returns empty state when cid is missing", () => {
    const { result } = renderHook(() => useMessages(null));

    expect(result.current.messages).toEqual([]);
    expect(result.current.hasMore).toBe(true);
  });

  test("subscribes to watchMessages on cid change", async () => {
    const mockUnsub = jest.fn();

    // Fake snapshot
    const fakeSnap = {
      docs: [
        { id: "d1" },
        { id: "d2" },
      ],
    };

    // Fake incoming page
    const newBatch = [
      { id: "m1", createdAt: ts(1000) },
      { id: "m2", createdAt: ts(2000) },
    ];

    watchMessages.mockImplementation((_cid, callback) => {
      callback(newBatch, fakeSnap);
      return mockUnsub;
    });

    const { result, unmount } = renderHook(() => useMessages("chat123", 30));

    await waitFor(() => {
      expect(result.current.messages).toEqual(newBatch);
    });

    expect(watchMessages).toHaveBeenCalledWith(
      "chat123",
      expect.any(Function),
      30
    );

    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });

  test("merges older messages correctly when new realtime batch arrives", async () => {
    const mockUnsub = jest.fn();

    // First realtime batch
    const firstBatch = [
      { id: "old1", createdAt: ts(1000) },
      { id: "old2", createdAt: ts(2000) },
    ];

    // Second realtime batch (newer)
    const secondBatch = [
      { id: "new1", createdAt: ts(3000) },
      { id: "new2", createdAt: ts(4000) },
    ];

    const snap1 = { docs: [{}, {}] };
    const snap2 = { docs: [{}, {}] };

    let batchCallback = null;

    // Save callback so we can trigger more batches later
    watchMessages.mockImplementation((_cid, cb) => {
      batchCallback = cb;
      cb(firstBatch, snap1);
      return mockUnsub;
    });

    const { result } = renderHook(() => useMessages("chat123"));

    await waitFor(() =>
      expect(result.current.messages).toEqual(firstBatch)
    );

    // Trigger new incoming realtime messages
    act(() => batchCallback(secondBatch, snap2));

    await waitFor(() =>
      expect(result.current.messages).toEqual([
        ...firstBatch,  // older
        ...secondBatch, // newer
      ])
    );
  });

  test("fetches older messages with loadMore()", async () => {
    const mockUnsub = jest.fn();

    const liveBatch = [
      { id: "r1", createdAt: ts(3000) },
      { id: "r2", createdAt: ts(4000) },
    ];

    // docs length = 2
    const snap = { docs: [{}, {}] };

    // keep hasMore = true by using pageSize = 2
    watchMessages.mockImplementation((_cid, cb, pageSize) => {
      expect(pageSize).toBe(2);
      cb(liveBatch, snap);
      return mockUnsub;
    });

    fetchOlderMessages.mockResolvedValue({
      msgs: [
        { id: "o1", createdAt: ts(1000) },
        { id: "o2", createdAt: ts(2000) },
      ],
      lastDoc: { id: "cursor2" },
    });

    const { result } = renderHook(() => useMessages("chat123", 2));

    await waitFor(() =>
      expect(result.current.messages).toEqual(liveBatch)
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchOlderMessages).toHaveBeenCalled();

    // ✅ Instead of deep equality on whole objects (which includes function refs),
    //    just assert on ids and order:
    const ids = result.current.messages.map((m) => m.id);
    expect(ids).toEqual(["o1", "o2", "r1", "r2"]);

    // Optional: also assert timestamps if you want
    expect(result.current.messages[0].createdAt.toMillis()).toBe(1000);
    expect(result.current.messages[1].createdAt.toMillis()).toBe(2000);

    expect(result.current.hasMore).toBe(true);
  });

  test("loadMore stops when no more messages exist", async () => {
    const mockUnsub = jest.fn();

    const liveBatch = [
      { id: "r1", createdAt: ts(2000) },
      { id: "r2", createdAt: ts(3000) },
    ];

    const snap = { docs: [{}, {}] };

    watchMessages.mockImplementation((_cid, cb, pageSize) => {
      expect(pageSize).toBe(2);
      cb(liveBatch, snap);
      return mockUnsub;
    });

    fetchOlderMessages.mockResolvedValue({
      msgs: [],   // no older messages
      lastDoc: null,
    });

    const { result } = renderHook(() => useMessages("chat123", 2));

    await waitFor(() =>
      expect(result.current.messages).toEqual(liveBatch)
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchOlderMessages).toHaveBeenCalled();
    expect(result.current.hasMore).toBe(false);
  });

  test("send() calls sendMessage()", async () => {
    const mockUnsub = jest.fn();

    watchMessages.mockImplementation((_cid, cb) => {
      cb([], { docs: [] });
      return mockUnsub;
    });

    const { result } = renderHook(() => useMessages("chat123"));

    await act(async () => {
      await result.current.send(" hello ");
    });

    expect(sendMessage).toHaveBeenCalledWith("chat123", "me123", "hello");
  });

  test("send() does nothing on blank strings", async () => {
    const mockUnsub = jest.fn();

    watchMessages.mockImplementation((_cid, cb) => {
      cb([], { docs: [] });
      return mockUnsub;
    });

    const { result } = renderHook(() => useMessages("chat123"));

    await act(async () => {
      await result.current.send("   ");
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
