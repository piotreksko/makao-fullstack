import React from "react";
import { shallow } from "enzyme";
import DemandIcon from "./DemandIcon";

describe("BattleIcon", () => {
  const eight = '8';
  const queen = "queen";
  let props;
  let wrapper;
  const component = () => {
    if (!wrapper) {
      wrapper = shallow(<DemandIcon {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      jackActive: undefined,
      gameOver: undefined,
      chosenType: undefined
    };
    wrapper = undefined;
  });

  beforeEach(() => {
    props.jackActive = true;
  });

  it("does not render", () => {
    props.jackActive = false
    const div = component().find("div");
    expect(div.length).toBe(0);
  });

  it("renders 2 divs", () => {
    const div = component().find("div");
    expect(div.length).toBe(2);
  });

  it("shows a chosen type", () => {
    props.chosenType = eight;
    const div = component().find("div.orange-icon");
    expect(div.text()).toEqual(eight);
  });

  it("shows Q when it's a queen", () => {
    props.chosenType = queen;
    const div = component().find("div.orange-icon");
    expect(div.text()).toEqual(queen.charAt(0).toUpperCase());
  });

  it('has a "modal-shown" class', () => {
    const div = component().find("div.info-icon");
    expect(div.hasClass("modal-shown"));
  });
});
