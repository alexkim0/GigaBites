// src/pages/mapspage/Mapspage.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import Mapspage from "./Mapspage";
import { useGoogleMapsLoader } from "../../hooks/UseGoogleMapsLoader";

// ---- MOCKS ----

// Google Maps loader hook (we control its return value per test)
jest.mock("../../hooks/UseGoogleMapsLoader", () => ({
  useGoogleMapsLoader: jest.fn(),
}));

// Firebase config
jest.mock("../../config/firebase-config", () => ({
  db: {},
}));

// Firestore API
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(async () => ({ docs: [] })),
}));

// React Router
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ search: "" }),
  };
});

// @react-google-maps/api – simple stand-ins
jest.mock("@react-google-maps/api", () => {
  const React = require("react");

  const GoogleMap = ({ children, onLoad }) => {
    React.useEffect(() => {
      if (onLoad) {
        // minimal mock map object
        const mockMap = {
          panTo: jest.fn(),
          getCenter: jest.fn(() => ({
            lat: () => 34.0522,
            lng: () => -118.2437,
          })),
        };
        onLoad(mockMap);
      }
    }, [onLoad]);

    return <div data-testid="google-map">{children}</div>;
  };

  const Marker = ({ onClick }) => (
    <div data-testid="marker" onClick={onClick} />
  );

  const Autocomplete = ({ children }) => <div>{children}</div>;

  return { GoogleMap, Marker, Autocomplete };
});

// ---- GLOBAL GOOGLE MAPS STUB ----
let geocodeMock;

beforeEach(() => {
  jest.clearAllMocks();

  geocodeMock = jest.fn();

  global.window.google = {
    maps: {
      Animation: { BOUNCE: "BOUNCE" },
      LatLng: function (lat, lng) {
        return { lat: () => lat, lng: () => lng };
      },
      Geocoder: function () {
        return { geocode: geocodeMock };
      },
      places: {
        PlacesServiceStatus: { OK: "OK" },
        PlacesService: function () {
          return {
            nearbySearch: jest.fn((request, cb) =>
              cb([], "OK", { hasNextPage: false })
            ),
            getDetails: jest.fn((req, cb) =>
              cb(null, "NOT_FOUND") // no-op details
            ),
          };
        },
      },
    },
  };
});

// ---- TESTS ----

describe("Mapspage", () => {
  test("shows loading state while Google Maps is not loaded", () => {
    useGoogleMapsLoader.mockReturnValue({
      isLoaded: false,
      loadError: null,
    });

    render(<Mapspage />);

    expect(
      screen.getByText("Loading Google Maps…")
    ).toBeInTheDocument();
  });

  test("renders map and basic UI when Google Maps is loaded", () => {
    useGoogleMapsLoader.mockReturnValue({
      isLoaded: true,
      loadError: null,
    });

    render(<Mapspage />);

    // mocked map container
    expect(screen.getByTestId("google-map")).toBeInTheDocument();

    // sidebar heading
    expect(screen.getByText("Restaurants")).toBeInTheDocument();

    // search bar bits
    expect(screen.getByText("Find")).toBeInTheDocument();
    expect(screen.getByText("Near")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("tacos, sushi, boba…")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Los Angeles, CA")
    ).toBeInTheDocument();
  });

  test("submitting the search form calls Google Geocoder with the city text", () => {
    useGoogleMapsLoader.mockReturnValue({
      isLoaded: true,
      loadError: null,
    });

    render(<Mapspage />);

    const nearInput = screen.getByPlaceholderText("Los Angeles, CA");
    const form = nearInput.closest("form");

    // user types a city and submits
    fireEvent.change(nearInput, { target: { value: "Los Angeles" } });
    fireEvent.submit(form);

    expect(geocodeMock).toHaveBeenCalledWith(
      { address: "Los Angeles" },
      expect.any(Function)
    );
  });

  test('clicking "Search this area" button is rendered and clickable', () => {
    useGoogleMapsLoader.mockReturnValue({
      isLoaded: true,
      loadError: null,
    });

    render(<Mapspage />);

    const button = screen.getByRole("button", { name: /Search this area/i });
    expect(button).toBeInTheDocument();

    // clicking shouldn't throw; side-effects are handled by mocks
    fireEvent.click(button);
  });
});
