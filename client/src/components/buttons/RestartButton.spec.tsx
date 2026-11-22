import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RestartButton from "./RestartButton";

describe("RestartButton", () => {
  it("renders a button with an icon", () => {
    render(<RestartButton onClick={vi.fn()} />);

    const button = screen.getByRole("button");
    expect(button.querySelector("img")).toHaveAttribute("src", expect.stringContaining("restart_button"));
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<RestartButton onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
