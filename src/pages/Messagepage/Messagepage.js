// src/pages/Messagepage/Messagepage.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import { auth } from "../../config/firebase-config";
import { ensureConversation, markRead } from "../../lib/Chat";
import { useConversations } from "../../hooks/UseConversations";
import { useMessages } from "../../hooks/UseMessages";
import { useFollowingList } from "../../hooks/UseFollowingList"
import { useUserNameMap } from "../../hooks/UseUsernameMap";
import { db } from "../../config/firebase-config";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import Modal from "../../components/Modal/Modal"
import { useNavigate, useParams } from "react-router-dom";

import "./Messagepage.css";

export default function Messagepage() {
    const navigate = useNavigate();
    const me = auth.currentUser?.uid;
    const convos = useConversations(me);
    const threadRef = useRef(null);

    // collect all "other" uids once
    const otherUids = convos
        .map(c => c.participants.find(u => u !== me))
        .filter(Boolean);
    
    const nameMap = useUserNameMap(otherUids);

    const [activeCid, setActiveCid] = useState(null);
    const { messages, send, hasMore, loadingMore, loadMore } = useMessages(activeCid);
    const [input, setInput] = useState("");
    const [otherUser, setOtherUser] = useState(null);
    const [meProfile, setMeProfile] = useState(null);

    // search + following list for "new chat" modal
    const [search, setSearch] = useState("");
    const { following } = useFollowingList(me, search);

    // controls the overlay/modal
    const [showFollowModal, setShowFollowModal] = useState(false);

    // new: live list of profiles you follow
    const [followingProfiles, setFollowingProfiles] = useState([]);
    const [followingLoading, setFollowingLoading] = useState(true);

    const filteredFollowing = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return followingProfiles;
        return followingProfiles.filter((f) => {
            const name = (f.user_name || "").toLowerCase();
            return name.includes(q);
        });
    }, [followingProfiles, search]);

    // Watch my "following" subcollection and load each user's live profile
    useEffect(() => {
    if (!me) return;

    const followRef = collection(db, "user", me, "following");
    setFollowingLoading(true);

    const unsub = onSnapshot(
        followRef,
        async (snap) => {
        try {
            const uids = snap.docs.map((d) => {
            // you might store targetUid field or use doc ID
            const data = d.data() || {};
            return data.targetUid || d.id;
            });

            const profiles = [];
            for (const uid of uids) {
            if (!uid) continue;
            try {
                const uref = doc(db, "user", uid);
                const usnap = await getDoc(uref);
                if (usnap.exists()) {
                profiles.push({
                    id: uid,
                    ...usnap.data(), // should include user_name, user_pfp
                });
                }
            } catch (e) {
                console.error("Failed to load followed user", uid, e);
            }
            }

            setFollowingProfiles(profiles);
        } finally {
            setFollowingLoading(false);
        }
        },
        (err) => {
        console.error("following onSnapshot error", err);
        setFollowingLoading(false);
        setFollowingProfiles([]);
        }
    );

    return () => unsub();
    }, [me]);

    // Load your own profile once
    useEffect(() => {
    if (!me) return;

    (async () => {
        try {
        const ref = doc(db, "user", me);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            setMeProfile({
            id: me,
            user_name: snap.data().user_name || "",
            user_pfp: snap.data().user_pfp || "",
            });
        } else {
            setMeProfile({
            id: me,
            user_name: me.slice(0, 6),
            user_pfp: "",
            });
        }
        } catch (e) {
        console.error("Failed to load me profile", e);
        setMeProfile(null);
        }
    })();
    }, [me]);

    // Whenever activeCid changes, figure out other participant's uid and load their user document
    useEffect(() => {
    if (!activeCid || !me) return;

    const convo = convos.find(c => c.id === activeCid);
    if (!convo) return;

    const otherUid = convo.participants?.find(u => u !== me);
    if (!otherUid) return;

    (async () => {
        try {
        const uref = doc(db, "user", otherUid);
        const snap = await getDoc(uref);
        if (snap.exists()) {
            setOtherUser({
            id: otherUid,
            user_name: snap.data().user_name || "",
            user_pfp: snap.data().user_pfp || "",
            });
        } else {
            setOtherUser({
            id: otherUid,
            user_name: otherUid.slice(0, 6),
            user_pfp: "",
            });
        }
        } catch (e) {
        console.error("Failed to load other user", e);
        setOtherUser(null);
        }
    })();
    }, [activeCid, convos, me]);

    // auto-select the most recent conversation
    useEffect(() => {
        if (activeCid) return;
        if (convos.length > 0) setActiveCid(convos[0].id);
    }, [convos, activeCid]);
    
    // scroll to bottom whenever activeCid changes OR messages change
    useEffect(() => {
    if (!threadRef.current) return;
    if (!activeCid) return;
    if (!messages || messages.length === 0) return;

    const el = threadRef.current;
    // move to bottom: scrollTop = scrollHeight
    el.scrollTop = el.scrollHeight;
    }, [activeCid, messages]);

    // When you click someone in "following", create/open DM
    const startDM = async (targetUid) => {
        if (!me || !targetUid) return;
        try {
            const { cid } = await ensureConversation(me, targetUid);
            setActiveCid(cid);
        } catch (err) {
            console.error("startDM failed:", err);
        }
    };


    if (!me) {
        return <div className="msg-root">You must be logged in to use messages.</div>;
    }


    return (
      <div className="msg-root">
        {/* LEFT: conversation list */}
        <aside className="msg-left">
            <div className="msg-left-header">
                <h3>Messages</h3>
                <button
                    type="button"
                    className="msg-newchat-btn"
                    onClick={() => setShowFollowModal(true)}
                >
                    + New
                </button>
            </div>

            <div className="msg-convos">
                {convos.map((c) => {
                    const other = c.participants?.find((u) => u !== me);
                    const userName = nameMap[other];
                    const unread = c.unread?.[me] ?? 0;
                    return (
                        <button
                            key={c.id}
                            className={`msg-convo ${activeCid === c.id ? "active" : ""}`}
                            onClick={async () => {
                                setActiveCid(c.id);
                                try {
                                    await markRead(c.id, me);
                                } catch (e) {
                                    console.error("markConversationRead failed", e);
                                }
                            }}
                        >
                            <div className="msg-line">
                                <span className="msg-name">
                                    {userName ? `@${userName}` : ""}
                                </span>
                                {userName && unread > 0 && (
                                    <span className="msg-badge">{unread}</span>
                                )}
                            </div>
                            <div className="msg-last">
                                {userName && c.lastMessage || "…"}
                            </div>
                        </button>
                    );
                })}
                {convos.length === 0 && (
                    <div className="msg-empty-small">
                        No conversations yet. Start a new chat ➜
                    </div>
                )}
            </div>
        </aside>


        {/* MIDDLE: chat area */}
        <main className="msg-right">
            {!activeCid ? (
            <div className="msg-empty">
                Pick a conversation on the left or click <strong>+ New</strong> to
                start chatting with someone you follow.
            </div>
            ) : (
            <>
                <div className="msg-thread"
                     ref={threadRef}
                     onScroll={async (e) => {
                        {/* el : event location */}
                        const el = e.currentTarget;
                        if (el.scrollTop === 0 && hasMore && !loadingMore) {
                            const prevHeight = el.scrollHeight;
                            await loadMore();
                            // keep user at roughly the same visible position after we prepend
                            requestAnimationFrame(() => {
                                const newHeight = el.scrollHeight;
                                el.scrollTop = newHeight - prevHeight;
                            });
                        }
                }}>
                    {hasMore && !loadingMore && (
                        <div className="msg-load-more-hint">
                        Scroll up to load older messages…
                        </div>
                    )}

                    {loadingMore && <div className="msg-loading">Loading…</div>}

                    {/* loads messages and pfp */}
                    {messages.map((m) => {
                    const mine = m.senderId === me;

                    const avatarSrc = mine
                        ? (meProfile?.user_pfp || "https://ui-avatars.com/api/?name=Me")
                        : (otherUser?.user_pfp || "https://ui-avatars.com/api/?name=U");

                    const avatarUid = mine ? me : otherUser?.id; // whose profile to open

                    return (
                        <div
                        key={m.id}
                        className={`msg-row ${mine ? "mine" : "theirs"}`}
                        >
                        {/* avatar on left for others, on right for me (optional) */}
                        {!mine && (
                            <img
                            className="msg-avatar"
                            src={avatarSrc}
                            alt=""
                            onClick={(e) => {
                                e.stopPropagation();              // don’t trigger other click handlers
                                if (avatarUid) {
                                navigate(`/profilepage/${avatarUid}`);
                                }
                            }}
                            />
                        )}

                        <div className={`msg-bubble ${mine ? "mine" : ""}`}>
                            {m.text}
                        </div>

                        {mine && (
                            <img
                            className="msg-avatar mine"
                            src={avatarSrc}
                            alt=""
                            onClick={(e) => {
                                e.stopPropagation();
                                if (avatarUid) {
                                navigate(`/profilepage/${avatarUid}`);
                                }
                            }}
                            />
                        )}
                        </div>
                    );
                    })}
                </div>

                <form
                    className="msg-inputbar"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!input.trim()) return;
                        await send(input);
                        setInput("");
                    }}
                >
                    <input
                        className="msg-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Write a message…"
                    />
                    <button className="msg-send" type="submit">
                        Send
                    </button>
                </form>
            </>
            )}
        </main>

        <Modal open={showFollowModal} onClose={() => setShowFollowModal(false)}>
            <div className="modal-follow-header">
                <h3>Start new chat</h3>
            </div>

            <input
                className="msg-search"
                placeholder="Search following…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className="modal-follow-list">
                {followingLoading && (
                <div className="msg-empty-small">Loading following…</div>
                )}

                {!followingLoading && filteredFollowing.length === 0 && (
                <div className="msg-empty-small">
                    You’re not following anyone yet.
                </div>
                )}

                {!followingLoading &&
                filteredFollowing.map((f) => {
                    const uid = f.id;
                    return (
                    <button
                        key={uid}
                        className="modal-follow-row"
                        onClick={() => {
                        startDM(uid);
                        setShowFollowModal(false);
                        }}
                    >
                        <img
                        src={f.user_pfp || "https://ui-avatars.com/api/?name=U"}
                        alt=""
                        className="modal-follow-avatar"
                        />
                        <span className="modal-follow-name">
                        {f.user_name || uid.slice(0, 6)}
                        </span>
                    </button>
                    );
                })}
            </div>
        </Modal>
      </div>
    )
}