// src/components/Modal.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Modal from "./Modal";

describe("Modal", () => {
  test("renders nothing when open is false", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    // Should render null: no backdrop, no content
    expect(container.firstChild).toBeNull();
  });

  test("renders children when open is true", () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.getByText("Modal content")).toBeInTheDocument();
    // Backdrop and panel elements exist
    const backdrop = document.querySelector(".modal-backdrop");
    const panel = document.querySelector(".modal-panel");
    expect(backdrop).toBeInTheDocument();
    expect(panel).toBeInTheDocument();
  });

  test("clicking the close button calls onClose", () => {
    const onClose = jest.fn();

    render(
      <Modal open={true} onClose={onClose}>
        <div>Modal content</div>
      </Modal>
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking on the backdrop calls onClose", () => {
    const onClose = jest.fn();

    const { container } = render(
      <Modal open={true} onClose={onClose}>
        <div>Modal content</div>
      </Modal>
    );

    const backdrop = container.querySelector(".modal-backdrop");
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking inside the modal panel does not call onClose", () => {
    const onClose = jest.fn();

    const { container } = render(
      <Modal open={true} onClose={onClose}>
        <div>Modal content</div>
      </Modal>
    );

    const panel = container.querySelector(".modal-panel");
    fireEvent.click(panel);

    expect(onClose).not.toHaveBeenCalled();
  });
});
