import React from "react";
import { shallow } from "enzyme";
import WhoStartsModal from "./WhoStartsModal";

describe("game over modal", () => {
  let props;
  let wrapper;
  const playerStartsText = 'You go first';

  const modal = () => {
    if (!wrapper) {
      wrapper = shallow(<WhoStartsModal {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      show: undefined,
      playerStarts: undefined
    };
    wrapper = undefined;
  });

  it("is hidden", () => {
    const div = modal().find("div.modal-hidden");
    expect(div.length).toEqual(1);
  });

  it("is shown", () => {
    props.show = true;
    const div = modal().find("div.modal-shown");
    expect(div.length).toEqual(1);
  });
    
  it(`says ${playerStartsText}`, () => {
    props.playerStarts = true;
    const div = modal().find("h4");
    expect(div.text()).toEqual(playerStartsText);
  });
});
