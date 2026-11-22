import { render, screen } from "@testing-library/react";
import WaitIcon from "./WaitIcon";

describe("WaitIcon", () => {
  it("renders nothing when the game is over", () => {
    const { container } = render(<WaitIcon waitTurn={3} gameOver />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no wait to show", () => {
    const { container } = render(<WaitIcon waitTurn={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the number of turns to wait", () => {
    render(<WaitIcon waitTurn={3} />);

    expect(screen.getByText("3")).toHaveClass("blue-icon");
  });

  it("is shown as a modal-style icon", () => {
    const { container } = render(<WaitIcon waitTurn={3} />);

    expect(container.querySelector(".info-icon")).toHaveClass("modal-shown");
  });
});
