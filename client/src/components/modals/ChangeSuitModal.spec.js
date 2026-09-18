import React from "react";
import { shallow } from "enzyme";
import ChangeSuitModal from "./ChangeSuitModal";
import { cardSuits } from '../../constants/constants';

describe("change suit modal", () => {
  let props;
  let wrapper;
  const mockFn = jest.fn();
  const modal = () => {
    if (!wrapper) {
      wrapper = shallow(<ChangeSuitModal {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      changeSuit: mockFn
    };
    wrapper = undefined;
  });

  it("renders a div", () => {
    const div = modal().find("div");
    expect(div.length).toBeGreaterThan(0);
  });

  it("should call a function when clicked", () => {
    cardSuits.forEach((suit, idx) => {
      const ModalButton = modal()
        .find("ModalButton")
        .at(idx);
      ModalButton.simulate("click");
      expect(mockFn).toHaveBeenCalledWith(suit);
    });
  });
});
