import { useEffect, useMemo, useState } from "react";
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

            setPosts((prev) => [...prev, ...newPosts]);

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
    }, [profileId]);


    // Auto-load first page when profileId becomes available
    useEffect(() => {
        if (profileId) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId]);

    console.log(posts)
    return { posts, loading, hasMore, loadMore: load };

}