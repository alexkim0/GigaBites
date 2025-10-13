import React, { useState } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import "./Homepage.css";
import DivButton from "../../components/DivButton";

const FOOD_OPTIONS = [ /* Add more options as needed just a temporary list*/
  { id: "japanese", label: "Japanese", emoji: "🍣" },
  { id: "kbbq", label: "Korean BBQ", emoji: "🥩" },
  { id: "chinese", label: "Chinese", emoji: "🥟" },
  { id: "thai", label: "Thai", emoji: "🍜" },
  { id: "italian", label: "Italian", emoji: "🍝" },
  { id: "mexican", label: "Mexican", emoji: "🌮" },
  { id: "indian", label: "Indian", emoji: "🍛" },
  { id: "vietnamese", label: "Vietnamese", emoji: "🍲" },
  { id: "dessert", label: "Dessert", emoji: "🧁" },
  { id: "coffee", label: "Coffee", emoji: "☕" },
  { id: "street", label: "Street Food", emoji: "🍢" },
  { id: "seafood", label: "Seafood", emoji: "🦐" },
  { id: "vegan", label: "Vegan", emoji: "🥗" },
  { id: "bbq", label: "BBQ", emoji: "🍖" },
  { id: "hotpot", label: "Hot Pot", emoji: "🍲" },
  { id: "boba", label: "Boba", emoji: "🧋" },
];


export const Homepage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);

  const toggle = (item) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const saveInterests = () => {
    alert(`Saved interests: ${selected.join(", ") || "(none)"}`);
    navigate("/feed");
    };

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="interests-wrap">
      <header className="interests-header">
        <h1>Choose your interests</h1>
        <p>Get better food recommendations</p>
        <div className="signed-in-as">
          Signed in as <strong>{auth?.currentUser?.email}</strong>
        </div>
      </header>

    <div className="interests-grid">
        {FOOD_OPTIONS.map(({ id, label, emoji }) => {
            const isSelected = selected.includes(label);
            return (
            <button
                key={id}
                className={`pill ${isSelected ? "selected" : ""}`}
                onClick={() => toggle(label)}   
                aria-pressed={isSelected}
                type="button"
            >
                <span className={`check ${isSelected ? "show" : ""}`} aria-hidden="true">✓</span>
                <span className="label">{emoji} {label}</span>
            </button>
            );
        })}
    </div>


      <div className="actions">
        <DivButton className="ghost" onClick={() => navigate("/feed")}>
          Skip
        </DivButton>
        <DivButton
          className="primary"
          onClick={saveInterests}
          disabled={selected.length === 0}
        >
          Next
        </DivButton>
      </div>

      <div className="logout-row">
        <DivButton className="logout big" onClick={logout}>Logout</DivButton>
      </div>
    </div>
  );
};

export default Homepage;
