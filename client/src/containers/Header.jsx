import React, { useState } from "react";
import { connect } from "react-redux";
import ReactModal from "react-modal";
import RulesModal from "../components/modals/RulesModal";
import RulesButton from "../components/buttons/RulesButton";
import RestartButton from "../components/buttons/RestartButton";

export const Header = ({ view, currentRoom, onLeave }) => {
  const [openRules, setOpenRules] = useState(false);

  if (!view || !view.you) return null;
  const { you } = view;

  return (
    <div className="score-board">
      <ReactModal
        isOpen={openRules}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        ariaHideApp={false}
        id="rules"
        className="center rules"
        overlayClassName="overlay"
      >
        <RulesModal close={() => setOpenRules(false)} />
      </ReactModal>
      <RestartButton onClick={onLeave} />
      <RulesButton onClick={() => setOpenRules(true)} />

      <div className="current-stats">
        <h6>Room {currentRoom?.inviteCode ? `(${currentRoom.inviteCode})` : ""}</h6>
        <div className="score">
          <label>Turn:</label>
          <span> {view.currentSeat === you.seat ? "You" : `Seat ${view.currentSeat}`}</span>
        </div>
        <div className="score">
          <label>Your cards:</label>
          <span> {you.hand.length}</span>
        </div>
        <div className="score">
          <label>Deck:</label>
          <span> {view.deckCount}</span>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = state => ({
  view: state.game.view,
  currentRoom: state.rooms.currentRoom
});

export default connect(mapStateToProps)(Header);
