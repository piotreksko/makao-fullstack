import React from "react";
import { shallow } from "enzyme";
import GameOverModal from "./GameOverModal";

describe("game over modal", () => {
  let props;
  let wrapper;
  const mockFn = jest.fn();
  const modal = () => {
    if (!wrapper) {
      wrapper = shallow(<GameOverModal {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      show: undefined,
      playerWon: undefined,
      restartGame: undefined
    };
    wrapper = undefined;
  });

  //   it("renders", () => {
  //     const div = modal().find("div");
  //     expect(div.length).toEqual(0);
  //   });

  it("is hidden", () => {
    const div = modal().find("div.modal-hidden");
    expect(div.length).toEqual(1);
  });

  describe("when is shown", () => {
    beforeEach(() => {
      props.show = true;
    });

    it("is shown", () => {
        const div = modal().find("div");
        expect(div.hasClass('modal-shown')).toBe(true);
      });
  
    it("says victory", () => {
      props.playerWon = true;
      const div = modal().find("h2");
      expect(div.text()).toEqual("Victory");
    });

    it("says 'Computer has won'", () => {
      const div = modal().find("h4");
      expect(div.text()).toEqual("Computer has won");
    });

    it("should call a function when buttons is clicked", () => {
      props.restartGame = mockFn;
      const ModalButton = modal().find("ModalButton");
      ModalButton.simulate("click");
      expect(mockFn).toHaveBeenCalled();
    });
  });
});
