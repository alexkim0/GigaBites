// lib/likes.js
import {
    doc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
    increment,
} from "firebase/firestore";
import { db } from "../config/firebase-config";


/** Subscribe to whether the current user liked this post. */
export function watchIsLiked(postId, userId, cb) {
    if (!postId || !userId) return () => {};
    const likeRef = doc(db, "post", postId, "likes", userId);
    // opens a realtime listener to that document(likeRef)
    // Firestore will call your function every time the document changes (created, updated, deleted).
    const unsub = onSnapshot(likeRef, (snap) => cb(snap.exists()));
    return unsub;
}

/** Subscribe to the post's like count if you want it live. */
export function watchLikeCount(postId, cb) {
    if (!postId) return () => {};
    const postRef = doc(db, "post", postId);
    const unsub = onSnapshot(postRef, (snap) => {
        cb(snap.exists() ? Number(snap.data()?.post_likeCount || 0) : 0);
    });
    return unsub;
}


/** Toggle like/unlike atomically. Returns {liked: boolean}. */
export async function toggleLike(postId, userId) {
    const postRef = doc(db, "post", postId);
    const likeRef = doc(db, "post", postId, "likes", userId);

    const result = await runTransaction(db, async (tx) => {
        const likeSnap = await tx.get(likeRef);
        if (!likeSnap.exists()) {
        // LIKE
        tx.set(likeRef, {
            uid: userId,
            createdAt: serverTimestamp(),
        });
        tx.update(postRef, { post_likeCount: increment(1) });
        return { liked: true };
        } else {
        // UNLIKE
        // just deletes the whole uid field itself
        tx.delete(likeRef);
        tx.update(postRef, { post_likeCount: increment(-1) });
        return { liked: false };
        }
    });

    return result;
}