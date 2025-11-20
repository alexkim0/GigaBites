// src/hooks/useGoogleMapsLoader.js
import { useJsApiLoader } from "@react-google-maps/api";

const loaderOptions = {
  id: "google-map-script",                     // 🔹 use ONE id everywhere
  googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  libraries: ["places"],                       // keep same libraries & order
};

export function useGoogleMapsLoader() {
  return useJsApiLoader(loaderOptions);
}