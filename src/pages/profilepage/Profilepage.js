import React, { useState, useEffect } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate, useParams } from "react-router-dom";
import { db } from '../../config/firebase-config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { UseUserPosts } from "../../hooks/UseUserPosts"

import "./Profilepage.css";
import DivButton from "../../components/DivButton";
import userIcon from "../../assets/defaultIcon.png";


export const Profilepage = () => {
    const user = auth.currentUser;
    const navigate = useNavigate();
    const { uid } = useParams();
    const { posts, loadingPost, hasMore, loadMore } = UseUserPosts(uid, 18);



    // whose profile are we viewing (from the URL uid)
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);


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
    return () => { cancelled = true; };
  }, [uid, db]);


    const handleVideoHover = (e, play) => {
        const v = e.currentTarget;
        if (play) v.play();
        else v.pause();
    };

    const logout = async () => {
        try {
            await signOut(auth);
            navigate("/login");
        } catch (err) {
            console.error(err);
        }
    };


    if (!user) return <p>You must be logged in to view your profile.</p>;
    if (profileLoading) return <p>Loading...</p>;
    if (!profile) return <p>Profile not found.</p>;

    const username = profile.user_name || "User not found";
    const following = profile.user_following ?? 0;
    const follower = profile.user_follower ?? 0;
    const photoURL = profile.photoURL || userIcon;


    return (
        <div className="profile-page-wrap">
            <img className="pUserIcon" src={photoURL} alt=""/>
            <p className="pUsernameField">{username}</p>
            <p className="pFollowsField">Following: {following}    |    Follower: {follower}</p>
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
                    <span>No more posts</span>
                )}
            </div>

            {user?.uid === uid && (
            <div className="profileLogOutBox">
                <DivButton className="profileLogOut" onClick={logout}>
                Logout
                </DivButton>
            </div>
            )}
            
            {/*
            <div>
                <h2>Profile of {uid}</h2>
                <p>Total posts: {posts.length}</p>
            </div>
            */}
        </div>
    )



}