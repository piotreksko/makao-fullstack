import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RulesButton from "./RulesButton";

describe("RulesButton", () => {
  it("renders a button with an icon", () => {
    render(<RulesButton onClick={vi.fn()} />);

    const button = screen.getByRole("button");
    expect(button.querySelector("img")).toHaveAttribute("src", expect.stringContaining("rules_button"));
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<RulesButton onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
