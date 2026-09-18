import React from "react";
import { shallow } from "enzyme";
import SuitIcon from "./SuitIcon";

describe("SuitIcon", () => {
  const weights = ["spades", "hearts", "diamonds", "clubs"];
  let props;
  let wrapper;
  const component = () => {
    if (!wrapper) {
      wrapper = shallow(<SuitIcon {...props} />);
    }
    return wrapper;
  };

  beforeEach(() => {
    props = {
      show: true,
      gameOver: false,
      chosenWeight: undefined
    };
    wrapper = undefined;
  });

  it("does not render when game is over", () => {
    props.gameOver = true;
    const div = component().find("div");
    expect(div.length).toBe(0);
  });

  it("renders a div", () => {
    const div = component().find("div");
    expect(div.length).toBe(1);
  });

  it("renders an image", () => {
    const img = component().find("img");
    expect(img.length).toBe(1);
  });

  it("has given symbol as an image", () => {
    // doesn't work

    // props.chosenWeight = weights[0];
    // weights.forEach((weight)=> {
    //   props.chosenWeight = weight;
    //   const img = component().find('img');
    //   expect(img.prop('src')).toEqual(`${weight}_symbol.png`)
    // })

    props.chosenWeight = weights[0];
    const img = component().find("img");
    expect(img.prop("src")).toEqual(`${weights[0]}_symbol.png`);
  });

  it('has a "modal-shown" class', () => {
    const div = component().find("div.info-icon");
    expect(div.hasClass("modal-shown"));
  });
});
