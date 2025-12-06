/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { Createpage } from "./Createpage";

import { CreatePostWithUpload } from "../../hooks/CreatePostWithUpload";
import { useGoogleMapsLoader } from "../../hooks/UseGoogleMapsLoader";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// ---- Mocks ----
jest.mock("../../components/DivButton", () => (props) => (
  <button {...props}>{props.children}</button>
));

jest.mock("../../components/CategoryOverlay/CategoryOverlay", () => (props) =>
  props.open ? <div data-testid="category-overlay" /> : null
);

jest.mock("@react-google-maps/api", () => ({
  GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="marker" />,
  useJsApiLoader: jest.fn(() => ({ isLoaded: true, loadError: null })),
}));

jest.mock("../../hooks/CreatePostWithUpload", () => ({
  CreatePostWithUpload: jest.fn(),
}));

jest.mock("../../hooks/UseGoogleMapsLoader", () => ({
  useGoogleMapsLoader: jest.fn(() => ({ isLoaded: false, loadError: null })),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("react-hot-toast", () => {
  return { success: jest.fn(), error: jest.fn() };
});

describe("Createpage", () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();

    // restore hook implementation that clearAllMocks wiped
    useGoogleMapsLoader.mockReturnValue({ isLoaded: false, loadError: null });

    // fake URL.createObjectURL for previews
    global.URL.createObjectURL = jest.fn(() => "blob:preview-url");
    global.URL.revokeObjectURL = jest.fn();

    navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
  });

  test("shows error when non image/video file is selected", () => {
    render(<Createpage />);

    const fileInput = document.querySelector('input[type="file"]');
    const badFile = new File(["dummy"], "file.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(
      screen.getByText(/please select a video file/i)
    ).toBeInTheDocument();
  });

  test("selecting an image file shows preview and allows upload", async () => {
    render(<Createpage />);

    const fileInput = document.querySelector('input[type="file"]');
    const imgFile = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });

    CreatePostWithUpload.mockResolvedValue({
      downloadURL: "https://example.com/photo.jpg",
    });

    fireEvent.change(fileInput, { target: { files: [imgFile] } });

    // wait for preview <img> to appear
    const previewImg = await waitFor(() => document.querySelector("img"));
    expect(previewImg).toBeTruthy();

    // caption
    const captionBox = screen.getByPlaceholderText(/write a caption/i);
    fireEvent.change(captionBox, { target: { value: "Yummy food" } });

    // click Post
    fireEvent.click(screen.getByText("Post"));

    await waitFor(() => {
      expect(CreatePostWithUpload).toHaveBeenCalled();
    });

    const [passedFile, options] = CreatePostWithUpload.mock.calls[0];
    expect(passedFile).toBe(imgFile);

    expect(options).toMatchObject({
      caption: "Yummy food",
      post_categories: [],
      restaurant: null,
    });

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/feed")
    );

    expect(toast.success).toHaveBeenCalledWith("Post uploaded!");
  });
});
