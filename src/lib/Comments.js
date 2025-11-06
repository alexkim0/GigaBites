// src/lib/comments.js
import { db } from "../config/firebase-config";
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp,
  orderBy,
  updateDoc,
  increment,
  getDoc,
} from "firebase/firestore";

// Add a comment to a post
export async function addComment(postId, userId, text) {
  if (!text.trim()) return;

  const commentsCol = collection(db, "post", postId, "comments");
  await addDoc(commentsCol, {
    uid: userId,
    text,
    createdAt: serverTimestamp(),
  });

  // Optional: increment the comment counter on the post
  await updateDoc(doc(db, "post", postId), {
    post_commentCount: increment(1),
  });
}

// Delete a comment (if the user is the author)
export async function deleteComment(postId, commentId, userId, commentUid) {
  if (userId !== commentUid) return; // prevent others from deleting
  await deleteDoc(doc(db, "post", postId, "comments", commentId));
  await updateDoc(doc(db, "post", postId), {
    post_commentCount: increment(-1),
  });
}

const userCache = new Map();
// Listen for comments in real-time (for a specific post)
export function watchComments(postId, cb) {
  const commentsCol = collection(db, "post", postId, "comments");
  const q = query(commentsCol, orderBy("createdAt", "asc"));

  const unsub = onSnapshot(q, async (snap) => {
    const list = [];
    for (const d of snap.docs) {
      const data = d.data();
      let username = "user";

      // Check cache first
      if (data.uid) {
        if (userCache.has(data.uid)) {
          username = userCache.get(data.uid);
        } else {
          try {
            const userDoc = await getDoc(doc(db, "user", data.uid));
            if (userDoc.exists()) {
              username = userDoc.data().user_name || "user";
              userCache.set(data.uid, username);
            }
          } catch (err) {
            console.error("Failed to fetch user:", err);
          }
        }
      }

      list.push({
        id: d.id,
        text: data.text,
        uid: data.uid,
        username, // attach username
        createdAt: data.createdAt,
      });
    }

    cb(list);
  });
  return unsub;
}