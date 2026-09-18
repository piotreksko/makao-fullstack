import React, { PureComponent } from "react";
import { connect } from "react-redux";
import * as logicActions from "../actions/logicActions";
import * as soundActions from "../actions/soundActions";
import * as statsActions from "../actions/statsActions";
import RulesModal from "../components/modals/RulesModal";
import RulesButton from "../components/buttons/RulesButton";
import RestartButton from "../components/buttons/RestartButton";
import ReactModal from "react-modal";

export class Header extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      openRules: false
    };
  }

  componentDidMount() {
    this.props.fetchStats();
  }

  toggleRules = () => {
    this.props.playSound("click");
    this.setState({
      openRules: !this.state.openRules
    });
  };

  restartGame = () => {
    this.props.playSound("click");
    this.props.restartGame();
  };

  render() {
    return (
      <div className="score-board">
        <ReactModal
          isOpen={this.state.openRules}
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
          ariaHideApp={false}
          id="rules"
          className="center rules"
          overlayClassName="overlay"
        >
          <RulesModal close={this.toggleRules} />
        </ReactModal>
        <RestartButton onClick={this.restartGame} />
        <RulesButton onClick={this.toggleRules} />

        <div className="global-stats">
          <h6>Global statistics</h6>
          <div className="score">
            <label>Makao call count:</label>
            <span> {this.props.globalStats.makaoCallCount}</span>
          </div>
          <div className="score">
            <label>Total player score:</label>
            <span> {this.props.globalStats.playerWinCount}</span>
          </div>
          <div className="score">
            <label>Total computer score:</label>
            <span> {this.props.globalStats.computerWinCount}</span>
          </div>
          <div className="total-moves-counter">
            <label>Total moves:</label>
            <span> {this.props.globalStats.movesCount}</span>
          </div>
        </div>
        <div className="current-stats">
          <h6>Current game</h6>
          <div className="score">
            <label>Moves:</label>
            <span> {this.props.localStats.movesCount}</span>
          </div>
          <div className="score">
            <label>Computer score:</label>
            <span> {this.props.localStats.computerWinCount}</span>
          </div>
          <div className="score">
            <label>Your score:</label>
            <span> {this.props.localStats.playerWinCount}</span>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    globalStats: state.stats.global,
    localStats: state.stats.local
  };
};

const mapDispatchToProps = dispatch => {
  return {
    fetchStats: () => dispatch(statsActions.fetchStats()),
    updateLocalStat: (stat, value) =>
      dispatch(statsActions.updateLocalStat(stat, value)),
    playSound: soundName => dispatch(soundActions.playSound(soundName))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Header);
