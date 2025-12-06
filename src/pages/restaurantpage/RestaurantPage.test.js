// src/pages/restaurantpage/RestaurantPage.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import RestaurantPage from "./RestaurantPage";
import { useParams } from "react-router-dom";
import { useGoogleMapsLoader } from "../../hooks/UseGoogleMapsLoader";

// ---- Mocks ----

// Mock react-router-dom: we only care about useParams + Link
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useParams: jest.fn(),
    Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  };
});

// Mock the loader hook
jest.mock("../../hooks/UseGoogleMapsLoader", () => ({
  useGoogleMapsLoader: jest.fn(),
}));

let getDetailsMock;

beforeEach(() => {
  jest.clearAllMocks();

  // Default window.google mock (can be overridden in individual tests)
  getDetailsMock = jest.fn();
  global.window.google = {
    maps: {
      places: {
        PlacesServiceStatus: { OK: "OK" },
        PlacesService: jest.fn(() => ({
          getDetails: getDetailsMock,
        })),
      },
    },
  };
});

describe("RestaurantPage", () => {
  test("shows error when placeId is missing", async () => {
    useParams.mockReturnValue({}); // no placeId
    useGoogleMapsLoader.mockReturnValue({ isLoaded: false, loadError: null });

    render(<RestaurantPage />);

    expect(
      await screen.findByText(/missing placeid in route\./i)
    ).toBeInTheDocument();
  });

  test("shows error when Google Maps script fails to load", async () => {
    useParams.mockReturnValue({ placeId: "abc123" });
    useGoogleMapsLoader.mockReturnValue({
      isLoaded: false,
      loadError: new Error("boom"),
    });

    render(<RestaurantPage />);

    expect(
      await screen.findByText(/failed to load google maps script\./i)
    ).toBeInTheDocument();
  });

  test("shows skeleton while loading and no error", () => {
    useParams.mockReturnValue({ placeId: "abc123" });
    useGoogleMapsLoader.mockReturnValue({
      isLoaded: false,
      loadError: null,
    });

    render(<RestaurantPage />);

    // Skeleton container is rendered when !place && !error
    expect(screen.getByText("← Back to Map")).toBeInTheDocument();
    // One of the skeleton blocks
    expect(document.querySelector(".rp-skeleton")).toBeInTheDocument();
  });

  test("fetches place details and renders them on success", async () => {
    useParams.mockReturnValue({ placeId: "abc123" });
    useGoogleMapsLoader.mockReturnValue({
      isLoaded: true,
      loadError: null,
    });

    const fakePlace = {
      name: "Test Restaurant",
      formatted_address: "123 Test St, Testville",
      rating: 4.5,
      user_ratings_total: 123,
      photos: [
        {
          getUrl: jest.fn(() => "https://example.com/photo.jpg"),
        },
      ],
      opening_hours: {
        weekday_text: ["Mon: 9:00 AM – 5:00 PM"],
        isOpen: jest.fn(() => true),
      },
      website: "https://test-restaurant.example.com",
    };

    // When getDetails is called, immediately invoke the callback with success
    getDetailsMock.mockImplementation((req, callback) => {
      callback(fakePlace, window.google.maps.places.PlacesServiceStatus.OK);
    });

    render(<RestaurantPage />);

    // Ensure we called PlacesService.getDetails
    await waitFor(() => {
      expect(getDetailsMock).toHaveBeenCalled();
    });

    // Name, address, rating
    expect(
      screen.getByRole("heading", { name: /test restaurant/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/123 test st, testville/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/⭐ 4\.5/i)).toBeInTheDocument();
    expect(screen.getByText(/\(123\)/)).toBeInTheDocument();

    // Hours
    expect(screen.getByText(/mon: 9:00 am – 5:00 pm/i)).toBeInTheDocument();
    expect(screen.getByText(/open now/i)).toBeInTheDocument();

    // Photo img element
    const img = screen.getByRole("img", { name: /test restaurant/i });
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");

    // Links
    const mapsLink = screen.getByRole("link", {
      name: /open in google maps/i,
    });
    expect(mapsLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/place/?q=place_id:abc123"
    );

    const websiteLink = screen.getByRole("link", { name: /website/i });
    expect(websiteLink).toHaveAttribute(
      "href",
      "https://test-restaurant.example.com"
    );
  });

  test("shows failure message when PlacesService returns error", async () => {
    useParams.mockReturnValue({ placeId: "abc123" });
    useGoogleMapsLoader.mockReturnValue({
      isLoaded: true,
      loadError: null,
    });

    getDetailsMock.mockImplementation((req, callback) => {
      callback(null, "ZERO_RESULTS");
    });

    render(<RestaurantPage />);

    await waitFor(() => {
      expect(getDetailsMock).toHaveBeenCalled();
    });

    expect(
      screen.getByText(
        /could not load details for id: abc123 \(status: ZERO_RESULTS\)/i
      )
    ).toBeInTheDocument();
  });
});
