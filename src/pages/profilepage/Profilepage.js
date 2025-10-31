import React, { useState, useEffect } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate, useParams } from "react-router-dom";
import { db } from '../../config/firebase-config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from "../../hooks/AuthProvider"
import { UseUserPosts } from "../../hooks/UseUserPosts"

import "./Profilepage.css";
import DivButton from "../../components/DivButton";
import userIcon from "../../assets/defaultIcon.png";

export const Profilepage = () => {
    const user = auth.currentUser;
    const navigate = useNavigate();
    const { uid } = useParams();
    const { currentUser, loading } = useAuth();
    const { posts, loadingPost, hasMore, loadMore } = UseUserPosts(user.uid, 18);

    // 👇 this useEffect runs whenever posts changes
    useEffect(() => {
        if (posts.length > 0) {
        console.log("Fetched posts:", posts);
        }
    }, [posts]);

    if (!user) {
        return <p>You must be logged in to view your profile.</p>;
    }

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



    if (loading) return <p>Loading...</p>;

    const username = currentUser.userData?.user_name;
    const following = currentUser.userData?.user_following;
    const follower = currentUser.userData?.user_follower;



    return (
        <div className="profile-page-wrap">
            <img className="pUserIcon" src={userIcon} alt=""/>
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
            
            {/*
            <div className="loadmore">
                {hasMore ? (
                    <button className="btn" onClick={loadMore} disabled={loading}>
                        {loading ? "Loading..." : "Load more"}
                    </button>
                ) : (
                    <span>No more posts</span>
                )}
            </div>
            */}

            <div className="profileLogOutBox"> 
                <DivButton className="profileLogOut" onClick={logout}>
                Logout
            </DivButton>
            </div>
            
            {/*
            <div>
                <h2>Profile of {uid}</h2>
                <p>Total posts: {posts.length}</p>
            </div>
            */}
        </div>
    )



}