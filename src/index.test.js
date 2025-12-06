// src/index.test.js
import React from "react";

// ---- Mocks ----

// Mock react-dom/client so we can inspect createRoot + render
jest.mock("react-dom/client", () => {
  const render = jest.fn();
  const createRoot = jest.fn(() => ({ render }));

  return {
    __esModule: true,
    default: { createRoot },
  };
});

// Mock reportWebVitals
jest.mock("./reportWebVitals", () => jest.fn());

describe("index.js bootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
    jest.resetModules(); // so requiring ./index re-runs module code each test
  });

  test("creates a React root and renders once", () => {
    // Require AFTER mocks & DOM are set up
    const ReactDOM = require("react-dom/client").default;

    require("./index"); // runs the real entry file

    const rootElement = document.getElementById("root");
    expect(ReactDOM.createRoot).toHaveBeenCalledTimes(1);
    expect(ReactDOM.createRoot).toHaveBeenCalledWith(rootElement);

    // Get the render mock returned from createRoot()
    const renderMock = ReactDOM.createRoot.mock.results[0].value.render;
    expect(renderMock).toHaveBeenCalledTimes(1);

    // Optionally: check that what we rendered is wrapped in StrictMode
    const renderedTree = renderMock.mock.calls[0][0];
    expect(renderedTree.type).toBe(React.StrictMode);
  });

  test("calls reportWebVitals", () => {
    const reportWebVitals = require("./reportWebVitals");

    require("./index");

    expect(reportWebVitals).toHaveBeenCalledTimes(1);
  });
});
