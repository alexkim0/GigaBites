// src/pages/dev/MigrateFollowingUsernames.jsx
import React, { useState } from "react";
import { db } from "./../config/firebase-config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

export default function MigrateFollowingUsernames() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [summary, setSummary] = useState(null);

  const appendLog = (msg) =>
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runMigration = async () => {
    setRunning(true);
    setLog([]);
    setSummary(null);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    try {
      appendLog("Starting migration…");

      // 1) Get all users
      const usersSnap = await getDocs(collection(db, "user"));
      appendLog(`Found ${usersSnap.size} user docs.`);

      for (const userDoc of usersSnap.docs) {
        const ownerUid = userDoc.id;
        appendLog(`Checking /user/${ownerUid}/following…`);

        // 2) Get this user's "following" docs
        const followingCol = collection(db, "user", ownerUid, "following");
        const followingSnap = await getDocs(followingCol);

        if (followingSnap.empty) {
          appendLog(`  (no following docs for ${ownerUid})`);
          continue;
        }

        for (const fDoc of followingSnap.docs) {
          const followRef = fDoc.ref;
          const fData = fDoc.data();

          // Try to determine the targetUid
          const targetUid = fData.targetUid || fDoc.id;

          // If it already has a user_name, skip
          if (fData.user_name && fData.photoURL !== undefined) {
            skipped++;
            continue;
          }

          try {
            // 3) Load the real user profile for the person being followed
            const targetRef = doc(db, "user", targetUid);
            const targetSnap = await getDoc(targetRef);

            if (!targetSnap.exists()) {
              appendLog(`  Target user ${targetUid} does not exist. Skipping.`);
              skipped++;
              continue;
            }

            const target = targetSnap.data();
            const user_name = target.user_name || "";
            const photoURL = target.photoURL || null;

            // 4) Update the following doc with denormalized fields
            await updateDoc(followRef, {
              targetUid,
              user_name,
              photoURL,
            });

            updated++;
            appendLog(
              `  Updated following doc ${followRef.path} with user_name="${user_name}".`
            );
          } catch (e) {
            console.error(e);
            errors++;
            appendLog(`  ERROR updating ${followRef.path}: ${e.message}`);
          }
        }
      }

      appendLog("Migration finished.");
      setSummary({ updated, skipped, errors });
    } catch (e) {
      console.error(e);
      appendLog(`FATAL ERROR: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Following Migration: user_name + photoURL</h1>
      <p style={{ maxWidth: 600 }}>
        This tool will scan <code>/user/*/following/*</code> and copy{" "}
        <code>user_name</code> and <code>photoURL</code> from{" "}
        <code>/user/{"{targetUid}"}</code> into each following document that
        doesn&apos;t have them yet.
      </p>

      <button
        onClick={runMigration}
        disabled={running}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #111",
          background: running ? "#ddd" : "#111",
          color: running ? "#333" : "#fff",
          cursor: running ? "default" : "pointer",
          marginBottom: 12,
        }}
      >
        {running ? "Running…" : "Run migration"}
      </button>

      {summary && (
        <div style={{ marginBottom: 12 }}>
          <strong>Summary:</strong>
          <div>Updated docs: {summary.updated}</div>
          <div>Skipped (already had data): {summary.skipped}</div>
          <div>Errors: {summary.errors}</div>
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          maxHeight: 300,
          overflow: "auto",
          background: "#111",
          color: "#eee",
          padding: 10,
          borderRadius: 8,
          fontSize: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {log.join("\n")}
      </div>
    </div>
  );
}
