import { useEffect, useMemo, useState, useRef } from "react";
import {
    collection, query, where,
    orderBy, limit, getDocs, startAfter,
} from "firebase/firestore";
import { db } from "../config/firebase-config";

export function UseUserPosts(profileId, pageSize = 18) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState(null); // last doc snapshot

    const loadedForIdRef = useRef(null);

    // Build the base query only when inputs(profileId, pageSize) change
    const baseQuery = useMemo(() => {
        if (!profileId) return null;
        return query(
            collection(db, "post"),
            where("post_authorId", "==", profileId),
            orderBy("post_date", "desc"),
            limit(pageSize)
        );
    }, [profileId, pageSize]);

  // Core loader (first page + next pages)
    const load = async () => {
        if (!baseQuery || loading || !hasMore) return;
        setLoading(true);

        try {
            let q = baseQuery;

            // For subsequent pages, continue after the last doc we saw
            if (cursor) {
                q = query(
                collection(db, "post"),
                where("post_authorId", "==", profileId),
                orderBy("post_date", "desc"),
                startAfter(cursor),
                limit(pageSize)
                );
            }

            const snap = await getDocs(q);

            const newPosts = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(), // fields like post_caption, post_media, post_type, etc.
            }));

            setPosts(prev => {
                const prevIds = new Set(prev.map(p => p.id));
                const uniqueNew = newPosts.filter(n => !prevIds.has(n.id));
                return [...prev, ...uniqueNew];
            });

            // If fewer than requested came back, we're at the end
            if (snap.docs.length < pageSize) setHasMore(false);

            // Save the last doc as the next page cursor (or null if none)
            setCursor(snap.docs[snap.docs.length - 1] || null);
        } finally {
            setLoading(false);
        }
    };

    // Reset paging when profile changes
    useEffect(() => {
        setPosts([]);
        setCursor(null);
        setHasMore(true);
        loadedForIdRef.current = null;
    }, [profileId]);


    // first load: ensure it fires only once per profileId (guards StrictMode double-call)
    useEffect(() => {
        if (!profileId || !baseQuery) return;
        if (loadedForIdRef.current === profileId) return; // already kicked off
        loadedForIdRef.current = profileId;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId, baseQuery]);

    console.log(posts)
    return { posts, loading, hasMore, loadMore: load };

}