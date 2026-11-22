import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalButton from "./ModalButton";

describe("ModalButton", () => {
  it("shows its text", () => {
    render(<ModalButton text="Q" />);

    expect(screen.getByRole("button", { name: "Q" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<ModalButton text="5" onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses the named image as its background", () => {
    render(<ModalButton image="restart_button" />);

    expect(screen.getByRole("button").style.backgroundImage).toContain("restart_button.png");
  });

  it("has no background image without one", () => {
    render(<ModalButton text="x" />);

    expect(screen.getByRole("button").style.backgroundImage).toBe("");
  });
});
