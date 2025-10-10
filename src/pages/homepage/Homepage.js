import { auth } from '../../config/firebase-config';
import { signOut } from 'firebase/auth';
import { useNavigate } from "react-router-dom";

import './Homepage.css'

import DivButton from "../../components/DivButton";




export const Homepage = () => {
    const navigate = useNavigate();

    // function that will run when logout button is pressed
    const logout = async () => {
        try {
            await signOut(auth);
            navigate("/login")
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="container">
            <p>Successfully Logged In as: {auth?.currentUser?.email}</p>
            <p style={{margin: "50px 0px"}}> More Updates Soon! </p>
            <DivButton className="submit" onClick={logout}> Logout </DivButton>
            
        </div>
        
        
    )
}