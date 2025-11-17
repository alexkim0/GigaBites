// src/pages/mapspage/Mapspage.js
// window variable: checks if APIs are properly loaded or not
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import "./Mapspage.css";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

// fallback center (LA)
const fallbackCenter = { lat: 34.0522, lng: -118.2437 };

export default function Mapspage() {
  const navigate = useNavigate();

  const [center, setCenter] = useState(fallbackCenter);
  const [restaurants, setRestaurants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Loading map…");

  // Yelp-like search fields
  const [term, setTerm] = useState("");               // "sushi", "boba"
  const [city, setCity] = useState("Los Angeles, CA"); // default city

  // store map instance so we can use it in handlers
  const mapRef = useRef(null);

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

  // 1) Load Google Maps JS with Places library
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places"], // IMPORTANT for PlacesService + Geocoder
  });

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
        radius: 4000,          // meters, adjust as you like
        type: "restaurant",    // only restaurants
      };

      // if user typed a search term, use it as keyword
      if (term.trim()) {
        request.keyword = term.trim(); // e.g. "ramen", "boba", "thai"
      }

      setStatus("Searching restaurants…");

      service.nearbySearch(request, (results, placesStatus) => {
        if (placesStatus !== window.google.maps.places.PlacesServiceStatus.OK) {
          console.error("Places error:", placesStatus);
          setStatus("Failed to load restaurants.");
          return;
        }

        const mapped = results.map((r) => ({
          id: r.place_id,
          name: r.name,
          rating: r.rating || 0,
          address: r.vicinity || r.formatted_address || "",
          location: {
            lat: r.geometry.location.lat(),
            lng: r.geometry.location.lng(),
          },
        }));

        setRestaurants(mapped);
        setSelected(null);
        setStatus(`Found ${mapped.length} restaurants`);
      });
    },
    [term, setStatus]
  );

  // 2) When map loads, just save it + maybe auto-search current center
  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      // initial search using fallback center or geolocation below
      runRestaurantSearch(map, new window.google.maps.LatLng(center.lat, center.lng));
    },
    [center, runRestaurantSearch]
  );

  // 3) Optional: get user location on mount and recenter + search
  useEffect(() => {
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

        if (mapRef.current && window.google) {
          const latLng = new window.google.maps.LatLng(c.lat, c.lng);
          mapRef.current.panTo(latLng);
          runRestaurantSearch(mapRef.current, latLng);
        }
      },
      () => {
        setStatus("Location blocked, using default city.");
      }
    );
  }, [runRestaurantSearch]);

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
          {restaurants.map((r) => (
            <Marker
              key={r.id}
              position={r.location}
              onClick={() => {
                setSelected(r);

                if (mapRef.current) {
                  mapRef.current.panTo(r.location);   // <-- move map to restaurant
                  // mapRef.current.setZoom(16);         // optional: zoom into restaurant
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
            <input
              type="text"
              className="map-search-input"
              placeholder="Los Angeles, CA"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <button type="submit" className="map-search-button">
            Search
          </button>
        </form>

        <h2>Restaurants</h2>
        <p className="list-status">{status}</p>

        <ul className="restaurant-list">
          {restaurants.map((r) => (
            <li
              key={r.id}
              className={`restaurant-item ${
                selected?.id === r.id ? "selected" : ""
              }`}
              onClick={() => {
                setSelected(r);

                if (mapRef.current) {
                  mapRef.current.panTo(r.location);   // <-- move map to restaurant
                  // mapRef.current.setZoom(14);         // optional: zoom into restaurant
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
            <p className="detail-address">{selected.address}</p>
          </div>
        </div>
      )}
    </div>
  );
}