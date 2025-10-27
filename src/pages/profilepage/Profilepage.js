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
            <p className="pVideos"> VIDEOS WILL GO HERE </p>
            <div className="profileLogOutBox"> 
                <DivButton className="profileLogOut" onClick={logout}>
                Logout
            </DivButton>
            </div>
            <div>
                <h2>Profile of {uid}</h2>
                <p>Total posts: {posts.length}</p>
            </div>
        </div>
    )



}