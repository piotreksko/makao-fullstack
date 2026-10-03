import React from "react";
import CardBack from "./cards/CardBack";
import WaitIcon from "../components/icons/WaitIcon";
import SlideIn from "./SlideIn";
import PropTypes from "prop-types";

// Other seats at the table: just their card backs (their hands are never
// sent to us) plus how many turns they still have to skip
const Opponents = ({ seats }) => (
  <React.Fragment>
    {seats.map(seat => (
      <div className="flex-container cards-container" key={seat.seat}>
        <div className="seat-label">
          {seat.name}
          {seat.place ? ` (place ${seat.place})` : ""}
        </div>
        <div className="row cards">
          {Array.from({ length: seat.cardCount }).map((_, index) => (
            <SlideIn key={index} x={-100} y={200} duration={250} delay={(index + 1) * 50}>
              <CardBack />
            </SlideIn>
          ))}
        </div>
        <WaitIcon waitTurn={seat.skipTurns} playerInfo={true} />
      </div>
    ))}
  </React.Fragment>
);

Opponents.propTypes = {
  seats: PropTypes.arrayOf(
    PropTypes.shape({
      seat: PropTypes.number,
      name: PropTypes.string,
      cardCount: PropTypes.number,
      skipTurns: PropTypes.number,
      place: PropTypes.number
    })
  )
};

export default Opponents;
