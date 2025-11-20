// createPostWithUpload.js
import { db, storage, auth, serverTimestamp } from "../config/firebase-config";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Helper: extract dimensions / duration for images or videos
async function getClientMediaMeta(file) {
  const meta = { mimeType: file.type, width: null, height: null, durationMs: null };

  // when post is an image
  if (file.type.startsWith("image/")) {
    await new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        meta.width = img.width;
        meta.height = img.height;
        res();
      };
      img.src = URL.createObjectURL(file);
    });
// when post is a video
  } else if (file.type.startsWith("video/")) {
    await new Promise((res) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        meta.width = v.videoWidth || null;
        meta.height = v.videoHeight || null;
        meta.durationMs = Math.round((v.duration || 0) * 1000);
        res();
      };
      v.src = URL.createObjectURL(file);
    });
  }
  return meta;
}

export async function CreatePostWithUpload(file, opts = {}) {
    const { caption = "", restaurant = null, onProgress } = opts;

    // checks if user is signed in or not
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");

    // checks if post is a video or photo
    const isVideo = file.type.startsWith("video/");
    const postId = crypto.randomUUID();

    // prepare restaurant payload (or null)
    let postRestaurant = null;
    if (restaurant && restaurant.location) {
      postRestaurant = {
        placeId: restaurant.placeId || null,
        name: restaurant.name || "",
        address: restaurant.address || "",
        lat: restaurant.location.lat,
        lng: restaurant.location.lng,
      };
    }

    // Create Firestore doc
    const postRef = doc(db, "post", postId);
    await setDoc(postRef, {
        post_authorId: user.uid,
        post_url: "",
        post_type: isVideo ? "video" : "image",
        post_caption: caption,
        post_media: [],
        post_date: serverTimestamp(),
        post_likeCount: 0,
        post_commentCount: 0,
        post_visibility: "public",
        post_stars: 0,
        post_text: "",
        post_restaurant: postRestaurant,
    });

    // upload file to cloud storage
    const storagePath = `uploads/${user.uid}/${postId}/${file.name}`;
    const fileRef = ref(storage, storagePath);
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type });

    // stops the function until the program finishes uploading the file
    // continuously update the ui(progress bar to be exact)
    await new Promise((resolve, reject) => {
        task.on(
            "state_changed",
            (snap) => {
                if (onProgress) {
                const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
                onProgress(Math.round(pct));
                }
            },
            reject,
            resolve
        );
    });
    console.log("uploaded successfully")
    // 3) Get download URL
    const downloadURL = await getDownloadURL(fileRef);

    // 4) Get client-side metadata
    const m = await getClientMediaMeta(file);

    // 5) Update Firestore doc with media info
    await updateDoc(postRef, {
        post_media: [{
            storagePath,
            downloadURL,
            mimeType: file.type,
            width: m.width,
            height: m.height,
            durationMs: m.durationMs,
        }],
    });

    console.log("uploaded successfully")

    return { postId, downloadURL, storagePath }
}
