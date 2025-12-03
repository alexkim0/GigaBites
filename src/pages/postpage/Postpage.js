// src/pages/postpage/Postpage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../../config/firebase-config";
import { doc, onSnapshot, getDoc, deleteDoc } from "firebase/firestore";
import LikeButton from "../../components/LikeButton/LikeButton";
import DivButton from "../../components/DivButton";
import CommentPanel from "../../components/CommentPanel/CommentPanel";
import "./Postpage.css";

export function Postpage() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState({ displayName: "", photoURL: "" });
  const [soundOn, setSoundOn] = useState(false);
  const [openCommentsPostId, setOpenCommentsPostId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const toggleComments = (id) =>
    setOpenCommentsPostId((cur) => (cur === id ? null : id));

  const containerRef = useRef(null);

  // Subscribe to a single post
  useEffect(() => {
    if (!postId) return;

    const ref = doc(db, "post", postId);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          setPost({ notFound: true });
          return;
        }

        const p = { id: snap.id, ...snap.data() };

        // Visibility guard (allow public or owner)
        const currentUid = auth.currentUser?.uid;
        const owner = currentUid && currentUid === p.post_authorId;

        setIsOwner(Boolean(owner));

        if (p.post_visibility !== "public" && !owner) {
          setPost({ forbidden: true });
          return;
        }

        // Normalize like Feed
        const media0 =
          Array.isArray(p.post_media) && p.post_media.length > 0
            ? p.post_media[0]
            : null;
        const mediaURL = media0?.downloadURL || p.post_url || "";
        const mime = String(media0?.mimeType || "").toLowerCase();
        const isVideo = p.post_type === "video" || mime.startsWith("video/");

        const r = p.post_restaurant || null;
        const restaurantName = r?.name || p.post_text || "";
        const restaurantLat = r?.lat ?? null;
        const restaurantLng = r?.lng ?? null;
        const restaurantPlaceId = r?.placeId || p.post_placeId || null;

        setPost({
          id: p.id,
          caption: p.post_caption || "",
          stars: Number(p.post_stars || 0),
          likeCount: Number(p.post_likeCount || 0),
          commentCount: Number(p.post_commentCount || 0),
          date: p.post_date,
          type: isVideo ? "video" : "image",
          mediaURL,
          restaurant: restaurantName,
          restaurantLat,
          restaurantLng,
          restaurantPlaceId,
          authorId: p.post_authorId || "",
        });

        // Load author profile
        try {
          if (p.post_authorId) {
            const uref = doc(db, "user", p.post_authorId);
            const usnap = await getDoc(uref);
            if (usnap.exists()) {
              setAuthor({
                displayName: usnap.data().user_name || "",
                photoURL: usnap.data().user_pfp || "",
              });
            } else {
              setAuthor({
                displayName: (p.post_authorId || "user").slice(0, 6),
                photoURL: "",
              });
            }
          }
        } catch {
          setAuthor({
            displayName: (p.post_authorId || "user").slice(0, 6),
            photoURL: "",
          });
        }
      },
      (err) => {
        console.error("[post:onSnapshot]", err);
        setPost({ error: true });
      }
    );

    return () => unsub();
  }, [postId]);

  // Autoplay / pause behavior for single video
  useEffect(() => {
    if (!post || post.type !== "video") return;
    const video = containerRef.current?.querySelector("video");
    if (!video) return;

    video.play().catch(() => {});
    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [post?.id, post?.type]);

  const chipStars = useMemo(() => {
    if (!post) return "";
    return ("★".repeat(Math.round(post.stars)) + "☆☆☆☆").slice(0, 5);
  }, [post?.stars]);

  const toggleSound = () => {
    const video = containerRef.current?.querySelector("video");
    if (!video) return;
    const willUnmute = !soundOn;
    video.muted = !willUnmute;
    if (willUnmute) video.play().catch(() => {});
    setSoundOn(willUnmute);
  };

  const handleDelete = async () => {
    if (!post || !isOwner) return;

    const ok = window.confirm("Delete this post? This cannot be undone.");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "post", post.id));
      navigate("/feed");
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Failed to delete post. Please try again.");
    }
  };

  // 🔹 View on map (same behavior as Feed)
  const viewOnMap = (postWithLocation) => {
    if (!postWithLocation.restaurantLat || !postWithLocation.restaurantLng)
      return;

    const params = new URLSearchParams({
      lat: String(postWithLocation.restaurantLat),
      lng: String(postWithLocation.restaurantLng),
      name: postWithLocation.restaurant || "",
    });

    if (postWithLocation.restaurantPlaceId) {
      params.set("placeId", postWithLocation.restaurantPlaceId);
    }

    navigate(`/mapspage?${params.toString()}`);
  };

  // Simple states
  if (!post) {
    return (
      <div className="fy-root">
        <header className="fy-header">
          <DivButton className="ghost2" onClick={() => navigate(-1)}>
            ← Back
          </DivButton>
          <div className="fy-actions" />
        </header>
        <main className="fy-feed">
          <div className="fy-empty">Loading…</div>
        </main>
      </div>
    );
  }

  if (post.notFound) {
    return (
      <div className="fy-root">
        <header className="fy-header">
          <DivButton className="ghost2" onClick={() => navigate(-1)}>
            ← Back
          </DivButton>
          <div className="fy-actions" />
        </header>
        <main className="fy-feed">
          <div className="fy-empty">Post not found.</div>
        </main>
      </div>
    );
  }

  if (post.forbidden) {
    return (
      <div className="fy-root">
        <header className="fy-header">
          <DivButton className="ghost2" onClick={() => navigate(-1)}>
            ← Back
          </DivButton>
          <div className="fy-actions" />
        </header>
        <main className="fy-feed">
          <div className="fy-empty">You don’t have access to this post.</div>
        </main>
      </div>
    );
  }

  if (post.error) {
    return (
      <div className="fy-root">
        <header className="fy-header">
          <DivButton className="ghost2" onClick={() => navigate(-1)}>
            ← Back
          </DivButton>
          <div className="fy-actions" />
        </header>
        <main className="fy-feed">
          <div className="fy-empty">Something went wrong.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="fy-root">
      <header className="fy-header">
        <div className="fy-actions">
          <DivButton
            className="ghost2"
            onClick={() => navigate(`/profilepage/${post.authorId || ""}`)}
          >
            X
          </DivButton>
        </div>
      </header>

      <main ref={containerRef} className="fy-feed">
        <section className="fy-card" data-id={post.id}>
          <div className="fy-post-wrap">
            <div className="fy-frame">
              <div className="fy-media-wrap">
                {post.type === "video" ? (
                  <video
                    src={post.mediaURL}
                    className="fy-media"
                    loop
                    muted={!soundOn}
                    playsInline
                    onClick={(e) => {
                      const v = e.currentTarget;
                      if (v.paused) v.play();
                      else v.pause();
                    }}
                  />
                ) : (
                  <img
                    src={post.mediaURL}
                    alt={post.caption}
                    className="fy-media"
                  />
                )}
                <div className="fy-overlay">
                  <div className="fy-chip">
                    <span className="stars">{chipStars}</span>
                    {post.restaurant ? <span className="sep">·</span> : null}
                    {post.restaurant ? (
                      <span className="rest">{post.restaurant}</span>
                    ) : null}
                    <span className="sep">·</span>
                    <span className="counts">
                      ❤ {post.likeCount} · 💬 {post.commentCount}
                    </span>
                  </div>

                  <p className="fy-caption">{post.caption}</p>

                  <div className="fy-meta">
                    <img
                      src={
                        author.photoURL ||
                        "https://ui-avatars.com/api/?name=U"
                      }
                      className="fy-avatar"
                      alt=""
                    />
                    <span className="fy-handle">
                      @{author.displayName || "user"}
                    </span>
                  </div>

                  {/* Map button in overlay to match Feed feel */}
                  <button
                    type="button"
                    className="fy-mapbtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewOnMap(post);
                    }}
                    disabled={!post.restaurantLat || !post.restaurantLng}
                    title={
                      post.restaurantLat ? "View on map" : "No location set"
                    }
                  >
                    📍 View on map
                  </button>

                  {post.type === "video" && (
                    <button
                      type="button"
                      className="fy-volbtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSound();
                      }}
                      title={soundOn ? "Mute" : "Unmute"}
                    >
                      {soundOn ? "🔊" : "🔇"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="fy-buttonbar">
              <LikeButton postId={post.id} initialCount={post.likeCount} />
              <button
                className="comment-btn"
                onClick={() => toggleComments(post.id)}
                title="Comments"
              >
                💬 {String(post.commentCount ?? 0)}
              </button>

              <button
                className="share-btn"
                onClick={() =>
                  navigator
                    .share?.({ url: window.location.href })
                    .catch(() => {})
                }
                title="Share"
              >
                <i className="bx bxs-send"></i>
              </button>

              {isOwner && (
                <button
                  className="delete-btn"
                  onClick={handleDelete}
                  title="Delete post"
                >
                  🗑
                </button>
              )}
            </div>

            {openCommentsPostId === post.id && (
              <CommentPanel
                postId={post.id}
                onClose={() => setOpenCommentsPostId(null)}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Postpage;
