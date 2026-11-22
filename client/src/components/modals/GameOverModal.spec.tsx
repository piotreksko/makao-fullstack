import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameOverModal from "./GameOverModal";

describe("GameOverModal", () => {
  it("is hidden unless shown", () => {
    const { container } = render(
      <GameOverModal show={false} playerWon={false} restartGame={vi.fn()} />
    );

    expect(container.firstElementChild).toHaveClass("modal-hidden");
    expect(container.firstElementChild).not.toHaveClass("modal-shown");
  });

  it("is shown when show is true", () => {
    const { container } = render(<GameOverModal show playerWon={false} restartGame={vi.fn()} />);

    expect(container.firstElementChild).toHaveClass("modal-shown");
  });

  it("announces a victory", () => {
    render(<GameOverModal show playerWon restartGame={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Victory" })).toBeInTheDocument();
    expect(screen.getByText("You have won")).toBeInTheDocument();
  });

  it("announces a defeat", () => {
    render(<GameOverModal show playerWon={false} restartGame={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Defeat" })).toBeInTheDocument();
    expect(screen.getByText("You have lost")).toBeInTheDocument();
  });

  it("calls restartGame when the button is clicked", async () => {
    const restartGame = vi.fn();
    render(<GameOverModal show playerWon restartGame={restartGame} />);

    await userEvent.click(screen.getByRole("button"));

    expect(restartGame).toHaveBeenCalledTimes(1);
  });
});
