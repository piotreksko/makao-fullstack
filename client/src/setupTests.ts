import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement HTMLImageElement.decode(), which Card.tsx calls at
// import time to preload the card faces.
if (!HTMLImageElement.prototype.decode) {
  HTMLImageElement.prototype.decode = () => Promise.resolve();
}
