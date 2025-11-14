// src/components/FollowListPanel.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { watchFollowers, watchFollowing } from "../../lib/Follows";

import DivButton from "../../components/DivButton";
import FollowButton from "../../components/FollowButton/FollowButton";
import "./FollowListPanel.css";

export default function FollowListPanel({ mode, userId, onCloseModal }) {
  // mode: 'followers' | 'following'
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

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
            <div className="flp-info">
              <img
                className="flp-avatar"
                src={it.profile.photoURL || "https://ui-avatars.com/api/?name=U"}
                alt=""
              />
              <div className="flp-meta">
                <DivButton 
                  className="navGhost" 
                  onClick={() => {
                    if (onCloseModal) onCloseModal();
                    navigate(`/profilepage/${it.uid}`);
                    window.scrollTo(0, 0);
                  }}
                >  
                  <div className="flp-name">@{it.profile.user_name || "user"}</div>
                  {/* Can add a "Follow"/"Following" button here too if desired */}
                </DivButton>
              </div>
            </div>
            <div className = "flp-follows">
              <FollowButton
                  targetUid={it.uid}
                  initialFollowerCount={it.user_follower ?? 0}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}