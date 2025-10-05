import { auth } from '../config/firebase-config';
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useState } from "react"

export const Auth = () => {
    // useState: probably a react function that stores the value to email and use the setEmail function to change the email value...
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // function that will run when sign in button is pressed
    const signIn = async () => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
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
        </div>
    );
}