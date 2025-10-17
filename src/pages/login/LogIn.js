import { auth, googleProvider } from '../../config/firebase-config';
import { createUserWithEmailAndPassword, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from "react"
import { useNavigate } from "react-router-dom";
import { db } from '../../config/firebase-config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './Login.css'
import DivButton from "../../components/DivButton";

import email_icon from "../../assets/email.png"
import password_icon from "../../assets/password.png"
import google_icon from '../../assets/Google__G__logo.svg'
import backgroundImage from "../../assets/backgroundImage.png"

export const Login = () => {
    // useState: probably a react function that stores the value to email and use the setEmail function to change the email value...
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    console.log(auth?.currentUser?.email);

    // function that will run when signInWithGoogle button is pressed
    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const userDocRef = doc(db, "user", user.uid);

            const userSnap = await getDoc(userDocRef);

            if (!userSnap.exists()) {
                await createUserData(db, user, user.email);
                console.log("new user document created in Firestore");
            } else {
                console.log("user already exists, skipping Firestore creation");
            }
            navigate("/homepage");
        } catch (err) {
            console.error(err);
        }
    };

    // function that will run when logout button is pressed
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.error(err);
        }
    };

    const loginEmailPassword = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/homepage")
        } catch (err) {
            console.error(err);
            // Check for specific Firebase error codes
            if (err.code === "auth/email-already-in-use") {
                setErrorMessage("That account is already linked to another user.");
            } else if (err.code == "auth/missing-password") {
                setErrorMessage("A password is required to log in to your account.");
            } else if (err.code == "auth/invalid-email") {
                setErrorMessage("Please enter a valid email address.");
            } else if (err.code == "auth/invalid-credential") { 
                setErrorMessage("Invalid email or password. Please try again.");
            } else if (err.code == "auth/invalid-password") {
                setErrorMessage("Invalid password.");
            } else if (err.code == "auth/weak-password") {
                setErrorMessage("A password must have at least 6 characters.");
            } else {
                setErrorMessage("An unexpected error occurred. Please try again.");
            }
        }
    };

    const createUserData = async (db, user, email) => {
        // Gets the document reference of the user
        const userDocRef = doc(db, "user", user.uid);

        await setDoc(userDocRef, {
            user_email: email,
            user_name: "",
            user_ID: user.uid,
            user_pfp: "",
            user_bio: "",
            user_following: 0,
            user_follower: 0,
            user_pref: [],
            createdAt: new Date(),
        });

        console.log("Firestore user profile is created...");
    }
    


    return (
        <div className='page'>
            <div className='container'>
                <div className="header">
                    <div className="signUpText">Log In</div>
                    <div className="underline"></div>
                </div>
                <div className="inputs">
                    <div className="input">
                        <img src={email_icon} alt=""/>
                        <input 
                            placeholder="Email address"
                            type="email"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="input">
                        <img src={password_icon} alt=""/>
                        <input 
                            placeholder="Password"
                            type="password"
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
                <div className="text">
                    {errorMessage && (
                    <p style={{ color: "red", marginTop: "10px" }}>{errorMessage}</p>
                    )}
                    <div className="ask">
                        <p>Don't have an account?</p>
                        <span onClick={() => navigate("/signup")}>Sign Up</span>
                    </div>

                </div>
                
                <div className="submit-container">
                    <DivButton className="submit" onClick={loginEmailPassword}>
                        Log In
                    </DivButton>
                    
                </div>

                <div className="divider">
                    <span>or</span>
                </div>

                <DivButton className="google" onClick={signInWithGoogle}>
                    <img src={google_icon} alt=""/>
                    Sign In With Google
                </DivButton>  
            </div>
        </div>
    );
}