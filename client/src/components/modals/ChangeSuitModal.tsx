import type { Suit } from "../../types";
import { cardSuits } from "../../constants/constants";
import ModalButton from "../buttons/ModalButton";

export default function ChangeSuitModal(props: { changeSuit: (suit: Suit) => void }) {
  return (
    <div>
      <span>Pick card suit</span>
      <div className="suit-pick">
        {cardSuits.map(suit => (
          <ModalButton
            key={suit}
            onClick={() => props.changeSuit(suit)}
            image={`symbols/${suit}_symbol`}
          />
        ))}
      </div>
    </div>
  );
}

