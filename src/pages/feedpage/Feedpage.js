import React from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import DivButton from "../../components/DivButton";
import "./Feedpage.css";

export const Feed = () => {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const profilePage = async () => {
    try {
      navigate(`/profilepage/${uid}`);
    } catch (err) {
      console.error(err);
    }
  }

  const createPage = async () => {
    try {
      navigate("/createpage");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="feed-dev-wrap">
      <section className="feed-dev-card">
        <header className="feed-dev-header">
          <span className="feed-badge">🚧 In Development</span>
          <h1 className="feed-title">Your Feed Is Cooking</h1>
          <p className="feed-subtitle">
            We’re building your personalized feed. Further updates will be made regularly—stay tuned ✨
          </p>
        </header>

        <div className="feed-dev-body">
          <p className="signed-in-as">
            Signed in as <strong>{auth?.currentUser?.email || "user"}</strong>
          </p>
        </div>

        <footer className="feed-dev-actions">
          <DivButton className="ghost2" onClick={logout}>
            Logout
          </DivButton>
          <DivButton className="ghost2" onClick={profilePage}>
            View profile
          </DivButton>
          <DivButton className="ghost2" onClick={createPage}>
            Create Post
          </DivButton>
        </footer>
        
      </section>
    </main>
  );
};

export default Feed;
