// src/lib/follow.js
import { db } from "../config/firebase-config";
import {
  doc, onSnapshot, runTransaction, serverTimestamp, increment, updateDoc, setDoc, deleteDoc, getDoc,
  query, collection, orderBy
} from "firebase/firestore";

// Simple in-memory cache for user profiles
const userCache = new Map(); // uid -> { user_name, photoURL }

// Gets User's username and profile picture if they have one
async function getUserProfile(uid) {
  if (!uid) return { user_name: "user", photoURL: "" };
  if (userCache.has(uid)) return userCache.get(uid);
  const snap = await getDoc(doc(db, "user", uid));
  const prof = snap.exists()
    ? { user_name: snap.data().user_name || "user", photoURL: snap.data().photoURL || "" }
    : { user_name: "user", photoURL: "" };
  userCache.set(uid, prof);
  return prof;
}

/**
 * Watch follower subcollection for a target user, returns array of { uid, createdAt, profile }
 * Path: user/{targetUid}/followers/{followerUid}
 */
export function watchFollowers(targetUid, cb) {
  if (!targetUid) return () => {};
  const q = query(
    collection(db, "user", targetUid, "followers"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, async (snap) => {
    const items = [];
    for (const d of snap.docs) {
      const data = d.data();
      const profile = await getUserProfile(d.id); // doc id is follower uid
      items.push({
        id: d.id,
        uid: d.id,
        createdAt: data.createdAt,
        profile,
      });
    }
    cb(items);
  });
}


/**
 * Watch following subcollection for the viewer (or any user), returns array of { uid, createdAt, profile }
 * Path: user/{meUid}/following/{targetUid}
 */
export function watchFollowing(meUid, cb) {
  if (!meUid) return () => {};
  const q = query(
    collection(db, "user", meUid, "following"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, async (snap) => {
    const items = [];
    for (const d of snap.docs) {
      const data = d.data();
      const profile = await getUserProfile(d.id); // doc id is the followed user uid
      items.push({
        id: d.id,
        uid: d.id,
        createdAt: data.createdAt,
        profile,
      });
    }
    cb(items);
  });
}

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