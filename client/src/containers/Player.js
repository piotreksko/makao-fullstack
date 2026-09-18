import React, { Component } from "react";
import { connect } from "react-redux";
import _ from "lodash";
import Aux from "../hoc/Auxilliary";
import { CSSTransition, transit } from "react-css-transition";

import * as logicActions from "../actions/logicActions";
import * as soundActions from "../actions/soundActions";
import ActionButtons from "../components/buttons/ActionButtons";
import Card from "../components/cards/Card";
import WaitIcon from "../components/icons/WaitIcon";

class Player extends Component {
  constructor(props) {
    super(props);
    this.state = {
      availableCards: [],
      possibleCards: [],
      selectedCards: []
    };
  }

  componentWillMount() {
    if (this.props.gameState.isPlayerTurn) {
      setTimeout(() => {
        this.checkAvailableCards();
      }, 1200);
    } else {
      setTimeout(() => {
        this.props.endTurn();
      }, 800);
    }
    this.props.playSound("shuffle");
  }

  shouldComponentUpdate(nextProps, nextState) {
    const firstTurn = this.isFirstTurn();
    const changed = this.haveCardsChanged(nextProps, nextState);
    const ended = this.hasCpuEndedTurn(nextProps);
    const playerTurnChanged =
      nextProps.gameState.isPlayerTurn !== this.props.gameState.isPlayerTurn;

    if (changed || ended || firstTurn || playerTurnChanged) return true;
    else return false;
  }

  componentDidUpdate(prevProps) {
    let clearSelectedCards =
      !_.isEqual(prevProps.gameState.player, this.props.gameState.player) &&
      this.state.selectedCards.length;
    let newSelectedCards = clearSelectedCards ? [] : this.state.selectedCards;

    if (this.props.gameState.isPlayerTurn)
      this.checkAvailableCards(newSelectedCards);
  }

  haveCardsChanged(props, nextState) {
    return (
      !_.isEqual(props.gameState.player, this.props.gameState.player) ||
      !_.isEqual(nextState, this.state)
    );
  }

  hasCpuEndedTurn(nextProps) {
    return (
      (!nextProps.gameState.firstCardChecked &&
        this.props.gameState.firstCardChecked) ||
      !_.isEqual(nextProps.gameState.cpuPlayer, this.props.gameState.cpuPlayer)
    );
  }

  isFirstTurn() {
    return this.props.stats.movesCount === 0;
  }

  waitTurns = () => {
    this.props.playSound("click");
    // this.updatePlayerCards([], [], []);
    this.props.playerWait();
    setTimeout(() => {
      this.props.endTurn();
    }, 700);
  };

  clickOwnCard = (card, index) => {
    if (!card.class) return;
    let newSelected = _.cloneDeep(this.state.selectedCards);

    this.props.playSound(`pick_card2`);

    let playerCards = this.props.gameState.player.cards;

    const updateSelectedCards = () => {
      this.setState({
        ...this.state,
        selectedCards: newSelected
      });
    };

    if (!newSelected.length) {
      newSelected.push(card);
      updateSelectedCards();
    }

    const removeFromSelected = () => {
      for (let i = 0; i < newSelected.length; i++) {
        //Find index of the card to remove from selected
        if (
          newSelected[i].type === playerCards[index].type &&
          newSelected[i].weight === playerCards[index].weight
        ) {
          newSelected.splice(i, 1);
          if (i === 0) {
            newSelected = [];
          }
        }
      }
    };

    if (card.class.includes("selected")) {
      removeFromSelected();
      return updateSelectedCards();
    }

    switch (card.class) {
      case "possible":
        newSelected.push(card);
        break;
      case "available":
        newSelected = [];
        newSelected.push(playerCards[index]);
        break;
      default:
        return newSelected;
    }
    updateSelectedCards();
  };

  confirmCards = () => {
    if (
      !this.state.selectedCards.length &&
      !this.props.gameState.firstCardChecked
    )
      return;

    if (
      this.props.gameState.firstCardChecked &&
      !this.state.selectedCards.length
    )
      this.props.playSound("click");

    this.props.makePlayerMove(this.state.selectedCards);
    this.updatePlayerCards([], [], []);
  };

  checkAvailableCards = newSelectedCards => {
    const selectedCards = this.state.selectedCards;
    const playerWait = this.props.gameState.player.wait;

    if (playerWait) return;

    if (!selectedCards.length) {
      this.hasNoSelectedCards();
    } else if (selectedCards.length) {
      this.hasSelectedCards(newSelectedCards);
    }
  };

  hasNoSelectedCards = () => {
    const {
      player,
      chosenWeight,
      chosenType,
      waitTurn,
      jackActive,
      battleCardActive,
      pile,
      firstCardChecked
    } = this.props.gameState;
    let playerCards = player.cards;
    if (firstCardChecked)
      playerCards = playerCards.filter(card => card.isForCheck);

    let pileTopCard = _.cloneDeep(pile[pile.length - 1]),
      newAvailable = [],
      newPossible = [];

    if (pileTopCard.type === "ace") {
      pileTopCard.weight = chosenWeight;
    }

    playerCards.forEach((card, idx) => {
      // Make battle cards available if battle is on
      if (battleCardActive) {
        return (newAvailable = [
          ...newAvailable,
          ...this.getBattleCards(card, idx, playerCards, pileTopCard)
        ]);
      }

      // Make 4 available if it was used
      if (waitTurn) {
        return card.type === "4" ? newAvailable.push(playerCards[idx]) : null;
      }

      // Jack demand is active
      if (jackActive) {
        return card.type === chosenType ||
          (card.type === "jack" && pileTopCard.type === "jack")
          ? newAvailable.push(playerCards[idx])
          : null;
      }

      // No special conditions
      if (card.type === pileTopCard.type) {
        newAvailable.push(playerCards[idx]);
      }
      if (
        card.weight === pileTopCard.weight &&
        card.type !== pileTopCard.type
      ) {
        newAvailable.push(playerCards[idx]);
      }
    });
    this.updatePlayerCards(newAvailable, newPossible, []);
  };

  getBattleCards = (card, idx, playerCards, pileTopCard, newAvailable = []) => {
    // Battle cards are 2, 3, king of spades and hearts
    if (
      card.type === pileTopCard.type ||
      // 2 or 3
      (card.weight === pileTopCard.weight &&
        (card.type === "2" || card.type === "3")) ||
      // Kings - spades and hearts
      (card.type === "king" &&
        pileTopCard.type === "king" &&
        card.weight === pileTopCard.weight &&
        (card.weight === "spades" || card.weight === "hearts")) ||
      // If last card was a battle king, make king of diamond and clubs available
      (card === pileTopCard.type &&
        (card.weight === "diamond" || card.weight === "clubs"))
    ) {
      newAvailable.push(playerCards[idx]);
    }
    return newAvailable;
  };

  hasSelectedCards(newSelectedCards) {
    const {
      player,
      waitTurn,
      chosenWeight,
      jackActive,
      battleCardActive,
      pile,
      firstCardChecked
    } = this.props.gameState;
    let playerCards = player.cards;

    if (firstCardChecked) {
      playerCards = playerCards.filter(card => card.isForCheck);
    }

    let pileTopCard = _.cloneDeep(pile[pile.length - 1]),
      newAvailable = [],
      newPossible = [],
      newSelected = newSelectedCards;
    if (pileTopCard.type === "ace") {
      pileTopCard.weight = chosenWeight;
    }

    let chosenCard = this.state.selectedCards[0];

    // Adjust available cards according to chosen card
    playerCards.forEach((card, idx) => {
      // Get cards with the same type as chosen card (possibleCards)
      if (card.type === chosenCard.type) {
        return newPossible.push(playerCards[idx]);
      }

      if (
        this.sameType(card, pileTopCard) ||
        this.sameWeightNoConditions(
          card,
          pileTopCard,
          battleCardActive,
          jackActive,
          waitTurn
        ) ||
        this.jackWasUsed(card, jackActive) ||
        this.fourWasUsed(card, waitTurn)
      )
        return newAvailable.push(playerCards[idx]);
    });
    this.updatePlayerCards(newAvailable, newPossible, newSelected);
  }

  sameType(card, pileTopCard) {
    return card.type === pileTopCard.type;
  }

  sameWeightNoConditions(
    card,
    pileTopCard,
    battleCardActive,
    jackActive,
    waitTurn
  ) {
    return (
      card.weight === pileTopCard.weight &&
      !battleCardActive &&
      !jackActive &&
      !waitTurn
    );
  }

  jackWasUsed(card, jackActive) {
    return card.type === "jack" && jackActive;
  }

  fourWasUsed(card, waitTurn) {
    return card.type === "4" && waitTurn;
  }

  updatePlayerCards(newAvailable, newPossible, newSelected) {
    this.setState({
      availableCards: newAvailable,
      possibleCards: newPossible,
      selectedCards: newSelected
    });
  }

  stylePlayerCards(playerCards, availableCards, possibleCards, selectedCards) {
    let cards = _.cloneDeep(playerCards);

    if (
      !cards.length ||
      (!availableCards.length && !selectedCards.length && !possibleCards.length)
    )
      return playerCards;
    const topCard = selectedCards.length
      ? selectedCards[selectedCards.length - 1]
      : null;

    const styleTopCard = cards => {
      if (!topCard) return;
      return cards.forEach(function(card, i) {
        if (topCard.type === card.type && topCard.weight === card.weight)
          card.class += " topCard";
      });
    };

    const styleCards = (styleType, styleCards, cards) => {
      return cards.forEach(card => {
        styleCards.forEach(styledCard => {
          if (
            styledCard.type === card.type &&
            styledCard.weight === card.weight
          ) {
            card.class = styleType;
          }
        });
      });
    };

    styleCards("possible", possibleCards, cards);
    styleCards("available", availableCards, cards);
    styleCards("selected", selectedCards, cards);
    styleTopCard(cards);

    return cards;
  }

  checkClass(card) {
    if (card.isSelected) {
      card.class += " selected";
    }
    return card.class ? card.class : "";
  }

  getTransformationValue() {
    let transformation;
    let deck = document.getElementsByClassName("deck");
    let cardContainers = document.getElementsByClassName("cards-container");
    if (deck.length && cardContainers.length) {
      const deckPosition = deck[0].getBoundingClientRect();
      const playerPosition = cardContainers[
        cardContainers.length - 1
      ].getBoundingClientRect();
      transformation = {
        x: deckPosition.x - playerPosition.width / 2,
        y: deckPosition.y - playerPosition.y
      };
    } else {
      transformation = {
        x: -100,
        y: -200
      };
    }
    return transformation;
  }

  render() {
    CSSTransition.childContextTypes = {};
    const gameState = this.props.gameState,
      playerCards = gameState.player.cards,
      pileTopCard = gameState.pile[gameState.pile.length - 1],
      playerCanWait =
        (pileTopCard.type === "4" && gameState.waitTurn) ||
        gameState.player.wait
          ? true
          : false,
      transitionsOn = true;
    let transformationValue = this.getTransformationValue();
    let renderedCard = 1;
    let assignCardClass = card => {
      if (card.isForCheck) {
        if (card.class) {
          if (card.class.includes("topCard")) {
            return "topCard selected cardsInHand";
          }
          return "for-check-available cardsInHand";
        } else {
          return "for-check-unavailable cardsInHand";
        }
      }
      return card.class + " cardsInHand";
    };

    return (
      <Aux>
        <div className={"flex-container cards-container"}>
          <div className={"row cards"}>
            {this.stylePlayerCards(
              playerCards,
              this.state.availableCards,
              this.state.possibleCards,
              this.state.selectedCards
            ).map((card, index) => {
              renderedCard += 1;
              return (
                <CSSTransition
                  key={`${card.type}_${card.weight}`}
                  transitionDelay={{
                    enter: renderedCard * 50
                  }}
                  transitionAppear={{ transitionsOn }}
                  defaultStyle={{
                    transform: `translate(${transformationValue.x}px, ${
                      transformationValue.y
                    }px)`
                  }}
                  enterStyle={{
                    transform: transit("translate(0, 0)", 250, "ease-in-out")
                  }}
                  activeStyle={{ transform: "translate(0, 0)" }}
                  active={transitionsOn}
                >
                  <Card
                    key={`${card.type}_${card.weight}`}
                    clickOwnCard={this.clickOwnCard}
                    card={card}
                    index={index}
                    cardClass={assignCardClass(card)}
                  />
                </CSSTransition>
              );
            })}
          </div>
          <WaitIcon waitTurn={this.props.gameState.player.wait} />
        </div>
        <ActionButtons
          confirmCards={this.confirmCards}
          hasSelected={this.state.selectedCards.length}
          isPlayerTurn={gameState.isPlayerTurn}
          waitTurn={this.waitTurns}
          playerCanWait={playerCanWait}
          firstCardChecked={gameState.firstCardChecked}
        />
      </Aux>
    );
  }
}

const mapStateToProps = state => {
  return {
    gameState: state.gameState,
    stats: state.stats,
    modals: state.modals
  };
};

const mapDispatchToProps = dispatch => {
  return {
    makePlayerMove: cards => dispatch(logicActions.makePlayerMove(cards)),
    playerWait: () => dispatch(logicActions.waitTurns("player")),
    makeCpuMove: () => dispatch(logicActions.makeCpuMove()),
    endTurn: () => {
      dispatch(logicActions.updateGameFactor("isPlayerTurn", false));
      dispatch(logicActions.makeCpuMove());
      dispatch(logicActions.checkMacaoAndWin());
    },
    playSound: soundName => dispatch(soundActions.playSound(soundName))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Player);
