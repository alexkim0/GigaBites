// src/components/Sidebar/Sidebar.js
import React, { useState, useEffect } from "react";
import { auth } from "../../config/firebase-config";
import { signOut, updateProfile } from "firebase/auth";
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
  const [username, setUsername] = useState("");
  const [userpfp, setPfp] = useState(userIcon);

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser?.userData?.user_name) {
      setUsername(currentUser.userData.user_name);
    } else {
      setUsername("Guest");
    }
  }, [currentUser?.userData?.user_name]);

  useEffect(() => {
    if (currentUser?.userData?.user_pfp) {
      setPfp(currentUser.userData.user_pfp);
    } else {
      setPfp(userIcon);
    }
  }, [currentUser?.userData?.user_pfp]);

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
        <img className="user-img" src={userpfp} alt=""/>
        <div>
          <p className="bold">{username}</p>
          <p></p>
        </div>
      </div>

      <ul>

        <li onClick={() => navigate("/feed")}>
          <a href="">
            <i className="bx bx-fork-knife"></i>
            <span className="nav-item">Feed</span>
          </a>
          <span className="tooltip">Feed</span>
        </li>

        <li onClick={() => navigate("/search")}>
          <a href="" onClick={(e) => e.preventDefault()}>
            <i className="bx bx-search"></i>
            <span className="nav-item">Search</span>
          </a>
          <span className="tooltip">Search</span>
        </li>

        <li onClick={() => navigate("/createpage")}>
          <a href="">
            <i className="bx bx-plus-circle"></i>
            <span className="nav-item">Create</span>
          </a>
          <span className="tooltip">Create</span>
        </li>

        <li onClick={() => navigate("/messagepage")}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className='bx bx-message-detail'></i>  
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

        <li onClick={() => navigate(`/profilepage/${uid}`)}>
          <a href="">
            <i className="bx bx-user-circle"></i>
            <span className="nav-item">Profile</span>
          </a>
          <span className="tooltip">Profile</span>
        </li>

        <li onClick={logout}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i class='bx  bx-arrow-in-right-square-half'    ></i> 
            <span className="nav-item">Logout</span>
          </a>
          <span className="tooltip">Logout</span>
        </li>
        
        
      </ul>
    </div>
  );
}

export default Sidebar;