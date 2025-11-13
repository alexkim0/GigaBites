// Hook used for the messagepage to load every username of the list of uid
// src/hooks/useUserNameMap.js
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase-config";

/**
 * Given an array of user IDs, returns a map { uid: user_name }
 * and caches results for the duration of the component.
 */
export function useUserNameMap(uids) {
  const [map, setMap] = useState({});

  useEffect(() => {
    if (!uids || uids.length === 0) return;

    let cancelled = false;

    (async () => {
      const unique = Array.from(new Set(uids));

      const nextMap = {};
      for (const uid of unique) {
        if (!uid) continue;
        try {
          const ref = doc(db, "user", uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            nextMap[uid] = data.user_name || "";
          } else {
            nextMap[uid] = "";
          }
        } catch {
          nextMap[uid] = "";
        }
      }

      if (!cancelled) {
        setMap(prev => ({ ...prev, ...nextMap }));
      }
    })();

    return () => { cancelled = true; };
  }, [uids]);

  return map; // { uid: "username", ... }
}