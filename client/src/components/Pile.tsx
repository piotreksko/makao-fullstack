import CardView from "./cards/Card";
import type { Card } from "../types";
import SlideIn from "./SlideIn";

// A small deterministic "messy stack" look, keyed off each card's position in
// the pile rather than randomly, so it doesn't jitter on re-render
const transformFor = (idx: number) => ({
  rotate: ((idx * 37) % 21) - 10,
  x: ((idx * 53) % 21) - 10,
  y: ((idx * 17) % 21) - 10
});

export default function Pile({ cards }: { cards: Card[] | null }) {
  if (!cards) return null;

  return (
    <div id="pile">
      {cards.map((card, idx) => (
        <SlideIn key={`${card.rank}_${card.suit}_${idx}`} x={-50} y={-150} duration={300} delay={50}>
          <CardView card={{ ...card, transform: transformFor(idx) }} fromPile={true} />
        </SlideIn>
      ))}
    </div>
  );
}

