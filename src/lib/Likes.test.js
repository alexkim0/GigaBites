/**
 * @jest-environment jsdom
 */

import {
  watchIsLiked,
  watchLikeCount,
  toggleLike,
} from "./Likes";

// ---- Mock firebase-config (db) ----
jest.mock("../config/firebase-config", () => ({
  db: {},
}));

// ---- Mock Firestore ----
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
}));

import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";

describe("likes.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serverTimestamp.mockReturnValue("TS");
    increment.mockImplementation((n) => ({ inc: n }));
  });

  // ---------------------------------------------------------------------------
  // watchIsLiked
  // ---------------------------------------------------------------------------
  test("watchIsLiked returns noop when postId or userId missing", () => {
    const cb = jest.fn();

    const unsub1 = watchIsLiked("", "u1", cb);
    const unsub2 = watchIsLiked("p1", "", cb);

    expect(typeof unsub1).toBe("function");
    expect(typeof unsub2).toBe("function");
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  test("watchIsLiked subscribes to like doc and maps exists() to boolean", () => {
    const cb = jest.fn();
    doc.mockReturnValue("LIKE_REF");

    onSnapshot.mockImplementation((_ref, handler) => {
      handler({ exists: () => true });
      return () => {};
    });

    const unsub = watchIsLiked("post123", "user456", cb);

    expect(doc).toHaveBeenCalledWith({}, "post", "post123", "likes", "user456");
    expect(cb).toHaveBeenCalledWith(true);
    expect(typeof unsub).toBe("function");
  });

  // ---------------------------------------------------------------------------
  // watchLikeCount
  // ---------------------------------------------------------------------------
  test("watchLikeCount subscribes to post and maps likeCount field", () => {
    const cb = jest.fn();
    doc.mockReturnValue("POST_REF");

    onSnapshot.mockImplementation((_ref, handler) => {
      handler({
        exists: () => true,
        data: () => ({ post_likeCount: "7" }),
      });
      return () => {};
    });

    watchLikeCount("post999", cb);

    expect(doc).toHaveBeenCalledWith({}, "post", "post999");
    expect(cb).toHaveBeenCalledWith(7);
  });

  test("watchLikeCount returns 0 if doc missing or field missing", () => {
    const cb = jest.fn();

    doc.mockReturnValue("POST_REF");

    // First call: doc does not exist
    onSnapshot.mockImplementationOnce((_ref, handler) => {
      handler({ exists: () => false });
      return () => {};
    });

    watchLikeCount("p1", cb);
    expect(cb).toHaveBeenLastCalledWith(0);

    // Second call: exists but no field
    onSnapshot.mockImplementationOnce((_ref, handler) => {
      handler({
        exists: () => true,
        data: () => ({}),
      });
      return () => {};
    });

    watchLikeCount("p2", cb);
    expect(cb).toHaveBeenLastCalledWith(0);
  });

  // ---------------------------------------------------------------------------
  // toggleLike
  // ---------------------------------------------------------------------------
  test("toggleLike performs LIKE when no existing like doc", async () => {
    // doc calls: postRef then likeRef
    doc
      .mockReturnValueOnce("POST_REF")
      .mockReturnValueOnce("LIKE_REF");

    let capturedTx;
    runTransaction.mockImplementation(async (_db, fn) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
      capturedTx = tx;
      return fn(tx);
    });

    const result = await toggleLike("post1", "user1");

    expect(result).toEqual({ liked: true });

    expect(capturedTx.set).toHaveBeenCalledWith("LIKE_REF", {
      uid: "user1",
      createdAt: "TS",
    });

    expect(capturedTx.update).toHaveBeenCalledWith("POST_REF", {
      post_likeCount: expect.objectContaining({ inc: 1 }),
    });
  });

  test("toggleLike performs UNLIKE when like doc already exists", async () => {
    doc
      .mockReturnValueOnce("POST_REF")
      .mockReturnValueOnce("LIKE_REF");

    let capturedTx;
    runTransaction.mockImplementation(async (_db, fn) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => true }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
      capturedTx = tx;
      return fn(tx);
    });

    const result = await toggleLike("post1", "user1");

    expect(result).toEqual({ liked: false });

    expect(capturedTx.delete).toHaveBeenCalledWith("LIKE_REF");
    expect(capturedTx.update).toHaveBeenCalledWith("POST_REF", {
      post_likeCount: expect.objectContaining({ inc: -1 }),
    });
  });
});
