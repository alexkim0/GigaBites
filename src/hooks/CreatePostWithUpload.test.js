/**
 * @jest-environment jsdom
 */

import { CreatePostWithUpload } from "./CreatePostWithUpload";

// ---- MOCK FIREBASE CONFIG ----
jest.mock("../config/firebase-config", () => ({
  db: {},
  storage: {},
  auth: { currentUser: { uid: "user_123" } },
  serverTimestamp: jest.fn(() => "mock_timestamp"),
}));

// ---- MOCK FIRESTORE ----
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => "mockDocRef"),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
}));

// 1) First, create a basic Jest mock for firebase/storage
jest.mock("firebase/storage", () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// 2) Now import the *mocked* functions so we can configure them
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { doc, setDoc, updateDoc } from "firebase/firestore";

// ---- GLOBAL STUBS ----
global.crypto = { randomUUID: () => "post_abc123" };

beforeAll(() => {
  // needed so getClientMediaMeta() doesn't explode for images
  global.URL.createObjectURL = jest.fn(() => "blob:mock");

  global.Image = class {
    constructor() {
      this.width = 800;
      this.height = 600;
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
    set src(_value) {
      // no-op
    }
  };
});

beforeEach(() => {
  jest.clearAllMocks();

  // mock ref result
  ref.mockReturnValue("mockFileRef");

  // this is the upload task object your code expects
  const mockTask = {
    on: jest.fn((event, progressCb, errorCb, completeCb) => {
      // simulate one progress snapshot
      progressCb({
        bytesTransferred: 50,
        totalBytes: 100,
      });
      // then signal completion
      completeCb();
    }),
  };

  // VERY IMPORTANT: make the mocked uploadBytesResumable return mockTask
  uploadBytesResumable.mockReturnValue(mockTask);

  // download URL mock
  getDownloadURL.mockResolvedValue("https://download-url/test.jpg");
});

describe("CreatePostWithUpload", () => {
  test("successfully uploads file, updates Firestore, and returns post data", async () => {
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const onProgress = jest.fn();

    const result = await CreatePostWithUpload(file, {
      caption: "Test Caption",
      stars: 5,
      post_categories: ["food", "review"],
      onProgress,
    });

    // sanity check: make sure our mock was actually called
    expect(uploadBytesResumable).toHaveBeenCalled();
    const taskReturned = uploadBytesResumable.mock.results[0].value;
    expect(taskReturned).toBeDefined();
    expect(typeof taskReturned.on).toBe("function");

    // Firestore doc was created
    expect(doc).toHaveBeenCalledWith({}, "post", "post_abc123");
    expect(setDoc).toHaveBeenCalled();

    // Upload progress callback fired
    expect(onProgress).toHaveBeenCalledWith(50);

    // Firestore doc was updated with media info
    expect(updateDoc).toHaveBeenCalledTimes(1);

    const [refArg, dataArg] = updateDoc.mock.calls[0];

    // we don't care what refArg is, only that the data is correct
    expect(dataArg).toEqual({
    post_media: [
        {
        storagePath: "uploads/user_123/post_abc123/test.jpg",
        downloadURL: "https://download-url/test.jpg",
        mimeType: "image/jpeg",
        width: 800,
        height: 600,
        durationMs: null,
        },
    ],
    });


    // Return value is correct
    expect(result).toEqual({
      postId: "post_abc123",
      downloadURL: "https://download-url/test.jpg",
      storagePath: "uploads/user_123/post_abc123/test.jpg",
    });
  });

  test("throws if user is not signed in", async () => {
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    const firebaseConfig = require("../config/firebase-config");
    firebaseConfig.auth.currentUser = null;

    await expect(CreatePostWithUpload(file)).rejects.toThrow("Not signed in");

    firebaseConfig.auth.currentUser = { uid: "user_123" }; // restore
  });
});
