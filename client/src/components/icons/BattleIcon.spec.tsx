import { render, screen } from "@testing-library/react";
import BattleIcon from "./BattleIcon";

describe("BattleIcon", () => {
  it.each([0, 1])("renders nothing for %i battle cards", battleCards => {
    const { container } = render(<BattleIcon battleCards={battleCards} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the number of cards to pick up (battleCards - 1)", () => {
    render(<BattleIcon battleCards={3} />);

    expect(screen.getByText("2")).toHaveClass("red-icon");
  });

  it("is shown as a modal-style icon", () => {
    const { container } = render(<BattleIcon battleCards={3} />);

    expect(container.querySelector(".info-icon")).toHaveClass("modal-shown");
  });
});
