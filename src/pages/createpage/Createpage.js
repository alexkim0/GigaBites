// src/pages/createpage/Createpage.js
import React, { useRef, useState, useEffect } from "react";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import DivButton from "../../components/DivButton";
import toast from "react-hot-toast"

import { CreatePostWithUpload } from "../../hooks/CreatePostWithUpload";
import { useGoogleMapsLoader } from "../../hooks/UseGoogleMapsLoader";
import CategoryOverlay from "../../components/CategoryOverlay/CategoryOverlay";

import {
  GoogleMap,
  Marker,
  useJsApiLoader,          // ⬅️ NEW
} from "@react-google-maps/api";

import "./Createpage.css";

export const FOOD_OPTIONS = [
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


// small default center (LA)
const fallbackCenter = { lat: 34.0522, lng: -118.2437 };

export const Createpage = () => {
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [error, setError] = useState("");
    const [uploadPct, setUploadPct] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadedURL, setUploadedURL] = useState("");
    const [caption, setCaption] = useState("");
    const [rating, setRating] = useState(0);

    // restaurant + map state
    const [restaurantQuery, setRestaurantQuery] = useState("");
    const [restaurantResults, setRestaurantResults] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [mapCenter, setMapCenter] = useState(fallbackCenter);
    const autocompleteService = useRef(null);

    // near other useState hooks
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [showCategoryOverlay, setShowCategoryOverlay] = useState(false);

    const toggleCategory = (label) => {
    setSelectedCategories((prev) =>
        prev.includes(label)
        ? prev.filter((x) => x !== label)
        : [...prev, label]
    );
    };

    const handleClick = (value) => {
        setRating(value);
    };

    const exitClick = () => {
        setSelectedRestaurant(selectedRestaurant => !selectedRestaurant);
    };

    const isImage = (f) => f?.type?.startsWith("image/");
    const isVideo = (f) => f?.type?.startsWith("video/")

    const { isLoaded, loadError } = useGoogleMapsLoader();

    // set up AutocompleteService once Maps is ready
    useEffect(() => {
        if (!isLoaded || !window.google || !window.google.maps) return;
        autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
    }, [isLoaded]);

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

    // search restaurants using Places Autocomplete
    const searchRestaurants = (text) => {
        setRestaurantQuery(text);

        if (!text.trim()) {
        setRestaurantResults([]);
        return;
        }
        if (!autocompleteService.current) return;

        autocompleteService.current.getPlacePredictions(
        {
            input: text,
            types: ["establishment"],
            keyword: "restaurant",
        },
        (preds) => {
            setRestaurantResults(preds || []);
        }
        );
    };

    // when user picks a prediction, fetch full details + move map
    // Also checks if user's selection is a restaurant or not
    const fetchRestaurantDetails = (placeId) => {
    if (!window.google || !window.google.maps) return;

    const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
    );

    service.getDetails(
        {
        placeId,
        fields: ["name", "formatted_address", "geometry", "types"],
        },
        (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) {
            return;
        }

        //  Hard rule: must be a restaurant
        if (!Array.isArray(place.types) || !place.types.includes("restaurant")) {
            // You can use toast here if you want:
            // toast.error("Please select a restaurant, not another type of place.");
            setError("Please select a restaurant, not another type of place.");
            return;
        }

        if (!place.geometry || !place.geometry.location) return;

        const loc = place.geometry.location;
        const locObj = { lat: loc.lat(), lng: loc.lng() };

        const restaurant = {
            placeId,
            name: place.name,
            address: place.formatted_address || "",
            location: locObj,
        };

        setSelectedRestaurant(restaurant);
        setRestaurantResults([]);
        setRestaurantQuery(place.name);
        setMapCenter(locObj); // center map on selection
        setError(""); // clear any previous error
        }
    );
    };

    const uploadNow = async () => {
        if (!file) return;
        try {
            setUploading(true);
            const { downloadURL } = await CreatePostWithUpload(file, {
                caption,
                stars: rating, 
                restaurant: selectedRestaurant,
                post_categories: selectedCategories, 
                onProgress: (pct) => setUploadPct(pct),
            });
            console.log(uploadPct);
            setUploadedURL(downloadURL);
            toast.success("Post uploaded!");
            navigate("/feed");
        } catch (err) {
            console.error(err);
            setError(err.message || "Upload failed");
        } finally {
            setUploading(false);
            console.log("navigating")
        }
    };



    return (
        <div className="createpage">
            {!file && (
                <div className="button-container">
                    <DivButton className="select-button" onClick={openPicker}>
                        <i class='bx  bx-plus-big'> </i> Create
                    </DivButton>
                </div>
            )}

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
                <div className="uploading-container">

                    {/* EXISTING split: caption + media preview */}
                    <div className="split-container">
                        
                        <div className="preview-container">
                            {/* Preview */}
                            {previewURL && isImage(file) &&  (
                                <img
                                    src={previewURL}
                                    alt="Selected preview"
                                    className="preview-img"
                                />
                            )}

                            {previewURL && isVideo(file) && (
                                <video
                                    key={previewURL}
                                    src={previewURL}
                                    controls
                                    className="preview-video"
                                />
                            )}
                            {/*<div className="video-info">
                                Selected: <strong>{file.name}</strong>{" "}
                                ({(file.size / (1024 * 1024)).toFixed(2)} MB) —{" "}
                                {isImage(file) ? "Image" : isVideo(file) ? "Video" : "Unknown"}
                            </div>*/}
                        </div>

                        {isLoaded && (
                        <div className="create-map-wrapper">
                            {loadError && <div>Map failed to load.</div>}
                            {!loadError && (
                            <GoogleMap
                                mapContainerStyle={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "12px",
                                }}
                                center={mapCenter}
                                zoom={selectedRestaurant ? 16 : 13}
                                options={{
                                    clickableIcons: false,
                                    streetViewControl: false,
                                    mapTypeControl: false,
                                    fullscreenControl: false,
                                }}
                            >
                                {selectedRestaurant && (
                                <Marker position={selectedRestaurant.location} />
                                )}
                            </GoogleMap>
                            )}
                        </div>
                        )}

                    </div>
                    
                    {/* RESTAURANT + MAP SECTION */}
                    <div className="restaurant-section">
                        <label className="field-label">Restaurant</label>
                        {!selectedRestaurant && (
                            <div className = "restaurant-select">
                                <input
                                    className="restaurant-input"
                                    placeholder="Search restaurant…"
                                    value={restaurantQuery}
                                    onChange={(e) => searchRestaurants(e.target.value)}
                                />

                                {restaurantResults.length > 0 && (
                                    <div className="restaurant-dropdown">
                                        {restaurantResults.map((r) => (
                                            <div
                                                key={r.place_id}
                                                className="restaurant-option"
                                                onClick={() => fetchRestaurantDetails(r.place_id)}
                                            >
                                                {r.description}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedRestaurant && (
                        <div className="restaurant-preview">
                            <div>
                                <strong>{selectedRestaurant.name}</strong>
                                <p>{selectedRestaurant.address}</p>
                            </div>
                            <i class='bx  bx-x' onClick={exitClick}></i>
                        </div>
                        )}

                        {selectedRestaurant && (
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <i
                                        key={value}
                                        className={`bx bxs-star star ${value <= rating ? "filled" : ""}`}
                                        onClick={() => handleClick(value)}
                                    ></i>
                                ))}
                            </div>
                        )}

                        {/* Caption input */}
                        <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption..."
                        className="caption-input"
                        />

                        <div className="category-section">
                            <label className="field-label">Categories</label>
                            <DivButton
                                className="ghost"
                                type="button"
                                onClick={() => setShowCategoryOverlay(true)}
                            >
                                Choose categories
                            </DivButton>

                            {selectedCategories.length > 0 && (
                                <div className="selected-preview">
                                {selectedCategories.map((label) => (
                                    <span key={label} className="mini-chip">
                                    {label}
                                    </span>
                                ))}
                                </div>
                            )}
                        </div>
                        
                        <CategoryOverlay
                            open={showCategoryOverlay}
                            title="Post categories"
                            subtitle="Select one or more categories that match this place."
                            options={FOOD_OPTIONS}
                            selected={selectedCategories}
                            onToggle={toggleCategory}
                            onClose={() => setShowCategoryOverlay(false)}
                            onConfirm={() => setShowCategoryOverlay(false)}
                        />
                    </div>


                    


                    {/* Upload button + progress */}
                    <div className="upload-status">
                        <DivButton
                        onClick={uploadNow}
                        disabled={uploading}
                        className="ghost"
                        >
                        {uploading ? "Posting…" : "Post"}
                        </DivButton>

                        {uploading && (
                            <div className="progress-track">
                                <div 
                                className="progress-fill"
                                style={{ width: `${uploadPct}%` }}
                                ></div>
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