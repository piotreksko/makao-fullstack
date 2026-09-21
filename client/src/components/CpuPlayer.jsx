import React from "react";
import CardBack from "./cards/CardBack";
import WaitIcon from "../components/icons/WaitIcon";
import SlideIn from "./SlideIn";
import PropTypes from "prop-types";

const CpuPlayer = ({ cpuPlayer }) => (
  <div className={"flex-container cards-container"}>
    <div className={"row cards"}>
      {cpuPlayer.cards.map((card, index) => (
        <SlideIn
          key={`${card.type}_${card.weight}`}
          x={-100}
          y={200}
          duration={250}
          delay={(index + 1) * 50}
        >
          <CardBack />
        </SlideIn>
      ))}
    </div>
    <WaitIcon waitTurn={cpuPlayer.wait} playerInfo={true} />
  </div>
);

CpuPlayer.propTypes = {
  cpuPlayer: PropTypes.shape({
    cards: PropTypes.array,
    wait: PropTypes.number
  })
};

export default CpuPlayer;
