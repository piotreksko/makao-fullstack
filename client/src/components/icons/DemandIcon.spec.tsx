import { render, screen } from "@testing-library/react";
import DemandIcon from "./DemandIcon";

describe("DemandIcon", () => {
  it("renders nothing without an active jack", () => {
    const { container } = render(<DemandIcon jackActive={false} chosenType="8" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the game is over", () => {
    const { container } = render(<DemandIcon jackActive gameOver chosenType="8" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the demanded card", () => {
    render(<DemandIcon jackActive chosenType="8" />);

    expect(screen.getByText("8")).toHaveClass("orange-icon");
  });

  it("shows Q for a queen", () => {
    render(<DemandIcon jackActive chosenType="queen" />);

    expect(screen.getByText("Q")).toHaveClass("orange-icon");
  });

  it("is shown as a modal-style icon", () => {
    const { container } = render(<DemandIcon jackActive chosenType="8" />);

    expect(container.querySelector(".info-icon")).toHaveClass("modal-shown");
  });
});
