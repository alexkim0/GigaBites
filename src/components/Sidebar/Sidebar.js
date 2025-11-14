// src/components/Sidebar/Sidebar.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/AuthProvider";
import logo from '../../assets/logoNamelessWhite.png';
import userIcon from "../../assets/defaultIcon.png";
import "./sidebarStyle.css";

function Sidebar() {
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const [username, setUsername] = useState("Guest");

  useEffect(() => {
    if (currentUser?.userData?.user_name) {
      setUsername(currentUser.userData.user_name);
    } else {
      setUsername("Guest");
    }
  }, [currentUser?.userData?.user_name]);

  return (
    <div className={`sidebar ${isActive ? "active" : ""}`}>
      <div className="top">
        <div className="logo">
          <img src={logo} className="logo-img" />
          <span className="logo-text">GigaBites</span>
        </div>
        <i className="bx bx-menu" id="btn" onClick={() => setIsActive(!isActive)}></i>
      </div>

      <div className="user">
        <img src={userIcon} alt="me" className="user-img" />
        <div>
          <p className="bold">{username}</p>
          <p></p>
        </div>
      </div>

      <ul>

        <li onClick={() => navigate("/feed")}>
          <a href="">
            <i className="bx bx-fork"></i>
            <span className="nav-item">Feed</span>
          </a>
          <span className="tooltip">Feed</span>
        </li>

        <li onClick={() => navigate("/createpage")}>
          <a href="">
            <i className="bx bx-plus-circle"></i>
            <span className="nav-item">Create</span>
          </a>
          <span className="tooltip">Create</span>
        </li>

        <li onClick={() => navigate(`/profilepage/${uid}`)}>
          <a href="">
            <i className="bx bx-user-circle"></i>
            <span className="nav-item">Profile</span>
          </a>
          <span className="tooltip">Profile</span>
        </li>

        <li onClick={() => navigate("/messagepage")}>
          <a href="">
            <i className="bx bx-message-circle"></i>
            <span className="nav-item">Messages</span>
          </a>
          <span className="tooltip">Messages</span>
        </li>

        <li onClick={() => navigate("/mapspage")}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="bx bx-map"></i>
            <span className="nav-item">Maps</span>
          </a>
          <span className="tooltip">Maps</span>
        </li>
        
      </ul>
    </div>
  );
}

export default Sidebar;