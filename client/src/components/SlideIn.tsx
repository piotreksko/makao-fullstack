import type { CSSProperties, ReactNode } from "react";


interface SlideInProps {
  x: number;
  y: number;
  duration?: number;
  delay?: number;
  children?: ReactNode;
}

const SlideIn = ({ x, y, duration = 250, delay = 0, children }: SlideInProps) => (
  <div
    className="slide-in"
    style={{
      "--slide-x": `${x}px`,
      "--slide-y": `${y}px`,
      "--slide-duration": `${duration}ms`,
      "--slide-delay": `${delay}ms`
    } as CSSProperties}
  >
    {children}
  </div>
);

export default SlideIn;
