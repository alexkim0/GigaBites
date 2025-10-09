import { auth } from '../../config/firebase-config';
import { signOut } from 'firebase/auth';
import { useNavigate } from "react-router-dom";


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
        <div>
            <p>Successfully Logged In as: {auth?.currentUser?.email}</p>
            <button onClick={logout}> Logout </button>
        </div>
        
        
    )
}