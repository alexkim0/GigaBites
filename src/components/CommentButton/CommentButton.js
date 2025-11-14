// src/components/CommentButton/CommentButton.js
import React, { useEffect, useState } from "react";
import { auth } from "../../config/firebase-config";
import { addComment, watchComments } from "../../lib/Comments";
import "./CommentButton.css";

export default function CommentButton({ count = 0, onToggle }) {
  const [iconOpen, setIconOpen] = useState(false);

  return (
    <button
      className="comment-btn"
      onClick={() => { onToggle(); setIconOpen(!iconOpen); }}
      title="Comments"
      type="button"
    >
      💬 {count}
    </button>
  );
}