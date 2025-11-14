// src/pages/profilepage/Profilepage.js
import React, { useState, useEffect } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../config/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { UseUserPosts } from "../../hooks/UseUserPosts";
import { watchFollowerCount } from "../../lib/Follows";

import "./Profilepage.css";
import DivButton from "../../components/DivButton";
import userIcon from "../../assets/defaultIcon.png";
import FollowButton from "../../components/FollowButton/FollowButton";
import Modal from "../../components/Modal/Modal";
import FollowListPanel from "../../components/FollowListPanel/FollowListPanel";

export const Profilepage = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { uid } = useParams();
  const { posts, loadingPost, hasMore, loadMore } = UseUserPosts(uid, 18);
  const isOwnProfile = user?.uid === uid;

  // whose profile are we viewing (from the URL uid)
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followModal, setFollowModal] = useState(null);

  useEffect(() => {
    if (posts.length > 0) {
      console.log("Fetched posts:", posts);
    }
  }, [posts]);

  // Load profile by URL uid
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      try {
        const ref = doc(db, "user", uid);
        const snap = await getDoc(ref);
        if (!cancelled) {
          setProfile(snap.exists() ? { id: uid, ...snap.data() } : null);
        }
      } catch (e) {
        console.error("Failed to load profile", e);
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Realtime follower count (updates instantly when FollowButton updates Firestore)
  useEffect(() => {
    if (!uid) return;
    const unsub = watchFollowerCount(uid, setFollowerCount);
    return () => unsub && unsub();
  }, [uid]);

  const handleVideoHover = async (e, play) => {
    const v = e.currentTarget;
    if (play) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  if (!user) return <p>You must be logged in to view your profile.</p>;
  if (profileLoading) return <p>Loading...</p>;
  if (!profile) return <p>Profile not found.</p>;

  const username = profile.user_name || "User not found";
  const following = profile.user_following ?? 0;
  const follower = profile.user_follower ?? 0; // still available if you need it
  const photoURL = profile.user_pfp || userIcon;
  const bio = profile.user_bio || "";          // NEW: biography from Firestore

  return (
    <div className="profile-page-wrap">
      {isOwnProfile && (
        <header className="fy-header">
          <div className="fy-actions">
            <DivButton
              className="ghost2"
              onClick={() => navigate(`/profileSettings/${uid}`)}
            >
              ⚙️
            </DivButton>
          </div>
        </header>
      )}

      <img className="pUserIcon" src={photoURL} alt="" />
      <p className="pUsernameField">{username}</p>

      {/* NEW: Bio, only show if not empty */}
      {bio.trim().length > 0 && (
        <p className="pBioField">{bio}</p>
      )}

      <div className="pInfoContainer">
        <p className="pFollowsField">Posts: {posts.length}</p>
        <p
          className="pFollowsField clickable"
          onClick={() => setFollowModal("followers")}
          title="View followers"
        >
          Follower: {followerCount}
        </p>
        <p
          className="pFollowsField clickable"
          onClick={() => setFollowModal("following")}
          title="View following"
        >
          Following: {following}
        </p>
      </div>

      {!isOwnProfile && (
        <div className="profile-button-container">
          <div className="profileLogOutBox">
            <FollowButton
              targetUid={uid}
              initialFollowerCount={profile.user_follower ?? 0}
            />
          </div>
        </div>
      )}

      <div className="profile-grid">
        {posts.map((p) => {
          const m = p.post_media?.[0];
          if (!m) return null;
          const IsImage = m.mimeType?.startsWith("image/");
          const IsVideo = m.mimeType?.startsWith("video/");

          return (
            <button
              key={p.id}
              className="profile-tile"
              onClick={() => navigate(`/postpage/${p.id}`)}
            >
              {IsImage && (
                <img
                  src={m.downloadURL}
                  alt={p.post_caption || ""}
                  className="tile-media tile-media-img"
                  loading="lazy"
                />
              )}

              {IsVideo && (
                <>
                  <video
                    src={m.downloadURL}
                    className="tile-media tile-media-video"
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onMouseOver={(e) => handleVideoHover(e, true)}
                    onMouseOut={(e) => handleVideoHover(e, false)}
                  />
                  <span className="title-badge">▶</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="loadmore">
        {hasMore ? (
          <button className="btn" onClick={loadMore} disabled={loadingPost}>
            {loadingPost ? "Loading..." : "Load more"}
          </button>
        ) : (
          <span></span>
        )}
      </div>

      <Modal open={!!followModal} onClose={() => setFollowModal(null)}>
        <FollowListPanel
          mode={followModal || "followers"}
          userId={uid}
          onCloseModal={() => setFollowModal(null)}
        />
      </Modal>
    </div>
  );
};
