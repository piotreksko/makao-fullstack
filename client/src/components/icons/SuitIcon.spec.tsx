import { render, screen } from "@testing-library/react";
import SuitIcon from "./SuitIcon";

describe("SuitIcon", () => {
  it("renders nothing when the game is over", () => {
    const { container } = render(<SuitIcon show gameOver chosenWeight="spades" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when not shown", () => {
    const { container } = render(<SuitIcon show={false} chosenWeight="spades" />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each(["spades", "hearts", "diamonds", "clubs"] as const)("shows the %s symbol", suit => {
    render(<SuitIcon show chosenWeight={suit} />);

    expect(screen.getByAltText("Chosen weight symbol")).toHaveAttribute(
      "src",
      expect.stringContaining(`${suit}_symbol`)
    );
  });

  it("is shown as a modal-style icon", () => {
    const { container } = render(<SuitIcon show chosenWeight="spades" />);

    expect(container.querySelector(".info-icon")).toHaveClass("modal-shown");
  });
});
