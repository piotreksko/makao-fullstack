import React from "react";
import CardBack from "./cards/CardBack";
import WaitIcon from "../components/icons/WaitIcon";
import PropTypes from "prop-types";

// Other seats at the table, drawn in the area of the table they sit in. Their
// hands are never sent to us, so they show only card backs.
const Opponents = ({ seats, area }) =>
  seats
    .filter(seat => seat.area === area)
    .map(seat => (
      <div className={`opponent opponent-${area}`} key={seat.seat}>
        <div className="seat-label">
          {seat.name}
          {seat.place ? ` (place ${seat.place})` : ""}
        </div>
        <div className={`opponent-cards opponent-cards-${area}`}>
          {Array.from({ length: seat.cardCount }).map((_, index) => (
            <CardBack key={index} />
          ))}
        </div>
        <WaitIcon waitTurn={seat.skipTurns} playerInfo={true} />
      </div>
    ));

Opponents.propTypes = {
  area: PropTypes.oneOf(["top", "left", "right"]),
  seats: PropTypes.arrayOf(
    PropTypes.shape({
      seat: PropTypes.number,
      area: PropTypes.string,
      name: PropTypes.string,
      cardCount: PropTypes.number,
      skipTurns: PropTypes.number,
      place: PropTypes.number
    })
  )
};

export default Opponents;
