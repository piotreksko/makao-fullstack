import { render, screen } from "@testing-library/react";
import MacaoModal from "./MacaoModal";

describe("MacaoModal", () => {
  it("is hidden unless shown", () => {
    const { container } = render(
      <MacaoModal show={false} playerMacao={false} otherSeatMacao={null} />
    );

    expect(container.firstElementChild).toHaveClass("modal-hidden");
  });

  it("is shown when show is true", () => {
    const { container } = render(<MacaoModal show playerMacao={false} otherSeatMacao={null} />);

    expect(container.firstElementChild).toHaveClass("modal-shown");
  });

  it("says the player called Macao", () => {
    render(<MacaoModal show playerMacao otherSeatMacao={null} />);

    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("You: Macao!");
  });

  it("says which other seat called Macao", () => {
    render(<MacaoModal show playerMacao={false} otherSeatMacao={2} />);

    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("Seat 2: Macao!");
  });

  it("shows no message when nobody called Macao", () => {
    render(<MacaoModal show playerMacao={false} otherSeatMacao={null} />);

    expect(screen.getByRole("heading", { level: 4 }).textContent).toBe("");
  });
});
