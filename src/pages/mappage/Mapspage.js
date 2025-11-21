// src/pages/mapspage/Mapspage.js
// window variable: checks if APIs are properly loaded or not
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";
import { useNavigate, useLocation } from "react-router-dom";
import { useGoogleMapsLoader } from "../../hooks/UseGoogleMapsLoader";
import { db } from "../../config/firebase-config";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

import "./Mapspage.css";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

// fallback center (LA)
const fallbackCenter = { lat: 34.0522, lng: -118.2437 };

export default function Mapspage() {
  const navigate = useNavigate();
  const { search: queryString } = useLocation();

  const [center, setCenter] = useState(fallbackCenter);
  const [restaurants, setRestaurants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Loading map…");
  const [hasPostsForSelected, setHasPostsForSelected] = useState(null); // null = unknown, true/false
  const [checkingPosts, setCheckingPosts] = useState(false);
  const [avgPostRating, setAvgPostRating] = useState(null); // ⭐ average from your app posts
  const [postCountForSelected, setPostCountForSelected] = useState(0);

  const [hasMore, setHasMore] = useState(false);       // is there another page?
  const [loadingMore, setLoadingMore] = useState(false); // are we currently loading more?

  const paginationRef = useRef(null);  // Google Places pagination object
  const isFirstPageRef = useRef(true); // track if we're on the first page of this search

  const [nearAutocomplete, setNearAutocomplete] = useState(null);

    // When the Autocomplete instance is ready
  const onNearLoad = (autocomplete) => {
    setNearAutocomplete(autocomplete);
  };

  // When user picks a suggestion from the dropdown
  const onNearPlaceChanged = () => {
    if (!nearAutocomplete || !window.google) return;

    const place = nearAutocomplete.getPlace();
    if (!place) return;

    // Build a nice label for the input
    const value =
      place.formatted_address ||
      (place.address_components
        ? place.address_components.map((c) => c.long_name).join(", ")
        : place.name);

    if (value) setCity(value);

    // Center map + search nearby if we have geometry
    const locObj = place.geometry?.location;
    if (locObj && mapRef.current) {
      const lat = locObj.lat();
      const lng = locObj.lng();
      const latLng = new window.google.maps.LatLng(lat, lng);

      setCenter({ lat, lng });
      mapRef.current.panTo(latLng);

      // Run your existing nearby restaurant search around this city
      runRestaurantSearch(mapRef.current, latLng);
    }
  };

  // Yelp-like search fields
  const [term, setTerm] = useState("");               // "sushi", "boba"
  const [city, setCity] = useState(""); // default city

  // store map instance so we can use it in handlers
  const mapRef = useRef(null);

  const [initializedFromQuery, setInitializedFromQuery] = useState(false);

  const { isLoaded, loadError } = useGoogleMapsLoader();

  const hasPlaceInQuery = (() => {
    const params = new URLSearchParams(queryString);
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    const placeIdParam = params.get("placeId");
    // treat it as a deep link if we at least have lat/lng
    return !isNaN(lat) && !isNaN(lng);
  })();

  // Softer, Uber-Eats-ish map style
  const uberEatsMapStyle = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#ffffff" }],
    },
    {
      featureType: "road",
      elementType: "labels",
      stylers: [{ visibility: "simplified" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#d6f3f1" }],
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#f5f5f7" }],
    },
    {
      featureType: "administrative",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }],
    },
  ];

  // Helper: run Places nearbySearch for restaurants near a point
  // The actual search function that searches nearby restaurant of the city(locationLatLng)
  const runRestaurantSearch = useCallback(
    (map, locationLatLng) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Places library not loaded");
        setStatus("Places API not available");
        return;
      }

      const service = new window.google.maps.places.PlacesService(map);

      const request = {
        location: locationLatLng,
        radius: 4000,          // meters
        type: "restaurant",    // only restaurants
      };

      if (term.trim()) {
        request.keyword = term.trim(); // e.g. "ramen", "boba", "thai"
      }

      // New search → reset list + pagination
      setStatus("Searching restaurants…");
      setRestaurants([]);
      setSelected(null);
      setHasMore(false);
      paginationRef.current = null;
      isFirstPageRef.current = true;
      setLoadingMore(false);

      const handlePage = (results, placesStatus, pagination) => {
        if (placesStatus !== window.google.maps.places.PlacesServiceStatus.OK) {
          console.error("Places error:", placesStatus);
          setStatus("Failed to load restaurants.");
          setLoadingMore(false);
          return;
        }

        const mapped = results.map((r) => ({
          id: r.place_id,
          placeId: r.place_id,
          name: r.name,
          rating: r.rating || 0,
          address: r.vicinity || r.formatted_address || "",
          location: {
            lat: r.geometry.location.lat(),
            lng: r.geometry.location.lng(),
          },
        }));

        // First page: replace list, later pages: append
        if (isFirstPageRef.current) {
          isFirstPageRef.current = false;
          setRestaurants(mapped);
        } else {
          setRestaurants((prev) => [...prev, ...mapped]);
        }

        // Manage pagination
        if (pagination && pagination.hasNextPage) {
          paginationRef.current = pagination;
          setHasMore(true);
        } else {
          paginationRef.current = null;
          setHasMore(false);
        }

        setStatus((prev) =>
          prev.startsWith("Searching")
            ? `Found ${isFirstPageRef.current ? mapped.length : mapped.length} restaurants (so far)`
            : prev
        );
        setLoadingMore(false);
      };

      // First page
      service.nearbySearch(request, (results, placesStatus, pagination) => {
        handlePage(results, placesStatus, pagination);
      });
    },
    [term, setStatus]
  );

  const loadMoreRestaurants = () => {
    if (!paginationRef.current) return;
    setLoadingMore(true);
    paginationRef.current.nextPage(); // will re-trigger the same callback used above
  };

  // Search restaurants around the current map center
  const handleSearchHere = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    const centerLatLng = mapRef.current.getCenter();
    if (!centerLatLng) return;

    // This uses your existing nearbySearch logic
    runRestaurantSearch(mapRef.current, centerLatLng);
  }, [runRestaurantSearch]);

  useEffect(() => {
    // nothing selected or no placeId → reset and bail
    if (!selected || !selected.placeId) {
      setHasPostsForSelected(null);
      setAvgPostRating(null);
      setPostCountForSelected(0);
      return;
    }

    const check = async () => {
      try {
        setCheckingPosts(true);

        const q = query(
          collection(db, "post"),
          where("post_visibility", "==", "public"),     // match your rules
          where("post_restaurant.placeId", "==", selected.placeId)
        );

        const snap = await getDocs(q);
        const docs = snap.docs;

        // ✅ do we have any posts at all?
        setHasPostsForSelected(docs.length > 0);

        // Now compute average rating from post_stars
        if (docs.length > 0) {
          let sum = 0;
          let count = 0;

          for (const d of docs) {
            const data = d.data();
            const stars = Number(data.post_stars || 0);
            if (!Number.isNaN(stars) && stars > 0) {
              sum += stars;
              count++;
            }
          }

          if (count > 0) {
            setAvgPostRating(sum / count);      // average ⭐
            setPostCountForSelected(count);     // how many rated posts
          } else {
            // posts exist but none have a positive rating
            setAvgPostRating(null);
            setPostCountForSelected(docs.length);
          }
        } else {
          setAvgPostRating(null);
          setPostCountForSelected(0);
        }
      } catch (e) {
        console.error("Failed to check posts for place", e);
        setHasPostsForSelected(null);
        setAvgPostRating(null);
        setPostCountForSelected(0);
      } finally {
        setCheckingPosts(false);
      }
    };

    check();
  }, [selected]);

  // 🔹 Use URL query (from "View in map" button on a post)
  useEffect(() => {
    if (!isLoaded) return; // wait until Maps JS is ready
    if (!window.google || !window.google.maps) return;

    const params = new URLSearchParams(queryString);
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    const nameParam = params.get("name");
    const placeIdParam = params.get("placeId"); // will be the Google place_id
    const prettyName = nameParam ? decodeURIComponent(nameParam) : "Selected place";

    if (isNaN(lat) || isNaN(lng)) return;

    const fallbackLoc = { lat, lng };

    // If we DON'T have a placeId, just use the simple fallback (old behavior)
    if (!placeIdParam || !window.google.maps.places) {
      const fromPost = {
        id: placeIdParam || "from-post",
        placeId: placeIdParam || null,
        name: prettyName,
        rating: null,
        address: "",
        location: fallbackLoc,
      };



      setCenter(fallbackLoc);
      setRestaurants([fromPost]);
      setSelected(fromPost);
      setStatus("Place from post");
      setInitializedFromQuery(true);
      return;
    }

    // We DO have a placeId → fetch details from Google
    const service = new window.google.maps.places.PlacesService(
      document.createElement("div") // we don't need the actual map instance
    );

    service.getDetails(
      {
        placeId: placeIdParam,
        fields: ["name", "rating", "formatted_address", "geometry"],
      },
      (result, detailStatus) => {
        if (
          detailStatus !== window.google.maps.places.PlacesServiceStatus.OK ||
          !result
        ) {
          console.error("Places getDetails failed:", detailStatus);

          // Fallback to basic info if details fail
          const fromPost = {
            id: placeIdParam,
            name: prettyName,
            rating: null,
            address: "",
            location: fallbackLoc,
          };

          setCenter(fallbackLoc);
          setRestaurants([fromPost]);
          setSelected(fromPost);
          setStatus("Place from post");
          setInitializedFromQuery(true);
          return;
        }

        const locObj = result.geometry?.location;
        const loc = locObj
          ? { lat: locObj.lat(), lng: locObj.lng() }
          : fallbackLoc;

        const enriched = {
          id: result.place_id || placeIdParam || "from-post",
          placeId: result.place_id || placeIdParam || null,
          name: result.name || prettyName,
          rating: result.rating || 0,
          address: result.formatted_address || "",
          location: loc,
        };

        setCenter(loc);
        setRestaurants([enriched]);
        setSelected(enriched);
        setStatus("Place from post");
        setInitializedFromQuery(true);
      }
    );
  }, [queryString, isLoaded]);

  // 2) When map loads, just save it + maybe auto-search current center
  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;

      // If the URL had a specific place (coming from feed),
      // DO NOT run the generic nearby search.
      if (hasPlaceInQuery) {
        if (center) {
          map.panTo(new window.google.maps.LatLng(center.lat, center.lng));
        }
        return;
      }

      // Otherwise: initial search using current center (geolocation or fallback)
      const loc = new window.google.maps.LatLng(center.lat, center.lng);
      runRestaurantSearch(map, loc);
    },
    [center, runRestaurantSearch, hasPlaceInQuery]
  );

  // 3) Optional: get user location on mount and recenter + search
  useEffect(() => {
    if (initializedFromQuery || hasPlaceInQuery) return;  // ⬅️ don't override

    if (!navigator.geolocation) {
      setStatus("Geolocation not available, using default location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(c);
        setStatus("Showing restaurants near your location");
      },
      () => {
        setStatus("Location blocked, using default city.");
      }
    );
  }, [initializedFromQuery, hasPlaceInQuery]);

  // Yelp-style search: "Find" (term) + "Near" (city)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!mapRef.current || !window.google || !window.google.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    const cityText = city.trim();
    console.log(cityText)
    if (!cityText) return;

    setStatus("Finding city…");

    geocoder.geocode({ address: cityText }, (results, geoStatus) => {
      if (geoStatus !== "OK" || !results || !results[0]) {
        console.error("Geocode failed:", geoStatus);
        setStatus("Could not find that city.");
        return;
      }

      // finds the center of the city(results[0])
      const loc = results[0].geometry.location; // LatLng object
      const newCenter = { lat: loc.lat(), lng: loc.lng() };

      setCenter(newCenter);
      mapRef.current.panTo(loc);

      // Now run restaurant search near this city
      runRestaurantSearch(mapRef.current, loc);
    });
  };

  if (loadError) return <div>Map failed to load.</div>;
  if (!isLoaded) return <div>Loading Google Maps…</div>;

  return (
    <div className="map-wrapper">
      {/* LEFT MAP */}
      <div className="map-container">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={14}
          onLoad={onMapLoad}
          options={{
            styles: uberEatsMapStyle,
            clickableIcons: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {restaurants.map((r, index) => (
            <Marker
              key={r.id || r.placeId || `${r.name}-${index}`}
              position={r.location}
              onClick={() => {
                setSelected(r);
                if (mapRef.current) {
                  mapRef.current.panTo(r.location);
                }
              }}
              animation={
                selected?.id === r.id
                  ? window.google.maps.Animation.BOUNCE
                  : undefined
              }
            />
          ))}
        </GoogleMap>

          {/* NEW: "Search here" button overlay */}
        <button
          type="button"
          className="map-search-here-btn"
          onClick={handleSearchHere}
        >
          Search this area
        </button>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="list-container">
        {/* Yelp-style search bar */}
        <form className="map-search-bar" onSubmit={handleSearch}>
          <div className="map-search-field">
            <label className="map-search-label">Find</label>
            <input
              type="text"
              className="map-search-input"
              placeholder="tacos, sushi, boba…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>

          <div className="map-search-field">
            <label className="map-search-label">Near</label>

            <Autocomplete
              onLoad={onNearLoad}
              onPlaceChanged={onNearPlaceChanged}
              options={{
                types: ["(cities)"],              // only cities; remove or change if you want addresses too
                // componentRestrictions: { country: "us" }, // optional: limit to US
              }}
            >
              <input
                type="text"
                className="map-search-input"
                placeholder="Los Angeles, CA"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Autocomplete>
          </div>

          <button type="submit" className="map-search-button">
            Search
          </button>
        </form>

        <h2>Restaurants</h2>
        <p className="list-status">{status}</p>

        <ul className="restaurant-list">
          {restaurants.map((r, index) => (
            <li
              key={r.id || r.placeId || `${r.name}-${index}`}
              className={`restaurant-item ${
                selected?.id === r.id ? "selected" : ""
              }`}
              onClick={() => {
                setSelected(r);
                if (mapRef.current) {
                  mapRef.current.panTo(r.location);
                }
              }}
            >
              <div className="restaurant-name">{r.name}</div>
              <div className="restaurant-rating">
                ⭐ {r.rating || "No rating"}
              </div>
              <div className="restaurant-address">{r.address}</div>
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            className="map-loadmore-button"
            onClick={loadMoreRestaurants}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading more…" : "Load more restaurants"}
          </button>
        )}
      </div>

      {/* OVERLAY CARD – only when selected */}
      {selected && (
        <div className="detail-overlay">
          <div className="detail-card">
            <button
              className="detail-close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>

            <h3 className="detail-title">{selected.name}</h3>
            <p className="detail-rating">⭐ {selected.rating || "No rating"}</p>
            {/* App rating from posts */}
            {hasPostsForSelected && avgPostRating != null && (
              <p className="detail-rating app-rating">
                App rating: ⭐ {avgPostRating.toFixed(1)}{" "}
                <span className="detail-rating-count">
                  ({postCountForSelected} review
                  {postCountForSelected === 1 ? "" : "s"})
                </span>
              </p>
            )}
            {hasPostsForSelected === false && !checkingPosts && (
              <p className="detail-rating app-rating">
                App rating: no reviews yet
              </p>
            )}
            <p className="detail-address">{selected.address}</p>

            {/* 🔽 NEW: View posts button */}
            <button
              className="detail-posts-button"
              disabled={
                checkingPosts ||
                hasPostsForSelected === false ||
                !selected?.placeId
              }
              onClick={() => {
                // safety guard so we never navigate if it's disabled
                if (!selected.placeId || hasPostsForSelected === false) return;
                // send restaurant name as query parameter
                navigate(
                  `/feed?placeId=${encodeURIComponent(
                    selected.placeId
                  )}&name=${encodeURIComponent(selected.name)}`
                );
              }}
            >
              {checkingPosts
              ? "Checking posts…"
              : hasPostsForSelected === false
              ? "No posts yet"
              : "View posts for this place"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}