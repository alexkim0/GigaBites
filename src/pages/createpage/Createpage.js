import React, { useRef, useState, useEffect } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import DivButton from "../../components/DivButton";

import { CreatePostWithUpload } from "../../hooks/CreatePostWithUpload";

import "./Createpage.css";

export const Createpage = () => {
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [error, setError] = useState("");
    const [uploadPct, setUploadPct] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadedURL, setUploadedURL] = useState("");

    const isImage = (f) => f?.type?.startsWith("image/");
    const isVideo = (f) => f?.type?.startsWith("video/")

    // Create and clean up preview URL
    // function runs when videoFile gets rerendered
    useEffect(() => {
        if (!file) {
            setPreviewURL(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewURL(url);
        // clean up function: removes the url when picking a new file to avoid memory leak
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // function that gets called when upload video button is clicked
    const openPicker = () => fileInputRef.current?.click();

    // function that handles file selection
    const handlePick = (e) => {
        // gets the first file the user picked
        const f = e.target.files?.[0];
        // if no file selected, return null
        if (!f) return;

        // check if the file selected is a video
        if (!isImage(f) && !isVideo(f)) {
            setError("Please select a video file.");
            e.target.value = "";
            setFile(null);
            return;
        }

        setError("");
        setUploadedURL("");
        setUploadPct(0);
        setFile(f);
    };

    const uploadNow = async () => {
        if (!file) return;
        try {
            setUploading(true);
            const { downloadURL } = await CreatePostWithUpload(file, {
                onProgress: (pct) => setUploadPct(pct),
            });
            setUploadedURL(downloadURL);
        } catch (err) {
            console.error(err);
            setError(err.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };



    return (
        <div>
            <DivButton 
            className="ghost"
            onClick={openPicker}>
                Upload Video
            </DivButton>
            {/* Hidden input that opens the OS file picker */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={handlePick}
            />
            {/* display error if it does*/}
            {error && <p style={{ color: "crimson"}}>{error}</p>}

            {file && (
                <div>
                    <div className="video-info">
                        Selected: <strong>{file.name}</strong>{" "}
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB) —{" "}
                        {isImage(file) ? "Image" : isVideo(file) ? "Video" : "Unknown"}
                    </div>

                    {/* Preview */}
                    {previewURL && isImage(file) &&  (
                        <img
                            src={previewURL}
                            alt="Selected preview"
                            className="w-full max-w-xl rounded-lg object-contain"
                        />
                    )}

                    {previewURL && isVideo(file) && (
                        <video>
                            key={previewURL}
                            src={previewURL}
                            controls
                            className="w-full max-w-xl rounded-lg"
                        </video>
                    )}

                    {/* Upload button + progress */}
                    <div className="upload-status">
                        <DivButton
                        onClick={uploadNow}
                        disabled={uploading}
                        className="ghost"
                        >
                            {uploading ? "Uploading…" : "Upload to Firebase"}
                        </DivButton>

                        {uploading && (
                            <div className="outer-bar">
                                <div 
                                className="pct-visual"
                                style={{ width: `${uploadPct}` }}
                                 />
                            </div>
                        )}

                        {!uploading && uploadPct > 0 && uploadPct < 100 && (
                            <span className="pct-text">{uploadPct}%</span>
                        )}
                    </div>
                    
                    {/* Final URL after upload */}
                    {uploadedURL && (
                        <div className="text-sm">
                        Uploaded! Public URL:{" "}
                        <a href={uploadedURL} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                            open
                        </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}