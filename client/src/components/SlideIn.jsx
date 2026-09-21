import React from "react";

const SlideIn = ({ x, y, duration = 250, delay = 0, children }) => (
  <div
    className="slide-in"
    style={{
      "--slide-x": `${x}px`,
      "--slide-y": `${y}px`,
      "--slide-duration": `${duration}ms`,
      "--slide-delay": `${delay}ms`
    }}
  >
    {children}
  </div>
);

export default SlideIn;
