// src/pages/Messagepage/Messagepage.js
import React, { useEffect, useMemo, useState } from "react";
import { auth } from "../../config/firebase-config";
import { ensureConversation } from "../../lib/Chat";
import { useConversations } from "../../hooks/UseConversations";
import { useMessages } from "../../hooks/UseMessages";
import { useFollowingList } from "../../hooks/UseFollowingList"
import { useUserNameMap } from "../../hooks/UseUsernameMap";
import Modal from "../../components/Modal/Modal"
import "./Messagepage.css";

export default function Messagepage() {
    const me = auth.currentUser?.uid;
    const convos = useConversations(me);

    // collect all "other" uids once
    const otherUids = convos
        .map(c => c.participants.find(u => u !== me))
        .filter(Boolean);
    
    const nameMap = useUserNameMap(otherUids);

    const [activeCid, setActiveCid] = useState(null);
    const { list: messages, send } = useMessages(activeCid);
    const [input, setInput] = useState("");

    // search + following list for "new chat" modal
    const [search, setSearch] = useState("");
    const { following } = useFollowingList(me, search);


    // controls the overlay/modal
    const [showFollowModal, setShowFollowModal] = useState(false);

    // auto-select the most recent conversation
    useEffect(() => {
        if (activeCid) return;
        if (convos.length > 0) setActiveCid(convos[0].id);
    }, [convos, activeCid]);

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
                            onClick={() => setActiveCid(c.id)}
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
                <div className="msg-thread">
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`msg-bubble ${
                                m.senderId === me ? "mine" : ""
                            }`}
                        >
                            {m.text}
                        </div>
                    ))}
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

        {/* FOLLOWING LIST MODAL (uses your shared Modal component) */}
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
                {following.map((f) => {
                    const uid = f.targetUid || f.id;
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
                                src={f.photoURL || "https://ui-avatars.com/api/?name=U"}
                                alt=""
                                className="modal-follow-avatar"
                            />
                            <span className="modal-follow-name">
                                {f.user_name || uid.slice(0, 6)}
                            </span>
                        </button>
                    );
                })}

                {following.length === 0 && (
                    <div className="msg-empty-small">
                        You’re not following anyone yet.
                    </div>
                )}
            </div>
        </Modal>
      </div>
    )
}