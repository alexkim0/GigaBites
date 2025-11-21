// src/pages/searchpage/Searchpage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../config/firebase-config";
import { collection, getDocs, limit, query } from "firebase/firestore";
import "./Searchpage.css";

function Searchpage() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    const raw = term.trim();

    // allow "@name" or "name"
    const trimmed = raw.startsWith("@") ? raw.slice(1) : raw;

    try {
      setSearching(true);
      setError("");

      const usersRef = collection(db, "user");
      // Just grab some users and filter client-side
      const snap = await getDocs(query(usersRef, limit(100)));
      const allUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Debug: see how many we actually loaded
      console.log("Loaded users for search:", allUsers.length, allUsers);

      if (!trimmed) {
        // no term → show everyone to prove data exists
        setResults(allUsers);
      } else {
        const lower = trimmed.toLowerCase();
        const filtered = allUsers.filter((u) => {
          const name = (u.user_name || "").toLowerCase();
          return name.includes(lower);
        });
        setResults(filtered);
      }
    } catch (err) {
      console.error("Search failed", err);
      setError("Search failed. Please try again.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const goToProfile = (uid) => {
    navigate(`/profilepage/${uid}`);
  };

  return (
    <div className="search-root">
      <div className="search-panel">
        <header className="search-header">
          <h2>Search Users</h2>
        </header>

        <form className="search-bar" onSubmit={handleSearch}>
          <input
            className="search-input"
            type="text"
            placeholder="Search by username"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <button className="search-button" type="submit" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <div className="search-error">{error}</div>}

        <div className="search-results">
          {!searching && results.length === 0 && (
            <div className="search-empty">
              {term.trim()
                ? "No users found."
                : "Type a username and press Search."}
            </div>
          )}

          {results.map((u) => (
            <button
              key={u.id}
              className="search-result-row"
              onClick={() => goToProfile(u.id)}
            >
              <img
                src={
                  u.user_pfp ||
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(u.user_name || "U")
                }
                alt=""
                className="search-avatar"
              />
              <div className="search-texts">
                <div className="search-username">
                  {u.user_name || u.id.slice(0, 6)}
                </div>
                {u.user_bio ? (
                  <div className="search-bio-preview">
                    {u.user_bio.length > 60
                      ? u.user_bio.slice(0, 60) + "..."
                      : u.user_bio}
                  </div>
                ) : (
                  <div className="search-bio-preview muted">No bio yet</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Searchpage;
