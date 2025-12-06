/**
 * @jest-environment jsdom
 */

import {
  addComment,
  deleteComment,
  watchComments,
} from "./Comments";

// ----------- MOCK FIREBASE CONFIG -----------
jest.mock("../config/firebase-config", () => ({
  db: {},
}));

// ----------- MOCK FIRESTORE -----------
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  deleteDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn((n) => ({ inc: n })),
  serverTimestamp: jest.fn(() => "SERVER_TS"),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(() => "orderBy(createdAt,asc)"),
  getDoc: jest.fn(),
}));

import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

describe("comments.js", () => {
  beforeEach(() => {
    // Reset call counts etc.
    jest.clearAllMocks();

    // Restore implementations that clearAllMocks erased
    serverTimestamp.mockReturnValue("SERVER_TS");
    increment.mockImplementation((n) => ({ inc: n }));
  });

  // ===========================================================
  //  addComment
  // ===========================================================
  test("addComment adds comment and increments counter", async () => {
    collection.mockReturnValueOnce("COMMENTS_COL");
    addDoc.mockResolvedValueOnce();

    doc.mockReturnValueOnce("POST_REF"); // post for increment
    updateDoc.mockResolvedValueOnce();

    await addComment("post123", "userX", "hello world");

    expect(collection).toHaveBeenCalledWith({}, "post", "post123", "comments");

    expect(addDoc).toHaveBeenCalledWith("COMMENTS_COL", {
      uid: "userX",
      text: "hello world",
      createdAt: "SERVER_TS",
    });

    expect(updateDoc).toHaveBeenCalledWith("POST_REF", {
      post_commentCount: expect.objectContaining({ inc: 1 }),
    });
  });

  test("addComment does nothing on blank text", async () => {
    await addComment("p1", "u1", "   ");
    expect(addDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  // ===========================================================
  //  deleteComment
  // ===========================================================
  test("deleteComment deletes only when user matches", async () => {
    doc
      .mockReturnValueOnce("COMMENT_REF") // delete target
      .mockReturnValueOnce("POST_REF");   // decrement post

    deleteDoc.mockResolvedValueOnce();
    updateDoc.mockResolvedValueOnce();

    await deleteComment("postA", "commentA", "u1", "u1");

    expect(deleteDoc).toHaveBeenCalledWith("COMMENT_REF");
    expect(updateDoc).toHaveBeenCalledWith("POST_REF", {
      post_commentCount: expect.objectContaining({ inc: -1 }),
    });
  });

  test("deleteComment skips delete if user mismatch", async () => {
    await deleteComment("postA", "commentA", "wrongUser", "ownerUid");

    expect(deleteDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  // ===========================================================
  //  watchComments
  // ===========================================================
  test("watchComments streams comments with usernames (including cache)", async () => {
    collection.mockReturnValue("COMMENTS_COL");
    doc.mockReturnValueOnce("USER_X_DOC"); // first username lookup

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ user_name: "Alice" }),
    });

    const snap = {
      docs: [
        {
          id: "c1",
          data: () => ({
            uid: "X",
            text: "hello",
            createdAt: 111,
          }),
        },
      ],
    };

    let callback;
    onSnapshot.mockImplementation((_q, cb) => {
      callback = cb;
      return () => {};
    });

    const received = [];
    const unsub = watchComments("post123", (list) => received.push(list));

    await callback(snap);

    expect(received.length).toBe(1);
    expect(received[0][0]).toMatchObject({
      id: "c1",
      text: "hello",
      uid: "X",
      username: "Alice",
    });

    // second snapshot with same uid, should use cache (no extra getDoc)
    const snap2 = {
      docs: [
        {
          id: "c2",
          data: () => ({
            uid: "X",
            text: "again",
            createdAt: 222,
          }),
        },
      ],
    };

    await callback(snap2);

    expect(received[1][0]).toMatchObject({
      id: "c2",
      text: "again",
      uid: "X",
      username: "Alice",
    });

    expect(getDoc).toHaveBeenCalledTimes(1);
    expect(typeof unsub).toBe("function");
  });

  test("watchComments assigns username='user' if target user does not exist", async () => {
    collection.mockReturnValue("COMMENTS_COL");

    getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({}),
    });

    let callback;
    onSnapshot.mockImplementation((_q, cb) => {
      callback = cb;
      return () => {};
    });

    const received = [];
    watchComments("post123", (list) => received.push(list));

    const snap = {
      docs: [
        {
          id: "c1",
          data: () => ({
            uid: "MISSING",
            text: "hi",
            createdAt: 444,
          }),
        },
      ],
    };

    await callback(snap);

    expect(received[0][0].username).toBe("user");
  });
});
