import React, { useState } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from '../../config/firebase-config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from "../../hooks/AuthProvider"

import "./Profilepage.css";
import DivButton from "../../components/DivButton";

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
        <div>
            <p>{username}</p>
            <p>{following}</p>
            <p>{follower}</p>
            <DivButton className="ghost2" OnClick={logout}>
                Logout
            </DivButton>
        </div>
    )



}