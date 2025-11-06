// src/lib/follow.js
import { db } from "../config/firebase-config";
import {
  doc, onSnapshot, runTransaction, serverTimestamp, increment, updateDoc, setDoc, deleteDoc,
} from "firebase/firestore";

/**
 * Realtime: is the viewer (userId) following the profile owner (targetUid)?
 * We watch the follower doc that would exist under the target user.
 * Path: user/{targetUid}/followers/{userId}
 */
export function watchIsFollowing(targetUid, userId, cb) {
  if (!targetUid || !userId) return () => {};
  const ref = doc(db, "user", targetUid, "followers", userId);
  return onSnapshot(ref, (snap) => cb(snap.exists()));
}

/**
 * Realtime: follower count of the target user.
 * We assume the count lives on user doc field: user_follower (number).
 */
export function watchFollowerCount(targetUid, cb) {
  if (!targetUid) return () => {};
  const ref = doc(db, "user", targetUid);
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? Number(snap.data()?.user_follower || 0) : 0);
  });
}

/**
 * Toggle follow/unfollow atomically, updating both sides + counters.
 * - Creates/deletes:
 *   user/{targetUid}/followers/{userId}
 *   user/{userId}/following/{targetUid}
 * - Updates counters:
 *   user/{targetUid}.user_follower  (+1 / -1)
 *   user/{userId}.user_following    (+1 / -1)
 */
export async function toggleFollow(targetUid, userId) {
  if (!targetUid || !userId) throw new Error("Missing ids");
  if (targetUid === userId) throw new Error("You can’t follow yourself.");

  const targetUserRef  = doc(db, "user", targetUid);
  const meUserRef      = doc(db, "user", userId);
  const followerRef    = doc(db, "user", targetUid, "followers", userId);
  const followingRef   = doc(db, "user", userId, "following", targetUid);

  const result = await runTransaction(db, async (tx) => {
    const followerSnap = await tx.get(followerRef);

    if (!followerSnap.exists()) {
      // FOLLOW
      tx.set(followerRef, {
        uid: userId,
        targetUid,
        createdAt: serverTimestamp(),
      });
      tx.set(followingRef, {
        uid: userId,
        followingUid: targetUid,
        createdAt: serverTimestamp(),
      });
      tx.update(targetUserRef,  { user_follower:  increment(1) });
      tx.update(meUserRef,      { user_following: increment(1) });
      return { following: true };
    } else {
      // UNFOLLOW
      tx.delete(followerRef);
      tx.delete(followingRef);
      tx.update(targetUserRef,  { user_follower:  increment(-1) });
      tx.update(meUserRef,      { user_following: increment(-1) });
      return { following: false };
    }
  });

  return result; // { following: true/false }
}