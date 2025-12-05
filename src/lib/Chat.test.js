// chat.test.js
import {
  conversationIdFor,
  ensureConversation,
  watchConversations,
  watchMessages,
  fetchOlderMessages,
  sendMessage,
  markRead,
} from "./Chat";

// ---- Firestore & db mocks ----
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockAddDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockStartAfter = jest.fn();
const mockServerTimestamp = jest.fn(() => "SERVER_TIMESTAMP");
const mockRunTransaction = jest.fn();
const mockGetDocs = jest.fn();

// simple tx object reused in runTransaction
const tx = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
};

jest.mock("firebase/firestore", () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  addDoc: (...args) => mockAddDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: (...args) => mockLimit(...args),
  startAfter: (...args) => mockStartAfter(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
  runTransaction: (...args) => mockRunTransaction(...args),
  getDocs: (...args) => mockGetDocs(...args),
}));

// mock db config
jest.mock("../config/firebase-config", () => ({
  db: {}, // just needs to be something
}));

beforeEach(() => {
  jest.clearAllMocks();
  tx.get.mockReset();
  tx.set.mockReset();
  tx.update.mockReset();

  // default runTransaction impl: call the updateFn with our tx object
  mockRunTransaction.mockImplementation((dbArg, updateFn) => {
    return updateFn(tx);
  });
});

describe("conversationIdFor", () => {
  test("creates deterministic id regardless of order", () => {
    const id1 = conversationIdFor("userB", "userA");
    const id2 = conversationIdFor("userA", "userB");

    expect(id1).toBe("dm_userA_userB");
    expect(id2).toBe("dm_userA_userB");
  });
});

describe("ensureConversation", () => {
  test("throws when uids are missing", async () => {
    await expect(ensureConversation(null, "u2")).rejects.toThrow("Missing uids");
    await expect(ensureConversation("u1", null)).rejects.toThrow("Missing uids");
  });

  test("throws when trying to DM yourself", async () => {
    await expect(ensureConversation("u1", "u1")).rejects.toThrow(
      "Cannot DM yourself"
    );
  });

  test("calls setDoc with merge and returns cid", async () => {
    // mock doc ref
    const fakeConvRef = { path: "conversations/dm_u1_u2" };
    mockDoc.mockReturnValue(fakeConvRef);
    mockSetDoc.mockResolvedValue(undefined);

    const result = await ensureConversation("u1", "u2");

    const [calledRef, data, options] = mockSetDoc.mock.calls[0];

    expect(calledRef).toBe(fakeConvRef);
    expect(options).toEqual({ merge: true });

    // basic shape checks
    expect(data.type).toBe("dm");
    expect(data.participants).toEqual(["u1", "u2"]);
    expect(data.participantMap).toEqual({ u1: true, u2: true });
    expect(data.unread).toEqual({ u1: 0, u2: 0 });

    // serverTimestamp should be used
    expect(mockServerTimestamp).toHaveBeenCalled();

    // cid return value
    expect(result).toEqual({ cid: "dm_u1_u2" });
  });
});

describe("watchConversations", () => {
  test("returns no-op unsubscribe when currentUid is falsy", () => {
    const cb = jest.fn();
    const unsubscribe = watchConversations(null, cb);

    unsubscribe(); // should not throw
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  test("subscribes and maps docs to rows", () => {
    const cb = jest.fn();

    mockOnSnapshot.mockImplementation((q, handler) => {
      const snap = {
        docs: [
          { id: "c1", data: () => ({ lastMessage: "Hi" }) },
          { id: "c2", data: () => ({ lastMessage: "Yo" }) },
        ],
      };
      handler(snap);
      return jest.fn(); // unsubscribe
    });

    const unsubscribe = watchConversations("user1", cb);

    expect(mockCollection).toHaveBeenCalledWith({}, "conversations");
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith([
      { id: "c1", lastMessage: "Hi" },
      { id: "c2", lastMessage: "Yo" },
    ]);
    expect(typeof unsubscribe).toBe("function");
  });
});

describe("watchMessages", () => {
  test("returns no-op unsubscribe when cid is falsy", () => {
    const cb = jest.fn();
    const unsubscribe = watchMessages("", cb);
    unsubscribe();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  test("subscribes and passes ordered messages + snapshot", () => {
    const cb = jest.fn();

    const fakeSnap = {
      docs: [
        { id: "m2", data: () => ({ text: "World" }) }, // newer
        { id: "m1", data: () => ({ text: "Hello" }) }, // older
      ],
    };

    mockOnSnapshot.mockImplementation((q, handler) => {
      handler(fakeSnap);
      return jest.fn();
    });

    const unsubscribe = watchMessages("dm_u1_u2", cb);

    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "conversations",
      "dm_u1_u2",
      "messages"
    );
    expect(cb).toHaveBeenCalledTimes(1);

    const [messages, snapArg] = cb.mock.calls[0];

    // should be oldest -> newest
    expect(messages).toEqual([
      { id: "m1", text: "Hello" },
      { id: "m2", text: "World" },
    ]);

    expect(snapArg).toBe(fakeSnap);
    expect(typeof unsubscribe).toBe("function");
  });
});

describe("fetchOlderMessages", () => {
  test("returns empty result if cid or cursorDoc is missing", async () => {
    const res1 = await fetchOlderMessages(null, {});
    const res2 = await fetchOlderMessages("cid", null);

    expect(res1).toEqual({ msgs: [], lastDoc: null });
    expect(res2).toEqual({ msgs: [], lastDoc: null });
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  test("returns ordered messages and lastDoc", async () => {
    const fakeCursor = { id: "cursor" };
    const docNewer = { id: "m3", data: () => ({ text: "Newer" }) };
    const docOlder = { id: "m2", data: () => ({ text: "Older" }) };

    mockGetDocs.mockResolvedValue({
      docs: [docNewer, docOlder], // Firestore returns desc
    });

    const result = await fetchOlderMessages("dm_u1_u2", fakeCursor, 2);

    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "conversations",
      "dm_u1_u2",
      "messages"
    );
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    // msgs should be oldest -> newest
    expect(result.msgs).toEqual([
      { id: "m2", text: "Older" },
      { id: "m3", text: "Newer" },
    ]);

    // lastDoc is last of the docs array (as in implementation)
    expect(result.lastDoc).toBe(docOlder);
  });
});

describe("sendMessage", () => {
  test("throws if conversation does not exist", async () => {
    tx.get.mockResolvedValue({
      exists: () => false,
    });

    await expect(sendMessage("cid", "u1", "hello")).rejects.toThrow(
      "Conversation missing"
    );
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  test("throws if sender is not a participant", async () => {
    tx.get.mockResolvedValue({
      exists: () => true,
      data: () => ({
        participants: ["u2", "u3"],
        participantMap: { u2: true, u3: true },
        unread: { u2: 0, u3: 0 },
      }),
    });

    await expect(sendMessage("cid", "u1", "hello")).rejects.toThrow(
      "Not a participant"
    );
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  test("sets message and updates metadata for valid participant", async () => {
    // conversation where u1 and u2 participate
    tx.get.mockResolvedValue({
      exists: () => true,
      data: () => ({
        participants: ["u1", "u2"],
        participantMap: { u1: true, u2: true },
        unread: { u1: 0, u2: 1 },
      }),
    });

    // doc & collection mocks just return identifiable objects
    mockDoc.mockImplementation((...args) => ({ kind: "doc", args }));
    mockCollection.mockImplementation((...args) => ({ kind: "col", args }));

    await sendMessage("dm_u1_u2", "u1", "hey there");

    // First doc() call -> convRef
    const convRef = mockDoc.mock.results[0].value;
    // collection() call -> msgCol
    const msgCol = mockCollection.mock.results[0].value;
    // Second doc() call -> msgRef (inside transaction)
    const msgRef = mockDoc.mock.results[1].value;

    // tx.get called with convRef
    expect(tx.get).toHaveBeenCalledWith(convRef);

    // tx.set used to write message
    expect(tx.set).toHaveBeenCalledTimes(1);
    const [setRef, setData] = tx.set.mock.calls[0];

    // correct ref
    expect(setRef).toBe(msgRef);

    // correct payload (we don't care about exact timestamp value)
    expect(setData).toEqual(
      expect.objectContaining({
        senderId: "u1",
        text: "hey there",
        type: "text",
      })
    );


    // tx.update to bump metadata and unread counter for recipient (u2)
    expect(tx.update).toHaveBeenCalledTimes(1);

    const [updateRef, updateData] = tx.update.mock.calls[0];

    // correct doc ref
    expect(updateRef).toBe(convRef);

    // we only care about the important fields here
    expect(updateData).toMatchObject({
        lastMessage: "hey there",
        lastSender: "u1",
        "unread.u2": 2, // was 1, now +1
    });
  });
});

describe("markRead", () => {
  test("does nothing if conversation does not exist", async () => {
    tx.get.mockResolvedValue({
      exists: () => false,
    });

    await markRead("cid", "u1");

    expect(tx.update).not.toHaveBeenCalled();
  });

  test("does nothing if user is not a participant", async () => {
    tx.get.mockResolvedValue({
      exists: () => true,
      data: () => ({
        participantMap: { other: true },
      }),
    });

    await markRead("cid", "u1");

    expect(tx.update).not.toHaveBeenCalled();
  });

  test("sets unread count to 0 for participant", async () => {
    tx.get.mockResolvedValue({
      exists: () => true,
      data: () => ({
        participantMap: { u1: true, u2: true },
      }),
    });

    mockDoc.mockImplementation((...args) => ({ kind: "doc", args }));

    await markRead("dm_u1_u2", "u1");

    const convRef = mockDoc.mock.results[0].value;
    expect(tx.update).toHaveBeenCalledWith(convRef, {
      "unread.u1": 0,
    });
  });
});
