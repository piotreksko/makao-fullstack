import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionButtons from "./ActionButtons";

const baseProps = {
  confirmCards: vi.fn(),
  onKeep: vi.fn(),
  waitTurn: vi.fn(),
  hasSelected: 0,
  isPlayerTurn: false,
  canKeep: false,
  playerCanWait: false
};

describe("ActionButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders only the Play button by default", () => {
    render(<ActionButtons {...baseProps} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  describe("Play button", () => {
    it("looks disabled with nothing selected", () => {
      render(<ActionButtons {...baseProps} isPlayerTurn />);

      expect(screen.getByRole("button", { name: "Play" })).toHaveClass("disabled");
    });

    it("looks disabled when it is not the player's turn", () => {
      render(<ActionButtons {...baseProps} hasSelected={1} />);

      expect(screen.getByRole("button", { name: "Play" })).toHaveClass("disabled");
    });

    it("is enabled with a selection on the player's turn", () => {
      render(<ActionButtons {...baseProps} hasSelected={1} isPlayerTurn />);

      expect(screen.getByRole("button", { name: "Play" })).not.toHaveClass("disabled");
    });

    it("calls confirmCards when clicked", async () => {
      render(<ActionButtons {...baseProps} hasSelected={1} isPlayerTurn />);

      await userEvent.click(screen.getByRole("button", { name: "Play" }));

      expect(baseProps.confirmCards).toHaveBeenCalledTimes(1);
    });
  });

  describe("Wait button", () => {
    it("is hidden unless the player can wait and it is their turn", () => {
      const { rerender } = render(<ActionButtons {...baseProps} playerCanWait />);
      expect(screen.queryByRole("button", { name: "Wait" })).not.toBeInTheDocument();

      rerender(<ActionButtons {...baseProps} isPlayerTurn />);
      expect(screen.queryByRole("button", { name: "Wait" })).not.toBeInTheDocument();
    });

    it("calls waitTurn when clicked", async () => {
      render(<ActionButtons {...baseProps} playerCanWait isPlayerTurn />);

      await userEvent.click(screen.getByRole("button", { name: "Wait" }));

      expect(baseProps.waitTurn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Keep card button", () => {
    it("is hidden unless the player can keep and it is their turn", () => {
      render(<ActionButtons {...baseProps} canKeep />);

      expect(screen.queryByRole("button", { name: "Keep card" })).not.toBeInTheDocument();
    });

    it("calls onKeep when clicked", async () => {
      render(<ActionButtons {...baseProps} canKeep isPlayerTurn />);

      await userEvent.click(screen.getByRole("button", { name: "Keep card" }));

      expect(baseProps.onKeep).toHaveBeenCalledTimes(1);
    });
  });
});
