import React from "react";
import { shallow } from "enzyme";
import MacaoModal from "./MacaoModal";

describe("game over modal", () => {
  let props;
  let wrapper;
  const playerMacao = "You: Macao!";
  const otherSeatMacao = "Seat 2: Macao!";
  const mockFn = jest.fn();
  const modal = () => {
    if (!wrapper) {
      wrapper = shallow(<MacaoModal {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      show: undefined,
      playerMacao: undefined,
      otherSeatMacao: undefined
    };
    wrapper = undefined;
  });

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
      expect(div.hasClass("modal-shown")).toBe(true);
    });

    it(`says ${playerMacao}`, () => {
      props.playerMacao = true;
      const div = modal().find("h4");
      expect(div.text()).toEqual(playerMacao);
    });

    it(`says ${otherSeatMacao}`, () => {
      props.otherSeatMacao = 2;
      const div = modal().find("h4");
      expect(div.text()).toEqual(otherSeatMacao);
    });
  });
});
