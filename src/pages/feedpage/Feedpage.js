import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { auth, db } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import DivButton from "../../components/DivButton";
import {collection,onSnapshot,orderBy,query,where,doc,getDoc,} from "firebase/firestore";
import LikeButton from "../../components/LikeButton/LikeButton";
import CommentPanel from "../../components/CommentPanel/CommentPanel";
import "./Feedpage.css";

export const Feed = () => {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid || "";

  const [rawPosts, setRawPosts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [openCommentsPostId, setOpenCommentsPostId] = useState(null);
  const toggleComments = useCallback(
    (postId) =>
      setOpenCommentsPostId((cur) => (cur === postId ? null : postId)),
    []
  );

  const containerRef = useRef(null);
  const authorCacheRef = useRef(new Map());
  const fallbackUnsubRef = useRef(null);

  const [soundOnPostId, setSoundOnPostId] = useState(null); // which post is unmuted

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  }, [navigate]);

  const profilePage = useCallback(() => navigate(`/profilepage/${uid}`), [navigate, uid]);
  const createPage = useCallback(() => navigate("/createpage"), [navigate]);

  // Fetch public posts with real-time updates
  useEffect(() => {
    const base = collection(db, "post");
    const q1 = query(
      base,
      where("post_visibility", "==", "public"),
      orderBy("post_date", "desc")
    );

    let primaryUnsub = onSnapshot(
      q1,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRawPosts(list);
      },
      (err) => {
        console.error("[post:onSnapshot]", err);
        if (err?.code === "failed-precondition") {
          // Missing composite index: fall back to client-side filter
          if (primaryUnsub) {
            primaryUnsub();
            primaryUnsub = null;
          }
          const q2 = query(base, orderBy("post_date", "desc"));
          const fbUnsub = onSnapshot(q2, (snap2) => {
            const list = snap2.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((p) => p.post_visibility === "public");
            setRawPosts(list);
          });
          fallbackUnsubRef.current = fbUnsub;
        }
      }
    );

    return () => {
      if (primaryUnsub) primaryUnsub();
      if (fallbackUnsubRef.current) {
        fallbackUnsubRef.current();
        fallbackUnsubRef.current = null;
      }
    };
  }, []);

  // Normalize post shape and fetch author profiles from "user" (singular)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = [];
      for (const p of rawPosts) {
        const media0 =
          Array.isArray(p.post_media) && p.post_media.length > 0
            ? p.post_media[0]
            : null;
        const mediaURL = media0?.downloadURL || p.post_url || "";
        const mime = String(media0?.mimeType || "").toLowerCase();
        const isVideo = p.post_type === "video" || mime.startsWith("video/");

        let author = authorCacheRef.current.get(p.post_authorId);
        if (!author) {
          try {
            const uref = doc(db, "user", p.post_authorId); // singular "user"
            const usnap = await getDoc(uref);
            author = usnap.exists()
              ? {
                  displayName: usnap.data().user_name || "",
                  photoURL: usnap.data().photoURL || "",
                }
              : {
                  displayName: (p.post_authorId || "user").slice(0, 6),
                  photoURL: "",
                };
          } catch {
            author = {
              displayName: (p.post_authorId || "user").slice(0, 6),
              photoURL: "",
            };
          }
          authorCacheRef.current.set(p.post_authorId, author);
        }

        next.push({
          id: p.id,
          authorId: p.post_authorId,
          caption: p.post_caption || "",
          stars: Number(p.post_stars || 0),
          likeCount: Number(p.post_likeCount || 0),
          commentCount: Number(p.post_commentCount || 0),
          date: p.post_date,
          type: isVideo ? "video" : "image",
          mediaURL,
          author,
          restaurant: p.post_text || "",
        });
      }
      if (!cancelled) setPosts(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [rawPosts]);

  // Determine which card is centered
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cards = Array.from(container.querySelectorAll("section[data-index]"));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const idx = Number(visible[0].target.getAttribute("data-index"));
          setActiveIndex(idx);
        }
      },
      { root: container, threshold: [0.6] }
    );
    cards.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [posts.length]);

  // Autoplay/pause videos based on activeIndex
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    posts.forEach((p, i) => {
      if (p.type !== "video") return;
      const video = container.querySelector(`section[data-index='${i}'] video`);
      if (!video) return;
      if (i === activeIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {}
      }
    });
  }, [activeIndex, posts]);

  const empty = useMemo(() => posts.length === 0, [posts.length]);

  const handleClickAuthor = useCallback(
    (authorId) => navigate(`/profilepage/${authorId}`),
    [navigate]
  );

  const toggleSound = useCallback(
    (postId) => {
      const container = containerRef.current;
      const video = container?.querySelector(
        `section[data-id='${postId}'] video`
      );
      if (!video) return;
      const willUnmute = soundOnPostId !== postId;
      try {
        // iOS/Safari requires play() in the same user gesture that unmutes
        video.muted = !willUnmute;
        if (willUnmute) video.play().catch(() => {});
        setSoundOnPostId(willUnmute ? postId : null);
      } catch (e) {
        console.error("toggleSound failed", e);
      }
    },
    [soundOnPostId]
  );

  return (
    <div className="fy-root">
      <main ref={containerRef} className="fy-feed">
        <div className="fy-userbar">
          Signed in as <strong>{auth?.currentUser?.email || "user"}</strong>
        </div>

        {posts.map((p, i) => (
          <section key={p.id} data-index={i} data-id={p.id} className="fy-card">
            <div className="fy-post-wrap">
              <div className="fy-frame">
                <div className="fy-media-wrap">
                  {p.type === "video" ? (
                    <video
                      src={p.mediaURL}
                      className="fy-media"
                      loop
                      muted={soundOnPostId !== p.id} // unmute only the active toggled post
                      playsInline
                      onClick={(e) => {
                        const v = e.currentTarget;
                        if (v.paused) v.play();
                        else v.pause();
                      }}
                    />
                  ) : (
                    <img src={p.mediaURL} alt={p.caption} className="fy-media" />
                  )}

                  <div className="fy-overlay">
                    <div className="fy-chip">
                      <span className="stars">
                        {("★".repeat(Math.round(p.stars)) + "☆☆☆☆").slice(0, 5)}
                      </span>
                      {p.restaurant ? <span className="sep">·</span> : null}
                      {p.restaurant ? (
                        <span className="rest">{p.restaurant}</span>
                      ) : null}
                      <span className="sep">·</span>
                      <span className="counts">
                        ❤ {p.likeCount} · 💬 {p.commentCount}
                      </span>
                    </div>

                    <p className="fy-caption">{p.caption}</p>

                    <div className="fy-meta">
                      <img
                        src={
                          p.author.photoURL ||
                          "https://ui-avatars.com/api/?name=U"
                        }
                        className="fy-avatar"
                        alt=""
                      />
                      <span
                        className="fy-handle"
                        role="button"
                        tabIndex={0}
                        title="View Profile"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClickAuthor(p.authorId);
                        }}
                      >
                        @{p.author.displayName || "user"}
                      </span>
                    </div>

                    {p.type === "video" && (
                      <button
                        type="button"
                        className="fy-volbtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSound(p.id);
                        }}
                        title={soundOnPostId === p.id ? "Mute" : "Unmute"}
                      >
                        {soundOnPostId === p.id ? "🔊" : "🔇"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="fy-buttonbar">
                <LikeButton postId={p.id} initialCount={p.likeCount} />
                <button
                  className="comment-btn"
                  onClick={() => toggleComments(p.id)}
                  title="Comments"
                >
                  💬 {String(p.commentCount ?? 0)}
                </button>
                <button
                  className="share-btn"
                  onClick={() => console.log("share", p.id)}
                  title="Share"
                >
                  ↗️
                </button>
              </div>

              {openCommentsPostId === p.id ? (
                <CommentPanel
                  postId={p.id}
                  onClose={() => setOpenCommentsPostId(null)}
                />
              ) : null}
            </div>
          </section>
        ))}

        {!empty ? null : (
          <div className="fy-empty">No public posts yet — create one!</div>
        )}
      </main>
    </div>
  );
};

export default Feed;
