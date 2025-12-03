import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useGoogleMapsLoader } from "../../hooks/UseGoogleMapsLoader";
import "./RestaurantPage.css";

export default function RestaurantPage() {
  const { placeId } = useParams();
  const { isLoaded, loadError } = useGoogleMapsLoader();

  const mapDivRef = useRef(null); // tiny hidden map div required by PlacesService
  const [status, setStatus] = useState("Loading…");
  const [place, setPlace] = useState(null);
  const [error, setError] = useState(null);
  
    useEffect(() => {
      if (!placeId) {
        setError("Missing placeId in route.");
        setStatus("Failed to load");
        return;
      }

      if (loadError) {
        setError("Failed to load Google Maps script.");
        setStatus("Failed to load");
        return;
      }

      if (!isLoaded) {
        setStatus("Loading…");
        return;
      }

      const g = window.google;
      const tmpDiv = document.createElement("div");
      const service = new g.maps.places.PlacesService(tmpDiv);

      const req = {
        placeId,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "rating",
          "user_ratings_total",
          "opening_hours",
          "url",
          "website",
          "geometry.location",
          "photos",
        ],
      };

      setStatus("Fetching place details…");
      setError(null);
      setPlace(null);

      service.getDetails(req, (result, svcStatus) => {
        const OK = g.maps.places.PlacesServiceStatus.OK;
        if (svcStatus !== OK || !result) {
          setError(`Could not load details for id: ${placeId} (status: ${svcStatus})`);
          setStatus("Failed to load");
          return;
        }
        setPlace(result);
        setStatus("Loaded");
      });
    }, [placeId, isLoaded, loadError]);

  return (
    <div className="rp-container">
      {/* Hidden div for PlacesService when using a DOM node */}
      <div ref={mapDivRef} style={{ width: 0, height: 0, overflow: "hidden" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Link to="/mapspage" style={{ textDecoration: "none" }}>← Back to Map</Link>
      </div>

      {!place && !error && (
        <div className="rp-skeleton">
          <div style={{ height: 28, width: 280, borderRadius: 8, background: "#eee", marginBottom: 8 }} />
          <div style={{ height: 18, width: 360, borderRadius: 8, background: "#eee", marginBottom: 12 }} />
          <div style={{ height: 200, borderRadius: 12, background: "#f6f6f6" }} />
        </div>
      )}

      {error && (
        <div className="rp-error" style={{ color: "#c00", marginTop: 12 }}>{error}</div>
      )}

      {place && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {/* Left Card: Name, Address, Rating */}
          <div style={{
            flex: "1 1 300px",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 250
          }}>
            <h1 style={{ margin: 0, fontSize: 28 }}>{place.name}</h1>

            {/* Address */}
            {place.formatted_address && (
              <p style={{ margin: 0, color: "#444" }}>{place.formatted_address}</p>
            )}

            {/* Rating */}
            <div style={{ fontSize: 16 }}>
              {typeof place.rating === "number" ? (
                <span>
                  ⭐ {place.rating} <span style={{ color: "#777" }}>({place.user_ratings_total || 0})</span>
                </span>
              ) : (
                <span>⭐ No rating</span>
              )}
            </div>
          </div>

          {/* Right Card: Photo */}
          {place.photos?.[0] && (
            <div style={{
              flex: "1 1 300px",
              border: "1px solid #e5e5e5",
              borderRadius: 16,
              boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
              overflow: "hidden",
              minWidth: 250,
            }}>
              <img
                src={place.photos[0].getUrl({ maxWidth: 1200 })}
                alt={place.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}

          {/* Bottom Card: Hours + Links */}
          <div style={{
            width: "100%",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 16
          }}>
            {/* Hours */}
            <div>
              <h3 style={{ margin: "0 0 8px" }}>Hours</h3>
              {place.opening_hours?.weekday_text ? (
                <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 1.7 }}>
                  {place.opening_hours.weekday_text.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#777", margin: 0 }}>Hours not available</p>
              )}
              {typeof place.opening_hours?.isOpen === "function" && (
                <p style={{ marginTop: 6, color: place.opening_hours.isOpen() ? "#137333" : "#c5221f" }}>
                  {place.opening_hours.isOpen() ? "Open now" : "Closed now"}
                </p>
              )}
            </div>

            {/* Helpful Links */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href={`https://www.google.com/maps/place/?q=place_id:${placeId}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", border: "1px solid #ddd", padding: "8px 12px", borderRadius: 12 }}
              >
                Open in Google Maps
              </a>
              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none", border: "1px solid #ddd", padding: "8px 12px", borderRadius: 12 }}
                >
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
