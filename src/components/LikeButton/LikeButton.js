// src/components/LikeButton/LikeButton.js
import React, { useEffect, useState } from "react";
import { auth } from "../../config/firebase-config";
import { toggleLike, watchIsLiked, watchLikeCount } from "../../lib/Likes"; // adjust path if needed
import "./LikeButton.css";

export default function LikeButton({ postId, initialCount }) {
  const userId = auth.currentUser?.uid;
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount ?? 0);
  const [busy, setBusy] = useState(false);

  // Watch real-time "liked" state
  useEffect(() => {
    if (!userId || !postId) return;
    return watchIsLiked(postId, userId, setLiked);
  }, [postId, userId]);

  // Watch real-time like count (optional)
  useEffect(() => {
    if (!postId) return;
    return watchLikeCount(postId, setCount);
  }, [postId]);

  // Handle button click
  const onClick = async () => {
    if (!userId || !postId || busy) return;
    setBusy(true);

    const prevLiked = liked;
    // Optimistic UI: update instantly
    setLiked(!prevLiked);
    setCount((c) => c + (prevLiked ? -1 : 1));

    try {
      await toggleLike(postId, userId);
    } catch (err) {
      console.error("Like failed", err);
      // revert if error
      setLiked(prevLiked);
      setCount((c) => c + (prevLiked ? 1 : -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={`like-btn ${liked ? "liked" : ""}`}
      onClick={onClick}
      disabled={busy}
      title={liked ? "Unlike" : "Like"}
    >
      <i
        className={liked ? "bx bxs-heart" : "bx bx-heart"}
        style={{ color: liked ? "#ee6b6c" : "#000" }}
      ></i>
      {count}
    </button>
  );
}