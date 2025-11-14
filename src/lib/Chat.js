// src/lib/chat.js
import { db } from "../config/firebase-config";
import {
  collection, doc, getDoc, setDoc, addDoc, onSnapshot,
  query, where, orderBy, limit, startAfter, serverTimestamp, runTransaction, getDocs
} from "firebase/firestore";

/** Deterministic ID for 1:1 conversation */
export function conversationIdFor(uidA, uidB) {
  const [a, b] = [uidA, uidB].sort();
  return `dm_${a}_${b}`;
}

/** Ensure a conversation exists between current user and target; returns { cid } */
export async function ensureConversation(currentUid, targetUid) {
  if (!currentUid || !targetUid) throw new Error("Missing uids");
  if (currentUid === targetUid) throw new Error("Cannot DM yourself");

  const cid = conversationIdFor(currentUid, targetUid);
  const cref = doc(db, "conversations", cid);

  // We always set the doc with merge:true:
  // - If it doesn't exist -> create (uses "create" rule)
  // - If it exists -> update (uses "update" rule)
  await setDoc(
    cref,
    {
      // optional but nice to have
      type: "dm",

      participants: [currentUid, targetUid],
      participantMap: {
        [currentUid]: true,
        [targetUid]: true,
      },

      // only set createdAt if missing; updatedAt/lastAt always bumped
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastAt: serverTimestamp(),

      // last message info (empty until first message)
      lastMessage: "",
      lastSender: "",

      // unread counters per user
      unread: {
        [currentUid]: 0,
        [targetUid]: 0,
      },
    },
    { merge: true } // 🔴 key change: no more getDoc, just merge
  );
  return { cid };
}

/** Watch the current user's conversation list (left pane) */
export function watchConversations(currentUid, cb, pageSize = 20) {
  if (!currentUid) return () => {};

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUid),
    orderBy("updatedAt", "desc"),
    limit(pageSize)
  );

  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(rows);
  });
}

/** Watch messages for a conversation (right pane) */
export function watchMessages(cid, cb, pageSize = 30) {
  if (!cid) return () => {};
  const q = query(
    collection(db, "conversations", cid, "messages"),
    orderBy("createdAt", "desc"), // fetch newest first for paging
    limit(pageSize)
  );
  return onSnapshot(q, (snap) => {
    const docs = snap.docs;
    const msgs = docs.map(d => ({ id: d.id, ...d.data() }));
    // oldest → newest for UI
    const ordered = msgs.slice().reverse();

    // ⬅️ pass both messages and the snapshot so we can paginate
    cb(ordered, snap);
  });
}

// loads older messages when scrolling up
export async function fetchOlderMessages(cid, cursorDoc, pageSize = 30) {
  if (!cid || !cursorDoc) {
    return { msgs: [], lastDoc: null };
  }

  const q = query(
    collection(db, "conversations", cid, "messages"),
    orderBy("createdAt", "desc"),
    startAfter(cursorDoc),      // continue *after* the last doc we saw
    limit(pageSize)
  );

  const snap = await getDocs(q);
  const docs = snap.docs;
  const batch = docs.map(d => ({ id: d.id, ...d.data() }));

  // again, Firestore returns newest→oldest (desc), so reverse for UI
  const ordered = batch.slice().reverse();

  return {
    msgs: ordered,                           // oldest → newest
    lastDoc: docs[docs.length - 1] || null,  // new cursor
  };
}

/** Send a message + update conversation metadata + increment recipient unread */
export async function sendMessage(cid, senderId, text) {
  const convRef = doc(db, "conversations", cid);
  const msgCol = collection(db, "conversations", cid, "messages");

  // add message and update in a transaction to keep metadata consistent
  await runTransaction(db, async (tx) => {
    const convSnap = await tx.get(convRef);
    if (!convSnap.exists()) throw new Error("Conversation missing");
    const conv = convSnap.data();
    if (!conv.participantMap?.[senderId]) throw new Error("Not a participant");

    const recipientId = conv.participants.find(u => u !== senderId);

    // message
    const msgRef = doc(msgCol); // custom id to stay inside tx
    tx.set(msgRef, {
      senderId,
      text,
      type: "text",
      createdAt: serverTimestamp()
    });

    // metadata + unread
    tx.update(convRef, {
      updatedAt: serverTimestamp(),
      lastMessage: text,
      lastSender: senderId,
      lastAt: serverTimestamp(),
      [`unread.${recipientId}`]: (conv.unread?.[recipientId] ?? 0) + 1
    });
  });
}

/** Mark conversation read for current user (set unread to 0) */
export async function markRead(cid, currentUid) {
  const convRef = doc(db, "conversations", cid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(convRef);
    if (!snap.exists()) return;
    const conv = snap.data();
    if (!conv.participantMap?.[currentUid]) return;
    tx.update(convRef, { [`unread.${currentUid}`]: 0 });
  });
}