import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase-config";

export function useFollowingList(currentUid, searchTerm = "") {
  const [following, setFollowing] = useState([]);

  // Subscribe to /user/{uid}/following
  useEffect(() => {
    if (!currentUid) {
      setFollowing([]);
      return;
    }

    const colRef = collection(db, "user", currentUid, "following");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,           // the target UID
          ...d.data(),        // should include user_name + photoURL
        }));
        setFollowing(rows);
      },
      (err) => {
        console.error("[useFollowingList] error:", err);
        setFollowing([]);
      }
    );

    return () => unsub();
  }, [currentUid]);

  // Filter ONLY by username
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return following;

    return following.filter((f) => {
      const name = String(f.user_name || "").toLowerCase();
      return name.includes(q);
    });
  }, [following, searchTerm]);

  return { following: filtered, rawFollowing: following };
}