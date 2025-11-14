// src/components/FollowButton.js
import React, { useEffect, useState } from "react";
import { auth } from "../../config/firebase-config";
import { toggleFollow, watchIsFollowing, watchFollowerCount } from "../../lib/Follows";
import "./FollowButton.css";

export default function FollowButton({ targetUid, initialFollowerCount }) {
  const userId = auth.currentUser?.uid;
  const isSelf = userId && userId === targetUid;

  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(initialFollowerCount ?? 0);
  const [busy, setBusy] = useState(false);

  // Realtime "am I following?"
  useEffect(() => {
    if (!userId || !targetUid || isSelf) return;
    return watchIsFollowing(targetUid, userId, setFollowing);
  }, [userId, targetUid, isSelf]);

  // Realtime follower count
  useEffect(() => {
    if (!targetUid) return;
    return watchFollowerCount(targetUid, setCount);
  }, [targetUid]);

  const onClick = async () => {
    if (!userId || !targetUid || isSelf || busy) return;
    setBusy(true);

    // Optimistic UI
    const prev = following;
    setFollowing(!prev);
    setCount((c) => c + (prev ? -1 : 1));

    try {
      const { following: serverFollowing } = await toggleFollow(targetUid, userId);
      // (optional) reconcile if server disagrees
      if (serverFollowing !== !prev) {
        setFollowing(serverFollowing);
        setCount((c) => c + (serverFollowing ? 1 : -1) - (prev ? 1 : -1));
      }
    } catch (e) {
      // revert on error
      setFollowing(prev);
      setCount((c) => c + (prev ? 1 : -1));
      console.error("Follow failed", e);
    } finally {
      setBusy(false);
    }
  };

  if (isSelf) return null; // don’t show a follow button for yourself

  return (
    <button
      className={`follow-btn ${following ? "following" : ""}`}
      onClick={onClick}
      disabled={busy}
      title={following ? "Unfollow" : "Follow"}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}