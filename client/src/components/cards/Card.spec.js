import React from "react";
import { shallow } from "enzyme";
import Card from "./Card";

describe("Card", () => {
  const card = {
    weight: "spades",
    type: "ace"
  };
  let props;
  let wrapper;
  const mockFn = jest.fn();
  const component = () => {
    if (!wrapper) {
      wrapper = shallow(<Card {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      card: card,
      index: 3,
      fromPile: undefined,
      clickOwnCard: undefined
    };
    wrapper = undefined;
  });

  it("renders a div", () => {
    const div = component().find("div");
    expect(div.length).toBe(1);
  });

  describe("card classes and styles", () => {
    it('should have "card" class', () => {
      props.cardClass = "topCard selected cardsInHand";
      expect(
        component()
          .find("div")
          .hasClass("selected")
      );
    });

    it("should have a background image with a given card", () => {
      expect(
        component()
          .find("div")
          .props().style
      ).toHaveProperty("backgroundImage", "url(ace_of_spades.png)");
    });

    describe("card from pile", () => {
      beforeEach(() => {
        props.fromPile = true;
      });

      it("should have absolute position", () => {
        props.card.transform = { rotate: 9, x: 7, y: -3 }
        expect(
          component()
            .find("div")
            .props().style
        ).toHaveProperty("position", "absolute");
      });

      it("should not have translate style", () => {
        expect(
          component()
            .find("div")
            .props().style
        ).not.toHaveProperty("transform", "");
      });

      it("should have translate style", () => {
        expect(
          component()
            .find("div")
            .props().style
        ).toHaveProperty(
          "transform",
          `rotate(${card.transform.rotate}deg) translate(${
            card.transform.x}px, ${card.transform.y}px)`
        );
      });
    });
  });

  describe("when a card is clicked", () => {
    it("should not be clickable", () => {
      const wrapper = component().find("div");
      wrapper.simulate("click");
      expect(mockFn).not.toBeCalled();
    });

    it("should be clickable and give 2 arguments", () => {
      props.clickOwnCard = mockFn;
      const wrapper = component().find("div");
      wrapper.simulate("click");
      expect(mockFn).toHaveBeenCalledWith(card, 3);
    });
  });
});
