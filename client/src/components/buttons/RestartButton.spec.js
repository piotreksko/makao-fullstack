import React from "react";
import { shallow } from "enzyme";
import RestartButton from "./RestartButton";

describe("RestartButton", () => {
  const mockFn = jest.fn();
  let props = {
    onClick: mockFn
  };
  let wrapper = shallow(<RestartButton {...props} />);

  it("renders correctly", () => {
    expect(wrapper.find("button"));
  });

  it("calls function on click", () => {
    wrapper.find("button").simulate("click");
    expect(mockFn).toBeCalled();
  });
});
