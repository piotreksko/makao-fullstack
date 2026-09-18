import React from "react";
import { shallow } from "enzyme";
import WaitIcon from "./WaitIcon";

describe("WaitIcon", () => {
  let props;
  let wrapper;
  const component = () => {
    if (!wrapper) {
      wrapper = shallow(<WaitIcon {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      gameOver: false,
      waitTurn: 3
    };
    wrapper = undefined;
  });

  it("does not render when game is over", () => {
    props.gameOver = true;
    const div = component().find("div");
    expect(div.length).toBe(0);
  });

  it("renders two div", () => {
    const div = component().find("div");
    expect(div.length).toBe(2);
  });

  it('has a "modal-shown" class', () => {
    const div = component().find("div.blue-icon");
    expect(div.hasClass("modal-shown"));
  });

  it("shows the amount of turns to wait", () => {
    const div = component().find("div.blue-icon");
    expect(div.text()).toEqual("3");
  });
});
