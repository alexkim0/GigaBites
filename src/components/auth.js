import { auth, googleProvider } from '../config/firebase-config';
import { createUserWithEmailAndPassword, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from "react"

export const Auth = () => {
    // useState: probably a react function that stores the value to email and use the setEmail function to change the email value...
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    console.log(auth?.currentUser?.email);

    // function that will run when sign in button is pressed
    const signIn = async () => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error(err);
        }
    };

    // function that will run when signInWithGoogle button is pressed
    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
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

    const loginEmailPassword = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <input 
                placeholder="Email.."
                onChange={(e) => setEmail(e.target.value)}
            />
            <input 
                placeholder="Password.."
                type="password"
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={signIn}> Sign In </button>

            <button onClick={signInWithGoogle}> Sign In With Google </button>

            <button onClick={logout}> Logout </button>

            <button onClick={loginEmailPassword}> LogIn </button>
        </div>
    );
}