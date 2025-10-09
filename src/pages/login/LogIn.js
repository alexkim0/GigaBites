import { auth, googleProvider } from '../../config/firebase-config';
import { createUserWithEmailAndPassword, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from "react"
import { useNavigate } from "react-router-dom";
import './Login.css'

import email_icon from "../../assets/email.png"
import password_icon from "../../assets/password.png"
import google_icon from '../../assets/Google__G__logo.svg'

export const Login = () => {
    // useState: probably a react function that stores the value to email and use the setEmail function to change the email value...
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    console.log(auth?.currentUser?.email);

    // function that will run when signInWithGoogle button is pressed
    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
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
        } catch (err) {
            console.error(err);
        }
    };


    return (
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
                <p>Don't have an account?</p>
                <span onClick={() => navigate("/signup")}>Sign In</span>
            </div>
            
            <div className="submit-container">
                <div className="submit" onClick={loginEmailPassword}> Log In </div>
                {/* <div className="submit" onClick={loginEmailPassword}> Login </div> */}
            </div>

            <div className="divider">
                <span>or</span>
            </div>

            <div className="google" onClick={signInWithGoogle}>
                <img src={google_icon} alt=""/>
                Sign In With Google
            </div>



            {/* <button onClick={signIn}> Sign In </button>

            <button onClick={signInWithGoogle}> Sign In With Google </button>

            <button onClick={loginEmailPassword}> LogIn </button> */}

            <button onClick={logout}> Logout </button>

        </div>
    );
}