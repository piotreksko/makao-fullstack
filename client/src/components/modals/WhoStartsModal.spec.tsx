import { render, screen } from "@testing-library/react";
import WhoStartsModal from "./WhoStartsModal";

describe("WhoStartsModal", () => {
  it("is hidden unless shown", () => {
    const { container } = render(
      <WhoStartsModal show={false} playerStarts={false} startingSeat={null} />
    );

    expect(container.firstElementChild).toHaveClass("modal-hidden");
  });

  it("is shown when show is true", () => {
    const { container } = render(<WhoStartsModal show playerStarts startingSeat={null} />);

    expect(container.firstElementChild).toHaveClass("modal-shown");
  });

  it("says when the player goes first", () => {
    render(<WhoStartsModal show playerStarts startingSeat={null} />);

    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("You go first");
  });

  it("says which seat goes first otherwise", () => {
    render(<WhoStartsModal show playerStarts={false} startingSeat={3} />);

    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("Seat 3 goes first");
  });
});
