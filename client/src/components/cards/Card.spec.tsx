import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card, { type PileCard } from "./Card";

const makeCard = (): PileCard => ({ suit: "spades", rank: "ace" }) as PileCard;

const renderCard = (props: Partial<React.ComponentProps<typeof Card>> = {}) => {
  const { container } = render(<Card card={makeCard()} index={3} {...props} />);
  return container.firstElementChild as HTMLElement;
};

describe("Card", () => {
  it("renders the card face as a background image", () => {
    const card = renderCard();

    expect(card).toHaveClass("card");
    expect(card.style.backgroundImage).toContain("ace_of_spades.png");
  });

  it("adds the given classes", () => {
    const card = renderCard({ cardClass: "topCard selected" });

    expect(card).toHaveClass("card", "topCard", "selected");
  });

  describe("on the pile", () => {
    it("is positioned absolutely", () => {
      const card = renderCard({ fromPile: true });

      expect(card.style.position).toBe("absolute");
    });

    it("applies the stack offset as a transform", () => {
      const card = renderCard({
        fromPile: true,
        card: { ...makeCard(), transform: { rotate: 9, x: 7, y: -3 } }
      });

      expect(card.style.transform).toBe("rotate(9deg) translate(7px, -3px)");
    });

    it("has no transform without an offset", () => {
      const card = renderCard({ fromPile: true });

      expect(card.style.transform).toBe("");
    });
  });

  it("outside the pile it is not positioned", () => {
    expect(renderCard().style.position).toBe("");
  });

  describe("click", () => {
    it("does nothing without a handler", async () => {
      const card = renderCard();

      await userEvent.click(card);

      expect(card).toBeInTheDocument();
    });

    it("calls clickOwnCard with the card and its index", async () => {
      const clickOwnCard = vi.fn();
      const cardData = makeCard();
      const card = renderCard({ card: cardData, clickOwnCard });

      await userEvent.click(card);

      expect(clickOwnCard).toHaveBeenCalledWith(cardData, 3);
    });
  });
});
