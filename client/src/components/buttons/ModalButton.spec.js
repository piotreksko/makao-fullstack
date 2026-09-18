import React from "react";
import { shallow } from "enzyme";
import ModalButton from "./ModalButton";

describe("ModalButton", () => {
  const image = 'restart_button';
  let props;
  let wrapper;
  const mockFn = jest.fn();
  const component = () => {
    if (!wrapper) {
      wrapper = shallow(<ModalButton {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      text: undefined,
      image: undefined,
      onClick: undefined
    };
    wrapper = undefined;
  });

  it("renders correctly", () => {
    expect(component().find("button"));
  });

  it("calls a function on click", () => {
    props.onClick = mockFn();
    component()
      .find("button")
      .simulate("click");
    expect(mockFn).toBeCalled();
  });

  it("has backgroundImage", () => {
    props.image = image;
    expect(
      component()
        .find("button")
        .props().style
    ).toHaveProperty("backgroundImage", `url(${image}.png)`);
  });
});
