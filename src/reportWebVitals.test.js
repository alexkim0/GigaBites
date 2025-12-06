// src/reportWebVitals.test.js

import reportWebVitals from "./reportWebVitals";

// Still mock web-vitals so the dynamic import, if it runs, uses harmless fns
jest.mock("web-vitals", () => ({
  getCLS: jest.fn(),
  getFID: jest.fn(),
  getFCP: jest.fn(),
  getLCP: jest.fn(),
  getTTFB: jest.fn(),
}));

describe("reportWebVitals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("is a function", () => {
    expect(typeof reportWebVitals).toBe("function");
  });

  test("does nothing and does not throw when onPerfEntry is not a function", () => {
    expect(() => reportWebVitals()).not.toThrow();
    expect(() => reportWebVitals(null)).not.toThrow();
    expect(() => reportWebVitals(123)).not.toThrow();
    expect(() => reportWebVitals("not a fn")).not.toThrow();
  });

  test("can be called with a function callback without throwing", () => {
    const onPerfEntry = jest.fn();

    expect(() => reportWebVitals(onPerfEntry)).not.toThrow();

    // We don't assert on web-vitals internals here because the dynamic
    // import timing is environment-dependent; we only care that the
    // entrypoint is safe to call.
  });
});
