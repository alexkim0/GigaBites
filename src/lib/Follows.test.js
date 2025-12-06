/**
 * @jest-environment jsdom
 */

import {
  watchFollowers,
  watchFollowing,
  watchIsFollowing,
  watchFollowerCount,
  toggleFollow,
} from "./Follows";

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
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn(),
  collection: jest.fn(),
  orderBy: jest.fn(),
}));

import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
  getDoc,
  collection,
  query,
  orderBy,
} from "firebase/firestore";

describe("follow.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serverTimestamp.mockReturnValue("TS");
    increment.mockImplementation((n) => ({ inc: n }));
  });

  // ---------------------------------------------------------------------------
  // watchFollowers
  // ---------------------------------------------------------------------------
  test("watchFollowers returns noop when targetUid is missing", () => {
    const cb = jest.fn();
    const unsub = watchFollowers("", cb);

    expect(typeof unsub).toBe("function");
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  test("watchFollowers maps snapshot docs with profiles", async () => {
    const cb = jest.fn();
    collection.mockReturnValue("followersCol");
    query.mockReturnValue("followersQuery");
    orderBy.mockReturnValue("orderBy(createdAt,desc)");

    // first getDoc for uid "u1"
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ user_name: "Alice", user_pfp: "alice.png" }),
    });

    // simulate onSnapshot
    let snapCallback;
    onSnapshot.mockImplementation((_q, handler) => {
      snapCallback = handler;
      return () => {};
    });

    watchFollowers("target-123", cb);

    const snap = {
      docs: [
        {
          id: "u1",
          data: () => ({ createdAt: 123 }),
        },
      ],
    };

    await snapCallback(snap);

    expect(collection).toHaveBeenCalledWith(
      {},
      "user",
      "target-123",
      "followers"
    );

    expect(cb).toHaveBeenCalledTimes(1);
    const items = cb.mock.calls[0][0];

    expect(items[0]).toMatchObject({
      id: "u1",
      uid: "u1",
      createdAt: 123,
      profile: { user_name: "Alice", user_pfp: "alice.png" },
    });
  });

  // ---------------------------------------------------------------------------
  // watchFollowing
  // ---------------------------------------------------------------------------
  test("watchFollowing uses same profile caching logic", async () => {
    const cb = jest.fn();
    collection.mockReturnValue("followingCol");
    query.mockReturnValue("followingQuery");
    orderBy.mockReturnValue("orderBy(createdAt,desc)");

    // First lookup for "u2"
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ user_name: "Bob", user_pfp: "bob.png" }),
    });

    let snapCallback;
    onSnapshot.mockImplementation((_q, handler) => {
      snapCallback = handler;
      return () => {};
    });

    watchFollowing("me-1", cb);

    const snap = {
      docs: [
        {
          id: "u2",
          data: () => ({ createdAt: 555 }),
        },
      ],
    };

    await snapCallback(snap);

    const items = cb.mock.calls[0][0];
    expect(items[0]).toMatchObject({
      id: "u2",
      uid: "u2",
      createdAt: 555,
      profile: { user_name: "Bob", user_pfp: "bob.png" },
    });
  });

  // ---------------------------------------------------------------------------
  // watchIsFollowing
  // ---------------------------------------------------------------------------
  test("watchIsFollowing reports true when follower doc exists", () => {
    const cb = jest.fn();
    doc.mockReturnValue("followerRef");

    onSnapshot.mockImplementation((_ref, handler) => {
      handler({ exists: () => true });
      return () => {};
    });

    watchIsFollowing("targetX", "meY", cb);

    expect(doc).toHaveBeenCalledWith(
      {},
      "user",
      "targetX",
      "followers",
      "meY"
    );
    expect(cb).toHaveBeenCalledWith(true);
  });

  // ---------------------------------------------------------------------------
  // watchFollowerCount
  // ---------------------------------------------------------------------------
  test("watchFollowerCount maps user_follower to number", () => {
    const cb = jest.fn();
    doc.mockReturnValue("userRef");

    onSnapshot.mockImplementation((_ref, handler) => {
      handler({
        exists: () => true,
        data: () => ({ user_follower: "5" }),
      });
      return () => {};
    });

    watchFollowerCount("targetZ", cb);

    expect(doc).toHaveBeenCalledWith({}, "user", "targetZ");
    expect(cb).toHaveBeenCalledWith(5);
  });

  // ---------------------------------------------------------------------------
  // toggleFollow: guard clauses
  // ---------------------------------------------------------------------------
  test("toggleFollow throws when ids missing or self-follow", async () => {
    await expect(toggleFollow("", "u1")).rejects.toThrow("Missing ids");
    await expect(toggleFollow("u1", "")).rejects.toThrow("Missing ids");
    await expect(toggleFollow("same", "same")).rejects.toThrow(
      "You can’t follow yourself."
    );
  });

  // ---------------------------------------------------------------------------
  // toggleFollow: follow branch (no existing follower doc)
  // ---------------------------------------------------------------------------
  test("toggleFollow creates follower / following docs and increments counters", async () => {
    // doc refs
    doc
      .mockReturnValueOnce("targetUserRef")
      .mockReturnValueOnce("meUserRef")
      .mockReturnValueOnce("followerRef")
      .mockReturnValueOnce("followingRef");

    // initial user profiles
    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ user_name: "Target", user_pfp: "t.png" }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ user_name: "Me", user_pfp: "m.png" }),
      });

    let lastTx;
    runTransaction.mockImplementation(async (_db, fn) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
      lastTx = tx;
      const res = await fn(tx);
      return res;
    });

    const result = await toggleFollow("targetUid", "meUid");

    expect(result).toEqual({ following: true });

    // follower doc for me under target
    expect(lastTx.set).toHaveBeenCalledWith("followerRef", expect.objectContaining({
      uid: "meUid",
      followerUid: "meUid",
      user_name: "Me",
      user_pfp: "m.png",
      createdAt: "TS",
    }));

    // following doc for target under me
    expect(lastTx.set).toHaveBeenCalledWith("followingRef", expect.objectContaining({
      uid: "targetUid",
      targetUid: "targetUid",
      user_name: "Target",
      user_pfp: "t.png",
      createdAt: "TS",
    }));

    // counters
    expect(lastTx.update).toHaveBeenCalledWith("targetUserRef", {
      user_follower: expect.objectContaining({ inc: 1 }),
    });
    expect(lastTx.update).toHaveBeenCalledWith("meUserRef", {
      user_following: expect.objectContaining({ inc: 1 }),
    });
  });

  // ---------------------------------------------------------------------------
  // toggleFollow: unfollow branch (existing follower doc)
  // ---------------------------------------------------------------------------
  test("toggleFollow deletes docs and decrements counters when already following", async () => {
    doc
      .mockReturnValueOnce("targetUserRef")
      .mockReturnValueOnce("meUserRef")
      .mockReturnValueOnce("followerRef")
      .mockReturnValueOnce("followingRef");

    // initial profiles
    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ user_name: "Target", user_pfp: "t.png" }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ user_name: "Me", user_pfp: "m.png" }),
      });

    let lastTx;
    runTransaction.mockImplementation(async (_db, fn) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => true }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
      lastTx = tx;
      const res = await fn(tx);
      return res;
    });

    const result = await toggleFollow("targetUid", "meUid");

    expect(result).toEqual({ following: false });

    // deletes
    expect(lastTx.delete).toHaveBeenCalledWith("followerRef");
    expect(lastTx.delete).toHaveBeenCalledWith("followingRef");

    // counters decremented
    expect(lastTx.update).toHaveBeenCalledWith("targetUserRef", {
      user_follower: expect.objectContaining({ inc: -1 }),
    });
    expect(lastTx.update).toHaveBeenCalledWith("meUserRef", {
      user_following: expect.objectContaining({ inc: -1 }),
    });
  });
});
