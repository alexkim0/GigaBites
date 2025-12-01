// src/pages/feedpage/Feedpage.js
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { auth, db } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import DivButton from "../../components/DivButton";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import LikeButton from "../../components/LikeButton/LikeButton";
import CommentPanel from "../../components/CommentPanel/CommentPanel";
import "./Feedpage.css";

const TAG_OPTIONS = [
  "Japanese",
  "Korean BBQ",
  "Chinese",
  "Thai",
  "Italian",
  "Mexican",
  "Indian",
  "Vietnamese",
  "Dessert",
  "Coffee",
  "Street Food",
  "Seafood",
  "Vegan",
  "BBQ",
  "Hot Pot",
  "Boba",
];

export const Feed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = auth.currentUser?.uid || "";

  // /feed?placeId=abc123&name=Whatever
  const searchParams = new URLSearchParams(location.search);
  const placeIdFilter = searchParams.get("placeId") || "";
  const placeNameFilter = searchParams.get("name");
  const placeFilterLabel = placeNameFilter
    ? decodeURIComponent(placeNameFilter)
    : null;

  const clearFilter = useCallback(() => navigate("/feed"), [navigate]);

  const [rawPosts, setRawPosts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [initialized, setInitialized] = useState(false);

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
  const [activeTag, setActiveTag] = useState(null); // null = "All"
  const [showTagFilter, setShowTagFilter] = useState(false);

  const toggleTagFilter = useCallback(() => {
    setShowTagFilter((prev) => {
      const next = !prev;
      // when closing the filter UI, reset tag to "All"
      if (!next) setActiveTag(null);
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  }, [navigate]);

  const profilePage = useCallback(
    () => navigate(`/profilepage/${uid}`),
    [navigate, uid]
  );
  const createPage = useCallback(() => navigate("/createpage"), [navigate]);

  // Fetch public posts with real-time updates
  useEffect(() => {
    setLoadingPosts(true);
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
        } else {
          setLoadingPosts(false);
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
                  photoURL: usnap.data().user_pfp || "",
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

        const r = p.post_restaurant || null;
        const restaurantName = r?.name || p.post_text || "";
        const restaurantLat = r?.lat ?? null;
        const restaurantLng = r?.lng ?? null;
        const restaurantPlaceId = r?.placeId || p.post_placeId || null;

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
          restaurant: restaurantName,
          restaurantLat,
          restaurantLng,
          restaurantPlaceId,
          tags: Array.isArray(p.post_categories) ? p.post_categories : [],
        });
      }
      if (!cancelled) {
        setPosts(next);
        setLoadingPosts(false);
        setInitialized(true); // we’ve completed at least one pass
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawPosts]);

  // Apply place filter + tag filter
  const filteredPosts = useMemo(() => {
    let base = posts;

    if (placeIdFilter) {
      base = base.filter(
        (p) => p.restaurantPlaceId && p.restaurantPlaceId === placeIdFilter
      );
    }

    if (activeTag) {
      base = base.filter(
        (p) => Array.isArray(p.tags) && p.tags.includes(activeTag)
      );
    }

    return base;
  }, [posts, placeIdFilter, activeTag]);

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
  }, [filteredPosts.length]);

  // Autoplay/pause videos based on activeIndex
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    filteredPosts.forEach((p, i) => {
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
  }, [activeIndex, filteredPosts]);

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
        video.muted = !willUnmute;
        if (willUnmute) video.play().catch(() => {});
        setSoundOnPostId(willUnmute ? postId : null);
      } catch (e) {
        console.error("toggleSound failed", e);
      }
    },
    [soundOnPostId]
  );

  const viewOnMap = (post) => {
    if (!post.restaurantLat || !post.restaurantLng) return;

    const params = new URLSearchParams({
      lat: String(post.restaurantLat),
      lng: String(post.restaurantLng),
      name: post.restaurant || "",
    });

    if (post.restaurantPlaceId) {
      params.set("placeId", post.restaurantPlaceId);
    }

    navigate(`/mapspage?${params.toString()}`);
  };

  return (
    <div className="fy-root">
      <main ref={containerRef} className="fy-feed">
        {/* Filtered banner for place */}
        {placeIdFilter && (
          <div className="feed-filter-banner">
            <span className="feed-filter-label">
              Showing posts for{" "}
              <span className="feed-filter-place">
                {placeFilterLabel || "this place"}
              </span>
            </span>
            <button
              type="button"
              className="feed-filter-clear"
              onClick={clearFilter}
            >
              Clear
            </button>
          </div>
        )}

        <div
          className={
            showTagFilter
              ? "feed-filter-controls feed-filter-controls-open"
              : "feed-filter-controls"
          }
        >
          <button
            type="button"
            className="tag-filter-btn"
            onClick={toggleTagFilter}
          >
            {showTagFilter ? "Hide category filter" : "Filter by category"}
          </button>

          {showTagFilter && (
            <div className="feed-tagbar">
              <button
                type="button"
                className={
                  activeTag === null ? "tag-pill tag-pill-active" : "tag-pill"
                }
                onClick={() => setActiveTag(null)}
              >
                All
              </button>

              {TAG_OPTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={
                    activeTag === label ? "tag-pill tag-pill-active" : "tag-pill"
                  }
                  onClick={() => setActiveTag(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>



        {filteredPosts.map((p, i) => (
          <section key={p.id} data-index={i} data-id={p.id} className="fy-card">
            <div className="fy-post-wrap">
              <div className="fy-frame">
                <div className="fy-media-wrap">
                  {p.type === "video" ? (
                    <video
                      src={p.mediaURL}
                      className="fy-media"
                      loop
                      muted={soundOnPostId !== p.id}
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
                    {openCommentsPostId !== p.id && (
                      <>
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

                        <button
                          type="button"
                          className="fy-mapbtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewOnMap(p);
                          }}
                          disabled={!p.restaurantLat || !p.restaurantLng}
                          title={
                            p.restaurantLat ? "View on map" : "No location set"
                          }
                        >
                          📍 View on map
                        </button>

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
                            <i
                              className={
                                soundOnPostId === p.id
                                  ? "bx bx-volume-full"
                                  : "bx bx-volume-mute"
                              }
                            ></i>
                          </button>
                        )}
                      </>
                    )}

                    {openCommentsPostId === p.id ? (
                      <CommentPanel
                        className="comment-panel"
                        onClick={(e) => e.stopPropagation()}
                        postId={p.id}
                        onClose={() => setOpenCommentsPostId(null)}
                      />
                    ) : null}
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
                  <i
                    className={
                      openCommentsPostId === p.id
                        ? "bx bxs-message-circle-dots"
                        : "bx bx-message-circle-dots"
                    }
                    style={{ color: "#000" }}
                  ></i>
                  {String(p.commentCount ?? 0)}
                </button>
                <button
                  className="share-btn"
                  onClick={() => console.log("share", p.id)}
                  title="Share"
                >
                  <i className="bx bxs-send"></i>
                </button>
              </div>
            </div>
          </section>
        ))}

        {/* Loading indicator */}
        {loadingPosts && !initialized && (
          <div className="fy-loading">
            <div className="fy-spinner" />
            <span>Loading posts…</span>
          </div>
        )}
      </main>
    </div>



  );
};

export default Feed;
