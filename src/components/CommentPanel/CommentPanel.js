// src/components/CommentPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { auth } from "../../config/firebase-config";
import { addComment, watchComments } from "../../lib/Comments";
import "./CommentPanel.css";

export default function CommentPanel({ postId, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const listRef = useRef(null);
  const userId = auth.currentUser?.uid;

  // Live comments for this post
  useEffect(() => {
    if (!postId) return;
    const unsub = watchComments(postId, (list) => setComments(list));
    return () => unsub && unsub();
  }, [postId]);

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await addComment(postId, userId, text.trim());
      setText("");
    } catch (err) {
      console.error("Add comment failed", err);
    }
  };

  return (
    <aside className="fy-commentpanel">
      <div className="cp-header">
        <h3>Comments</h3>
        <button className="cp-close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="cp-list" ref={listRef}>
        {comments.map((c) => (
          <div key={c.id} className="cp-item">
            <strong>{(c.username || "user").slice(0, 6)}:</strong> {c.text}
          </div>
        ))}
      </div>

      <form className="cp-form" onSubmit={onSubmit}>
        <input
          className="cp-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
        />
        <button type="submit" className="cp-send">Send</button>
      </form>
    </aside>
  );
}