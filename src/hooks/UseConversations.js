import { useEffect, useState } from "react";
import { watchConversations } from "../lib/Chat";

export function useConversations(currentUid) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!currentUid) return;
    return watchConversations(currentUid, setItems);
  }, [currentUid]);
  return items;
}