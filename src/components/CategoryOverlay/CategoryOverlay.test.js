// src/components/CategoryOverlay.test.js
import React from "react";
import {
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import CategoryOverlay from "./CategoryOverlay";

const sampleOptions = [
  { id: "1", label: "Art", emoji: "🎨" },
  { id: "2", label: "Games", emoji: "🎮" },
  { id: "3", label: "Music", emoji: "🎵" },
];

describe("CategoryOverlay", () => {
  test("returns null (renders nothing) when open is false", () => {
    render(
      <CategoryOverlay
        open={false}
        options={sampleOptions}
        selected={[]}
        onToggle={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // Title shouldn't appear because overlay is closed
    expect(
      screen.queryByText(/choose categories/i)
    ).not.toBeInTheDocument();
  });

  test("renders title, subtitle, and options when open is true", () => {
    render(
      <CategoryOverlay
        open={true}
        title="Pick categories"
        subtitle="Choose at least one"
        options={sampleOptions}
        selected={[]}
        onToggle={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // Title and subtitle
    expect(
      screen.getByText(/pick categories/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/choose at least one/i)
    ).toBeInTheDocument();

    // Each option label should appear
    expect(screen.getByText(/🎨 Art/)).toBeInTheDocument();
    expect(screen.getByText(/🎮 Games/)).toBeInTheDocument();
    expect(screen.getByText(/🎵 Music/)).toBeInTheDocument();
  });

  test("calls onToggle with label when an option is clicked", () => {
    const onToggle = jest.fn();

    render(
      <CategoryOverlay
        open={true}
        options={sampleOptions}
        selected={[]}
        onToggle={onToggle}
        onClose={jest.fn()}
      />
    );

    const artButton = screen.getByRole("button", {
      name: /🎨 Art/i,
    });

    fireEvent.click(artButton);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("Art");
  });

  test("marks selected options with selected class and aria-pressed", () => {
    const selected = ["Games"];

    const { container } = render(
      <CategoryOverlay
        open={true}
        options={sampleOptions}
        selected={selected}
        onToggle={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const gamesButton = screen.getByRole("button", {
      name: /🎮 Games/i,
    });

    expect(gamesButton).toHaveClass("pill", "selected");
    expect(gamesButton).toHaveAttribute("aria-pressed", "true");

    // The little check mark span should have "show" when selected
    const checkSpan =
      gamesButton.querySelector(".check");
    expect(checkSpan).toHaveClass("show");

    // A non-selected option should not have selected styles
    const artButton = screen.getByRole("button", {
      name: /🎨 Art/i,
    });
    expect(artButton).not.toHaveClass("selected");
    expect(artButton).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  test("clicking backdrop calls onClose, clicking inside panel does not", () => {
    const onClose = jest.fn();

    const { container } = render(
      <CategoryOverlay
        open={true}
        options={sampleOptions}
        selected={[]}
        onToggle={jest.fn()}
        onClose={onClose}
      />
    );

    const backdrop = container.querySelector(
      ".cat-overlay-backdrop"
    );
    const panel = container.querySelector(
      ".cat-overlay-panel"
    );

    // Click outside (backdrop) -> should close
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Click inside the panel -> stopPropagation should prevent onClose
    fireEvent.click(panel);
    expect(onClose).toHaveBeenCalledTimes(1); // no extra calls
  });

  test("clicking Cancel calls onClose", () => {
    const onClose = jest.fn();

    render(
      <CategoryOverlay
        open={true}
        options={sampleOptions}
        selected={[]}
        onToggle={jest.fn()}
        onClose={onClose}
      />
    );

    const cancelButton = screen.getByRole("button", {
      name: /cancel/i,
    });

    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking Done calls onConfirm if provided", () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    render(
      <CategoryOverlay
        open={true}
        options={sampleOptions}
        selected={["Art"]}
        onToggle={jest.fn()}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const doneButton = screen.getByRole("button", {
      name: /done/i,
    });

    fireEvent.click(doneButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("clicking Done falls back to onClose when onConfirm is not provided", () => {
    const onClose = jest.fn();

    render(
      <CategoryOverlay
        open={true}
        options={sampleOptions}
        selected={["Art"]}
        onToggle={jest.fn()}
        onClose={onClose}
      />
    );

    const doneButton = screen.getByRole("button", {
      name: /done/i,
    });

    fireEvent.click(doneButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
