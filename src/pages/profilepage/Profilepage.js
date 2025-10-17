import React, { useState } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from '../../config/firebase-config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from "../../hooks/AuthProvider"

import "./Profilepage.css";
import DivButton from "../../components/DivButton";
import userIcon from "../../assets/defaultIcon.png";

export const Profilepage = () => {
    const navigate = useNavigate();

    const logout = async () => {
        try {
        await signOut(auth);
        navigate("/login");
        } catch (err) {
        console.error(err);
        }
    };

    const { currentUser, loading } = useAuth();

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
        </div>
    )



}