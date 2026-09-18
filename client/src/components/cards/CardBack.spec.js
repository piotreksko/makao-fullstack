import React from "react";
import { shallow } from "enzyme";
import CardBack from "./CardBack";

describe("CardBack", () => {
  let props;
  let wrapper;
  const mockFn = jest.fn();
  const cardBack = () => {
    if (!wrapper) {
      wrapper = shallow(<CardBack {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      number: undefined,
      deckCard: undefined,
      takeCard: undefined,
      highlight: undefined,
      playerCanMove: undefined
    };
    wrapper = undefined;
  });

  it("renders a div", () => {
    const div = cardBack().find("div");
    expect(div.length).toBe(1);
  });

  describe("card classes and styles", () => {
    const component = cardBack().find("div");
    it('should have "card" class', () => {
      expect(component.hasClass("card"));
    });

    it('should have "cardsInHand" class', () => {
      expect(component.hasClass("cardsInHand"));
    });

    it('should have "deckPossible" class', () => {
      props.highlight = true;
      props.playerCanMove = true;
      props.deckCard = true;
      expect(component.hasClass("deckPossible"));
    });

    it('should not have "deckPossible" class', () => {
      props.highlight = true;
      props.playerCanMove = true;
      props.deckCard = false;
      expect(cardBack().find('div.deckPossible').length).toBe(0);
    });

    it('should have custom translateY style', () => {
      props.number = 3;
      props.deckCard = true;
      expect(cardBack().props().style).toHaveProperty('transform', 'translateY(-9px)');
    });
  });

  describe("when a card is clicked", () => {
    beforeEach(() => {
      props.takeCard = mockFn;
    });

    it("should not be clickable", () => {
      const card = cardBack().find("div");
      card.simulate("click");
      expect(mockFn).not.toBeCalled();
    });

    it("should be clickable", () => {
      props.deckCard = true;
      props.playerCanMove = true;
      const card = cardBack().find("div");
      card.simulate("click");
      expect(mockFn).toBeCalled();
    });
  });
});
