import React from "react";
import { shallow } from "enzyme";
import RulesModal from "./RulesModal";

describe("rules modal", () => {
  let props;
  let wrapper;
  const mockFn = jest.fn();
  const modal = () => {
    if (!wrapper) {
      wrapper = shallow(<RulesModal {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      close: undefined
    };
    wrapper = undefined;
  });

  it("renders a div", () => {
    const div = modal().find("div");
    expect(div.length).toEqual(1);
  });

  it("closes on click", () => {
      props.close = mockFn;
    const i = modal().find("i");
    i.simulate('click');
    expect(mockFn).toBeCalled();
  });
});
