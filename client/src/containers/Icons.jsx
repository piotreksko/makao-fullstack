import React from "react";
import { connect } from "react-redux";
import Aux from "../hoc/Auxilliary";
import BattleIcon from "../components/icons/BattleIcon";
import DemandIcon from "../components/icons/DemandIcon";
import SuitIcon from "../components/icons/SuitIcon";
import WaitIcon from "../components/icons/WaitIcon";

const Icons = ({ view }) => {
  if (!view) return null;
  const gameOver = view.status === "finished";
  const topCard = view.pile[view.pile.length - 1];

  return !gameOver ? (
    <Aux>
      <BattleIcon battleCards={view.penalty > 0 ? view.penalty + 1 : 0} />
      <DemandIcon jackActive={!!view.demand} chosenType={view.demand?.rank} />
      <SuitIcon
        show={topCard?.rank === "ace" && view.chosenSuit != null}
        chosenWeight={view.chosenSuit}
        gameOver={gameOver}
      />
      <WaitIcon waitTurn={view.pendingSkips} gameOver={gameOver} playerIcon={true} />
    </Aux>
  ) : null;
};

const mapStateToProps = state => ({
  view: state.game.view
});

export default connect(mapStateToProps)(Icons);
