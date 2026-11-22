import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DemandCardModal from "./DemandCardModal";

// Button label -> value passed to demandCard ("X" means no demand)
const demands: [string, string][] = [
  ["5", "5"],
  ["6", "6"],
  ["7", "7"],
  ["8", "8"],
  ["9", "9"],
  ["10", "10"],
  ["Q", "queen"],
  ["X", ""]
];

describe("DemandCardModal", () => {
  it("has a button for every demandable card", () => {
    render(<DemandCardModal demandCard={vi.fn()} />);

    expect(screen.getAllByRole("button").map(b => b.textContent)).toEqual(
      demands.map(([label]) => label)
    );
  });

  it.each(demands)("button %s demands %j", async (label, value) => {
    const demandCard = vi.fn();
    render(<DemandCardModal demandCard={demandCard} />);

    await userEvent.click(screen.getByRole("button", { name: label }));

    expect(demandCard).toHaveBeenCalledWith(value);
  });
});
