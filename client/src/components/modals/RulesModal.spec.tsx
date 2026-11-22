import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RulesModal from "./RulesModal";

describe("RulesModal", () => {
  it("shows the rules sections", () => {
    render(<RulesModal close={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Gameplay" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Action cards" })).toBeInTheDocument();
  });

  it("calls close when the x is clicked", async () => {
    const close = vi.fn();
    render(<RulesModal close={close} />);

    await userEvent.click(screen.getByText("x"));

    expect(close).toHaveBeenCalledTimes(1);
  });
});
