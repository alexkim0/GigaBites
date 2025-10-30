import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthProvider";
import logo from '../assets/logo.png';
import "./sidebarStyle.css";

function Sidebar() {
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  return (
    <div className={`sidebar ${isActive ? "active" : ""}`}>
      <div className="top">
        <div className="logo">
          <img src={logo} className="logo-img" onClick={() => navigate("/feed")}/>
          <span>GigaBites</span>
        </div>
        <i className="bx bx-menu" id="btn" onClick={() => setIsActive(!isActive)}></i>
      </div>

      <div className="user">
        <img src="userimg" alt="me" className="user-img" />
        <div>
          <p className="bold">User</p>
          <p></p>
        </div>
      </div>

      <ul>
        <li onClick={() => navigate("/feed")}>
          <a href="#">
            <i className="bx bxs-grid-alt"></i>
            <span className="nav-item">Feed</span>
          </a>
          <span className="tooltip">Feed</span>
        </li>
        <li onClick={() => navigate("/createpage")}>
          <a href="#">
            <i className="bx bxs-grid-alt"></i>
            <span className="nav-item">Post</span>
          </a>
          <span className="tooltip">Post</span>
        </li>
        <li onClick={() => navigate(`/profilepage/${uid}`)}>
          <a href="#">
            <i className="bx bxs-grid-alt"></i>
            <span className="nav-item">Profile</span>
          </a>
          <span className="tooltip">Profile</span>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
