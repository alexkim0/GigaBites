import React, { useState } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from '../../config/firebase-config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from "../../hooks/AuthProvider"

import "./profileCreation.css";
import DivButton from "../../components/DivButton";

export const ProfileCreation = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const { currentUser, loading } = useAuth();

    // Show loading state while auth / Firestore data is being fetched
    if (loading) return <p>Loading...</p>;

    // console.log(auth.currentUser.uid);

    const saveUsername = () => {
        if (username === "") {
            setErrorMessage("Create a username.");
        }
        else {
            alert(`Saved Username: ${username}`);
            console.log(currentUser.uid)
            updateUsername(currentUser.uid, username)
            navigate("/feed");
        }
    };

    const logout = async () => {
        try {
          await signOut(auth);
          navigate("/login");
        } catch (err) {
          console.error(err);
        }
    };


    const updateUsername = async (uid, newUsername) => {
    try {
        // Get a reference to the user's document
        const userDataRef = doc(db, "user", uid);

        // Update just the username field
        await updateDoc(userDataRef, {
        user_name: newUsername
        });

        console.log("Username updated successfully!");
    } catch (error) {
        console.error("Error updating username:", error);
    }
    };
    
    return (
        <div className="page">
            <header className="username-header">
                <h1>Create a Username</h1>
                <div className="signed-in-as">
                    Signed in as <strong>{auth?.currentUser?.email}</strong>
                </div>
            </header>

            <div className="username-field">
                <div className="input">
                    <input 
                        placeholder="Username"
                        type="username"
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="errorMessage">
                {errorMessage && (
                    <p style={{ color: "red", marginTop: "10px" }}>{errorMessage}</p>
                )}
            </div>

            <div className="actions">
                <DivButton
                    className="primary"
                    onClick={saveUsername}
                >
                    Next
                </DivButton>   
            </div>

            <div className="logout-row">
                <DivButton className="logout big" onClick={logout}>Logout</DivButton>
            </div>

        </div>
    );
};

export default ProfileCreation;