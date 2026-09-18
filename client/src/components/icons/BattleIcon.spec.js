import React from "react";
import { shallow } from "enzyme";
import BattleIcon from "./BattleIcon";

describe("BattleIcon", () => {
  let props;
  let wrapper;
  const component = () => {
    if (!wrapper) {
      wrapper = shallow(<BattleIcon {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      battleCards: undefined
    };
    wrapper = undefined;
  });

  it("does not render a div", () => {
    const div = component().find("div");
    expect(div.length).toBe(0);
  });

  describe("renders", () => {
    beforeEach(() => {
      props.battleCards = 3;
    });

    it("renders 2 divs", () => {
      const div = component().find("div");
      expect(div.length).toBe(2);
    });

    it("shows battle cards number", () => {
      const div = component().find("div.red-icon");
      expect(div.text()).toEqual("2");
    });

    it('has a "modal-shown" class', () => {
      const div = component().find('div.info-icon');
      expect(div.hasClass('modal-shown'));
    })
  });
});
