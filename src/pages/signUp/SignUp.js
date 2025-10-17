import { auth, googleProvider } from '../../config/firebase-config';
import { createUserWithEmailAndPassword, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from "react"
import { useNavigate } from "react-router-dom";
import './SignUp.css'
import DivButton from "../../components/DivButton";

import email_icon from "../../assets/email.png"
import password_icon from "../../assets/password.png"
import google_icon from '../../assets/Google__G__logo.svg'

export const SignUp = () => {
    // useState: probably a react function that stores the value to email and use the setEmail function to change the email value...
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    console.log(auth?.currentUser?.email);

    // function that will run when sign in button is pressed
    const signUp = async () => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate("/homepage")
        } catch (err) {
            console.error(err);
            // Check for specific Firebase error codes
            if (err.code === "auth/email-already-in-use") {
                setErrorMessage("That account is already linked to another user.");
            } else if (err.code == "auth/missing-password") {
                setErrorMessage("A password is required to create your account.");
            } else if (err.code == "auth/invalid-email") {
                setErrorMessage("Please enter a valid email address.");
            } else if (err.code == "auth/invalid-password") {
                setErrorMessage("Invalid password.");
            } else if (err.code == "auth/weak-password") {
                setErrorMessage("A password must have at least 6 characters.");
            } else {
                setErrorMessage("An unexpected error occurred. Please try again.");
            }
        }
    };

    // function that will run when signInWithGoogle button is pressed
    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate("/homepage")
        } catch (err) {
            console.error(err);
        }
    };

    // function that will run when logoug button is pressed
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.error(err);
        }
    };



    return (
        <div className='page'>
            <div className='container'>
                <div className="header">
                    <div className="signUpText">Sign Up</div>
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
                        <p>Already have an account?</p>
                        <span onClick={() => navigate("/login")}>Login</span>
                    </div>
                </div>
                
                <div className="submit-container">
                    <DivButton className="submit" onClick={signUp}>
                        Sign Up
                    </DivButton>
                    {/* <div className="submit" onClick={loginEmailPassword}> Login </div> */}
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