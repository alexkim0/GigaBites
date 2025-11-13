import { useEffect, useMemo, useState, useRef } from "react";
import {
    collection, query, where,
    orderBy, limit, getDocs, startAfter,
} from "firebase/firestore";
import { db, auth } from "../config/firebase-config";

export function UseUserPosts(profileId, pageSize = 18) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState(null); // last doc snapshot

    const loadedForIdRef = useRef(null);

    // figure out if this is my own profile
    const currentUid = auth.currentUser?.uid || null;
    const isOwnProfile = currentUid && currentUid === profileId;

    // Build the base query only when inputs(profileId, pageSize) change
    const baseQuery = useMemo(() => {
        if (!profileId) return null;

        const baseConstraints = [
        where("post_authorId", "==", profileId),
        ];

        // if it's NOT my profile, only show public posts
        if (!isOwnProfile) {
        baseConstraints.push(where("post_visibility", "==", "public"));
        }

        baseConstraints.push(orderBy("post_date", "desc"));
        baseConstraints.push(limit(pageSize));

        return query(
        collection(db, "post"),
        ...baseConstraints
        );
    }, [profileId, pageSize, isOwnProfile]);

  // Core loader (first page + next pages)
    const load = async () => {
        if (!baseQuery || loading || !hasMore) return;
        setLoading(true);

        try {
            let q = baseQuery;

            // For subsequent pages, continue after the last doc we saw
            if (cursor) {
                const constraints = [
                    where("post_authorId", "==", profileId),
                ];

                // ⭐ same visibility rule for pagination
                if (!isOwnProfile) {
                    constraints.push(where("post_visibility", "==", "public"));
                }

                constraints.push(orderBy("post_date", "desc"));
                constraints.push(startAfter(cursor));
                constraints.push(limit(pageSize));

                q = query(collection(db, "post"), ...constraints);
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
        } catch (err) {
            console.error("[UseUserPosts] load failed:", err);
            // If you see FAILED_PRECONDITION here, create a composite index for:
            // post_authorId (==), post_date (desc)
            setHasMore(false);
        }   finally {
            setLoading(false);
        }
    };

    // Reset paging when profile changes
    useEffect(() => {
        setPosts([]);
        setCursor(null);
        setHasMore(true);
        loadedForIdRef.current = null;
        console.log("id changed")
    }, [profileId]);


    // first load: ensure it fires only once per profileId (guards StrictMode double-call)
    useEffect(() => {
        if (!profileId || !baseQuery) return;
        if (loadedForIdRef.current === profileId) return; // already kicked off
        loadedForIdRef.current = profileId;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId, baseQuery]);

    return { posts, loading, hasMore, loadMore: load };

}