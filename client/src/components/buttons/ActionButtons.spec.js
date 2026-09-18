import React from "react";
import { shallow } from "enzyme";
import ActionButtons from "./ActionButtons";

describe("action buttons", () => {
  let props;
  let wrapper;
  const mockFn = jest.fn();
  const actionButtons = () => {
    if (!wrapper) {
      wrapper = shallow(<ActionButtons {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      confirmCards: undefined,
      hasSelected: undefined,
      isPlayerTurn: undefined,
      waitTurn: undefined,
      playerCanWait: undefined,
      firstCardChecked: undefined
    };
    wrapper = undefined;
  });

  it("always renders a div", () => {
    const div = actionButtons().find("div");
    expect(div.length).toBeGreaterThan(0);
  });

  it("renders one button initially", () => {
    const buttons = actionButtons().find("button");
    expect(buttons.length).toBe(1);
  });

  describe("End turn button", () => {
    const button = actionButtons()
      .find("button")
      .at(0);

    it("always renders 'End turn' button", () => {
      expect(button);
    });

    it("disabled 'End turn' button", () => {
      expect(
        actionButtons()
          .find("button")
          .hasClass("disabled")
      ).toBe(true);
    });

    describe("enables 'End turn' button", () => {
      beforeEach(() => {
        props.hasSelected = 1;
        props.isPlayer = true;
        props.firstCardChecked = true;
      });

      it("enables 'End turn' button", () => {
        expect(
          actionButtons()
            .find("button")
            .hasClass("disabled")
        ).toBe(false);
      });

      it("should call a function when clicked", () => {
        props.confirmCards = mockFn;

        // For some reason simulate did not work on button without hostNodes() like this
        const button2 = actionButtons()
          .find("button")
          .hostNodes()
          .at(0);
        button2.simulate("click");
        expect(mockFn).toBeCalled();
      });
    });
  });

  describe("Wait button", () => {
    const button = actionButtons()
      .find("button")
      .at(1);

    beforeEach(() => {
      props.playerCanWait = true;
      props.isPlayerTurn = true;
    });

    it("renders 'Wait' button", () => {
      expect(button);
    });

    it("should call a function when clicked", () => {
      props.waitTurn = mockFn;

      // For some reason simulate did not work on button without hostNodes() like this
      const button2 = actionButtons()
        .find("button")
        .hostNodes()
        .at(1);
      button2.simulate("click");
      expect(mockFn).toBeCalled();
    });
  });
});
