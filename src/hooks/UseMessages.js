import { useEffect, useRef, useState } from "react";
import { watchMessages, markRead, sendMessage, fetchOlderMessages } from "../lib/Chat";
import { auth } from "../config/firebase-config";

export function useMessages(cid, pageSize = 30) {
  const me = auth.currentUser?.uid;
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor]     = useState(null);   // last doc from oldest page
  const [hasMore, setHasMore]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // subscribe to latest page
  useEffect(() => {
    if (!cid) {
      setMessages([]);
      setCursor(null);
      setHasMore(true);
      return;
    }

    const unsub = watchMessages(cid, (batch, snap) => {
      // batch is newest page in chronological order (oldest → newest within that page)

      // compute cursor from the snapshot (desc order result)
      const docs = snap.docs;
      const lastDoc = docs[docs.length - 1] || null;

      // if we already had older messages, keep them;
      // replace the "tail" with the fresh realtime page
      setMessages(prev => {
        if (prev.length === 0) return batch;  // first time

        // keep all messages strictly older than the first of batch
        const firstNew = batch[0];
        if (!firstNew?.createdAt) return prev; // safety

        const firstTs = firstNew.createdAt.toMillis
          ? firstNew.createdAt.toMillis()
          : +new Date(firstNew.createdAt);

        const older = prev.filter(m => {
          if (!m.createdAt) return true;
          const t = m.createdAt.toMillis
            ? m.createdAt.toMillis()
            : +new Date(m.createdAt);
          return t < firstTs;
        });

        return [...older, ...batch];
      });

      setCursor(lastDoc);
      if (docs.length < pageSize) {
        setHasMore(false); // no more older messages
      }
    }, pageSize);

    return () => {
      unsub && unsub();
      setMessages([]);
      setCursor(null);
      setHasMore(true);
    };
  }, [cid, pageSize]);

  // load older messages when requested
  const loadMore = async () => {
    if (!cid || !cursor || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const { msgs, lastDoc } = await fetchOlderMessages(cid, cursor, pageSize);
      if (msgs.length === 0) {
        setHasMore(false);
        return;
      }

      // prepend older messages at the top
      setMessages(prev => [...msgs, ...prev]);
      setCursor(lastDoc);
      if (!lastDoc) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async (text) => {
    if (!cid || !me || !text.trim()) return;
    await sendMessage(cid, me, text.trim());
  };

  return { messages, send, hasMore, loadingMore, loadMore }
}