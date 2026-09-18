import React from "react";
import { shallow } from "enzyme";
import RulesButton from "./RestartButton";

describe("RulesButton", () => {
  const mockFn = jest.fn();
  let props = {
    onClick: mockFn
  };
  let wrapper = shallow(<RulesButton {...props} />);

  it("renders correctly", () => {
    expect(wrapper.find("button"));
  });

  it("calls function on click", () => {
    wrapper.find("button").simulate("click");
    expect(mockFn).toBeCalled();
  });
});
