import React from "react";
import { mount } from "enzyme";
import DemandCardModal from "./DemandCardModal";

describe("demand card modal", () => {
  let props;
  let wrapper;
  const cardsToDemand = ["5", "6", "7", "8", "9", "10", "queen", ""];
  const mockFn = jest.fn();
  const modal = () => {
    if (!wrapper) {
      wrapper = mount(<DemandCardModal {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      demandCard: mockFn
    };
    wrapper = undefined;
  });

  it("renders a div", () => {
    const div = modal().find("div");
    expect(div.length).toBeGreaterThan(0);
  });

  it("should call a function when clicked", () => {
    cardsToDemand.forEach((card, idx) => {
      const ModalButton = modal()
        .find("ModalButton")
        .at(idx);
      ModalButton.simulate("click");
      expect(mockFn).toHaveBeenCalledWith(card);
    });
  });
});
