import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CardBack from "./CardBack";

const renderBack = (props: React.ComponentProps<typeof CardBack> = {}) => {
  const { container } = render(<CardBack {...props} />);
  return container.firstElementChild as HTMLElement;
};

describe("CardBack", () => {
  it("is a card in hand by default", () => {
    const card = renderBack();

    expect(card).toHaveClass("card", "cardsInHand");
    expect(card).not.toHaveClass("deckPossible");
  });

  it("a deck card is not a card in hand", () => {
    expect(renderBack({ deckCard: true })).not.toHaveClass("cardsInHand");
  });

  describe("deckPossible highlight", () => {
    it("applies when highlighted, movable and in the deck", () => {
      const card = renderBack({ deckCard: true, highlight: true, playerCanMove: true });

      expect(card).toHaveClass("deckPossible");
    });

    it("does not apply to a card that is not in the deck", () => {
      const card = renderBack({ deckCard: false, highlight: true, playerCanMove: true });

      expect(card).not.toHaveClass("deckPossible");
    });

    it("does not apply when the player cannot move", () => {
      const card = renderBack({ deckCard: true, highlight: true, playerCanMove: false });

      expect(card).not.toHaveClass("deckPossible");
    });
  });

  it("stacks deck cards upward by 3px per position", () => {
    const card = renderBack({ deckCard: true, number: 3 });

    expect(card.style.transform).toBe("translateY(-9px)");
  });

  it("does not shift cards in hand", () => {
    expect(renderBack({ number: 3 }).style.transform).toBe("");
  });

  describe("click", () => {
    it("takes the card when it is a takeable deck card on the player's turn", async () => {
      const takeCard = vi.fn();
      const card = renderBack({ deckCard: true, playerCanMove: true, canBeTaken: true, takeCard });

      await userEvent.click(card);

      expect(takeCard).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["not a deck card", { deckCard: false, playerCanMove: true, canBeTaken: true }],
      ["the player cannot move", { deckCard: true, playerCanMove: false, canBeTaken: true }],
      ["the card cannot be taken", { deckCard: true, playerCanMove: true, canBeTaken: false }]
    ])("does nothing when %s", async (_label, flags) => {
      const takeCard = vi.fn();
      const card = renderBack({ ...flags, takeCard });

      await userEvent.click(card);

      expect(takeCard).not.toHaveBeenCalled();
    });
  });
});
