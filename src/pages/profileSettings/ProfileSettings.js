// src/pages/profileSettings/ProfileSettings.js
import React, { useEffect, useRef, useState } from "react";
import { auth } from "../../config/firebase-config";
import { useAuth } from "../../hooks/AuthProvider";
import { signOut, updateProfile } from "firebase/auth";
import { useNavigate, useParams } from "react-router-dom";
import { db, storage } from "../../config/firebase-config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import "./ProfileSettings.css";
import DivButton from "../../components/DivButton";

export const ProfileSettings = () => {
  const navigate = useNavigate();
  const { uid: uidParam } = useParams();
  const { user: currentUser, loading } = useAuth();

  const targetUid = uidParam || currentUser?.uid || null;
  const isOwner = true; // temp fix
  // const isOwner   = !!currentUser && currentUser.uid === targetUid;

  const [username, setUsername] = useState("");
  const [biography, setBiography] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [previewURL, setPreviewURL] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);

  const fileInputRef = useRef(null);

  // Load existing profile data for the UID in the URL
  useEffect(() => {
    let lastPreview = null;

    const load = async () => {
      if (!targetUid) return;
      try {
        const snap = await getDoc(doc(db, "user", targetUid));
        const data = snap.exists() ? snap.data() : {};

        const name =
          data.user_name ??
          (isOwner ? currentUser?.displayName ?? "" : "");
        const bio = data.user_bio ?? "";
        const photo =
          data.user_pfp ?? (isOwner ? currentUser?.user_pfp ?? "" : "");

        setUsername(name);
        setBiography(bio);
        setPhotoURL(photo);
        setPreviewURL(photo || "");
      } catch (e) {
        console.error(e);
        setErrorMessage("Failed to load profile.");
      } finally {
        setProfileLoading(false);
      }
    };

    load();

    // cleanup
    return () => {
      if (lastPreview) URL.revokeObjectURL(lastPreview);
    };
  }, [targetUid, isOwner, currentUser]);

  const onPickImage = () => {
    if (!isOwner) return;
    fileInputRef.current?.click();
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isOwner) return;

    setSelectedFile(file);

    // live preview
    const local = URL.createObjectURL(file);
    setPreviewURL(local);
  };

  const uploadAvatar = (file, targetUid) =>
    new Promise((resolve, reject) => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const storageRef = ref(storage, `users/${targetUid}/avatar.${ext}`);
      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      task.on(
        "state_changed",
        (snap) => {
          if (snap.totalBytes) {
            setUploadProgress(
              Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
            );
          }
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });

  const saveInfo = async () => {
    if (!targetUid) return;
    if (!isOwner) {
      setErrorMessage("You can’t edit another user’s profile.");
      return;
    }
    if (!username.trim()) {
      setErrorMessage("Enter a username.");
      return;
    }
    if (username.length > 32) {
      setErrorMessage("Username must be 32 characters or fewer.");
      return;
    }
    if (biography.length > 500) {
      setErrorMessage("Biography must be 500 characters or fewer.");
      return;
    }

    setErrorMessage("");
    setSaving(true);
    try {
      let newPhotoURL = photoURL;

      if (selectedFile) {
        newPhotoURL = await uploadAvatar(selectedFile, targetUid);
        setPhotoURL(newPhotoURL);
      }
    
      // Persist to Firestore (create doc if it doesn't exist)
      await setDoc(
        doc(db, "user", targetUid),
        {
          user_name: username.trim(),
          user_bio: biography.trim(),
          user_pfp: newPhotoURL || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Keep Firebase Auth profile in sync (only for the owner)
      if (auth.currentUser && auth.currentUser.targetUid === targetUid) {
        await updateProfile(auth.currentUser, {
          displayName: username.trim(),
          photoURL: newPhotoURL || null,
        });
      }

      navigate(`/profilepage/${targetUid}`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="ps-root">
        <div className="ps-loading">Loading…</div>
      </div>
    );
  }

  

  return (
    <div className="ps-root">
      <header className="fy-header">
        <div className="fy-actions">
          <DivButton
            className="ghost2"
            onClick={() => navigate(`/profilepage/${targetUid || ""}`)}
          >
            X
          </DivButton>
        </div>
      </header>

      <div className="ps-field">
        {/* Avatar */}
        <div className="ps-avatar-block">
          <div
            className={`ps-avatar ${!isOwner ? "is-readonly" : ""}`}
            onClick={onPickImage}
            role="button"
            aria-disabled={!isOwner}
            title={isOwner ? "Change photo" : "View only"}
          >
            {previewURL ? (
              <img src={previewURL} alt="Profile" />
            ) : (
              <div className="ps-avatar-placeholder">Add Photo</div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFileChange}
            disabled={!isOwner}
          />
          {isOwner && (
            <>
              <DivButton className="ps-change-photo" onClick={onPickImage}>
                Change Photo
              </DivButton>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="ps-progress">Uploading… {uploadProgress}%</div>
              )}
            </>
          )}
        </div>

        {/* Username */}
        {/* Username-field and username-input CSS is being controlled by profileCreation.css, it looks nice and i dont want to mess it up*/}
        <div className="username-field">
          <label className="ps-label">Username</label>
          <div className="username-input">
            <input
              placeholder="Username"
              type="text"
              value={username}
              maxLength={32}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!isOwner}
            />
          </div>
        </div>

        {/* Bio */}
        <div className="bio-field">
          <label className="ps-label">Biography</label>
          <textarea
            className="bio-input"
            placeholder="Tell people a bit about yourself…"
            value={biography}
            maxLength={500}
            onChange={(e) => setBiography(e.target.value)}
            disabled={!isOwner}
          />
          <div className="ps-charcount">{biography.length}/500</div>
        </div>

        {/* Errors */}
        <div className="u-errorMessage">
          {errorMessage && (
            <p style={{ color: "red", marginTop: "10px" }}>{errorMessage}</p>
          )}
          {!isOwner && (
            <p style={{ color: "#555", marginTop: "8px" }}>
              You’re viewing <code>{targetUid}</code>’s profile. Editing is disabled.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="ps-bot-row">
          <DivButton className="ps-logout" onClick={logout}>
            Logout
          </DivButton>
          <DivButton
            className={`ps-save ${saving ? "is-saving" : ""}`}
            onClick={saveInfo}
            disabled={saving || !isOwner}
          >
            {saving ? "Saving…" : "Save"}
          </DivButton>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
