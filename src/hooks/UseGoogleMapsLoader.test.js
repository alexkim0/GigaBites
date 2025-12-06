/**
 * @jest-environment jsdom
 */

import { useGoogleMapsLoader } from "./UseGoogleMapsLoader";

// ---- Mock @react-google-maps/api ----
jest.mock("@react-google-maps/api", () => ({
  useJsApiLoader: jest.fn(),
}));

import { useJsApiLoader } from "@react-google-maps/api";
import { renderHook } from "@testing-library/react";

describe("useGoogleMapsLoader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls useJsApiLoader with correct loader options", () => {
    // Mock return value that hook should pass through
    const mockResult = { isLoaded: true, loadError: null };
    useJsApiLoader.mockReturnValue(mockResult);

    const { result } = renderHook(() => useGoogleMapsLoader());

    // Ensure hook calls useJsApiLoader with static config
    expect(useJsApiLoader).toHaveBeenCalledWith({
      id: "google-map-script",
      googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
      libraries: ["places"],
    });

    // Hook result must equal mockResult
    expect(result.current).toBe(mockResult);
  });
});
