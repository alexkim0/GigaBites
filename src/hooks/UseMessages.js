import { useEffect, useRef, useState } from "react";
import { watchMessages, markRead, sendMessage } from "../lib/Chat";
import { auth } from "../config/firebase-config";

export function useMessages(cid) {
  const [list, setList] = useState([]);
  const me = auth.currentUser?.uid;

  useEffect(() => {
    if (!cid) return;
    const unsub = watchMessages(cid, setList);
    // mark read when you open a conversation
    markRead(cid, me).catch(() => {});
    return () => unsub && unsub();
  }, [cid, me]);

  const send = async (text) => {
    if (!cid || !me || !text.trim()) return;
    await sendMessage(cid, me, text.trim());
  };

  return { list, send };
}