// src/pages/mapspage/Mapspage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./Mapspage.css";

const Mapspage = () => {
  const navigate = useNavigate();

  return (
    <div className="maps-root">
      <div className="maps-card">
        <h1>Maps in progress 🗺️</h1>
        <p>
          We&apos;re working on an interactive map experience for restaurants
          and posts.
        </p>
        <p>Check back soon!</p>
        <button
          className="maps-back-btn"
          onClick={() => navigate("/feedpage")}
        >
          ← Back to Feed
        </button>
      </div>
    </div>
  );
};

export default Mapspage;