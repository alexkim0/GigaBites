// src/components/FollowListPanel.jsx
import React, { useEffect, useState } from "react";
import { watchFollowers, watchFollowing } from "../../lib/Follows";
import "./FollowListPanel.css";

export default function FollowListPanel({ mode, userId }) {
  // mode: 'followers' | 'following'
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!userId || (mode !== "followers" && mode !== "following")) return;
    const unsub =
      mode === "followers"
        ? watchFollowers(userId, setItems)
        : watchFollowing(userId, setItems);
    return () => unsub && unsub();
  }, [mode, userId]);

  return (
    <div className="flp-root">
      <h3 className="flp-title">{mode === "followers" ? "Followers" : "Following"}</h3>
      <div className="flp-list">
        {items.length === 0 && <div className="flp-empty">No {mode} yet.</div>}
        {items.map((it) => (
          <div key={it.uid} className="flp-row">
            <img
              className="flp-avatar"
              src={it.profile.photoURL || "https://ui-avatars.com/api/?name=U"}
              alt=""
            />
            <div className="flp-meta">
              <div className="flp-name">@{it.profile.user_name || "user"}</div>
              {/* Can add a "Follow"/"Following" button here too if desired */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}