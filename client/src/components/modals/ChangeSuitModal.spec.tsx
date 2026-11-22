import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangeSuitModal from "./ChangeSuitModal";
import { cardSuits } from "../../constants/constants";

describe("ChangeSuitModal", () => {
  it("asks to pick a suit", () => {
    render(<ChangeSuitModal changeSuit={vi.fn()} />);

    expect(screen.getByText("Pick card suit")).toBeInTheDocument();
  });

  it("has one button per suit", () => {
    render(<ChangeSuitModal changeSuit={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(cardSuits.length);
  });

  it("calls changeSuit with the suit of the clicked button", async () => {
    const changeSuit = vi.fn();
    render(<ChangeSuitModal changeSuit={changeSuit} />);
    const buttons = screen.getAllByRole("button");

    for (const [index, suit] of cardSuits.entries()) {
      await userEvent.click(buttons[index]);
      expect(changeSuit).toHaveBeenLastCalledWith(suit);
    }
    expect(changeSuit).toHaveBeenCalledTimes(cardSuits.length);
  });
});
