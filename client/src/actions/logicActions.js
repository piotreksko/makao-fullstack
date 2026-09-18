import _ from "lodash";
import { sortCards } from "../utility/utility";
import * as statsActions from "./statsActions";
import { checkSoundsToPlay, playSound } from "./soundActions";
export const ADD_TO_DECK = 'ADD_TO_DECK'
export const NEW_GAME = 'NEW_GAME'
export const UPDATE_GAME_FACTOR = 'UPDATE_GAME_FACTOR'
export const UPDATE_PLAYER_CARDS = "UPDATE_PLAYER_CARDS";
export const UPDATE_CPU_CARDS = "UPDATE_CPU_CARDS";
export const UPDATE_WHOS_TURN = "UPDATE_WHOS_TURN";
export const TAKE_FROM_DECK = "TAKE_FROM_DECK";
export const ADD_TO_PILE = "ADD_TO_PILE";
export const WAIT_TURNS = "WAIT_TURNS";
export const FETCH_STATS = "FETCH_STATS";
export const CHANGE_SUIT = "CHANGE_SUIT";
export const DEMAND_CARD = "DEMAND_CARD";
export const SHUFFLE_DECK = "SHUFFLE_DECK";
export const RESTART_GAME = "RESTART_GAME";

export function addToDeck(cards) {
  return dispatch => {
    dispatch({
      type: ADD_TO_DECK,
      cards
    });
  };
}

export function newGame() {
  return dispatch => {
    dispatch({
      type: NEW_GAME,
    });
  };
}

export function updateGameFactor(factor, value) {
  return dispatch => {
    dispatch(checkSoundsToPlay(factor, value));
    dispatch({
      type: UPDATE_GAME_FACTOR,
      factor,
      value
    });
  };
}
export function updatePlayerCards(cards) {
  return dispatch => {
    dispatch({ type: UPDATE_PLAYER_CARDS, cards });
  };
}

export function updateCpuCards(cards) {
  return dispatch => {
    // Omit to clear them from unwanted properties before updating
    cards = cards.map(card => {
      card = _.omit(card, "sameTypeAmount");
      card = _.omit(card, "sameWeightAmount");
      return card;
    });
    dispatch({ type: UPDATE_CPU_CARDS, cards });
  };
}

export function shuffleDeck() {
  return function(dispatch, getState) {
    const { pile } = getState().gameState;
    let cardsForShuffle = _.cloneDeep(pile);
    cardsForShuffle = cardsForShuffle.map(card => {
      card = _.omit(card, "transform");
      return card;
    });
    cardsForShuffle.pop();
    let shuffledCards = _.shuffle(cardsForShuffle);
    dispatch({
      type: "SHUFFLE_DECK",
      cards: shuffledCards
    });
    dispatch(playSound("shuffle"));
  };
}

export function waitTurns(who) {
  return function(dispatch, getState) {
    const gameState = getState().gameState;

    dispatch(statsActions.updateLocalStat("movesCount"));
    dispatch(statsActions.updateGlobalStat("movesCount"));

    if (gameState.waitTurn) {
      dispatch(updateGameFactor("waitTurn", 0));
      dispatch({ type: "WAIT_TURNS", waitTurns: gameState.waitTurn - 1, who });
    } else {
      dispatch({ type: "WAIT_TURNS", waitTurns: gameState[who].wait - 1, who });
    }

    setTimeout(() => {
      dispatch(updateWhosTurn(who));
    }, 50);
  };
}

export function addToPile(cards, who) {
  return (dispatch, getState) => {
    let isFromPlayer = who === "player";
    dispatch(statsActions.updateLocalStat("movesCount"));
    dispatch(statsActions.updateGlobalStat("movesCount"));

    setTimeout(() => dispatch(playSound("pick_card1")), 350);

    cards = getRandomTransformValues(cards);
    cards = cards.map(card => {
      card.isFromPlayer = isFromPlayer;
      return card;
    });
    dispatch({
      type: "ADD_TO_PILE",
      cards: cards
    });

    const gameState = getState().gameState;
    if (gameState.firstCardChecked) {
      dispatch(updateGameFactor("firstCardChecked", false));
    }
  };
}

export function updateWhosTurn(who) {
  return (dispatch, getState) => {
    const isPlayerTurn = who !== "player";
    dispatch({ type: UPDATE_WHOS_TURN, isPlayerTurn });
  };
}

export function getRandomTransformValues(cards) {
  const getRandomPlusMinusSign = () => {
    const randomBool = Math.random() >= 0.5;
    return randomBool ? "" : "-";
  };

  const getRandomValue = () => Math.floor(Math.random() * 10) + 1;

  cards.map((card, idx) => {
    if (idx === 0) {
      card.transform = {
        rotate: getRandomPlusMinusSign() + getRandomValue(),
        x: getRandomPlusMinusSign() + getRandomValue(),
        y: getRandomPlusMinusSign() + getRandomValue()
      };
      if (card.transform.rotate > 5 && cards.length > 1) {
        card.transform.rotate -= 5;
      }
      return card;
    } else
      return (card.transform = {
        rotate: parseInt(cards[0].transform.rotate) + 10 * idx,
        x: parseInt(cards[0].transform.x) + 10 * idx,
        y: parseInt(cards[0].transform.y) - 3 * idx
      });
  });
  return cards;
}

export function checkMacaoAndWin() {
  return function(dispatch, getState) {
    const gameState = getState().gameState;
    dispatch(checkMacao(gameState));
    dispatch(checkWin(gameState));
  };
}

export function restartGame() {
  return function(dispatch, getState) {
    dispatch(playSound("shuffle"));
    dispatch({ type: RESTART_GAME });

    if (!getState().gameState.isPlayerTurn)
      setTimeout(() => dispatch(makeCpuMove()), 700);
  };
}

export function checkMacao(gameState) {
  return (dispatch, getState) => {
    if (
      gameState.player.cards.length === 1 ||
      gameState.cpuPlayer.cards.length === 1
    ) {
      dispatch(statsActions.updateGlobalStat("makaoCallCount"));
      dispatch({ type: "SHOW_MODAL", modal: "macao" });
      setTimeout(() => {
        dispatch({ type: "HIDE_MODAL", modal: "macao" });
      }, 1000);
    }
  };
}

export function checkWin(gameState) {
  return (dispatch, getState) => {
    if (!gameState.player.cards.length) {
      dispatch({ type: "SHOW_MODAL", modal: "gameOver" });
      dispatch(playSound("victory"));
      dispatch(statsActions.updateLocalStat("playerWinCount"));
      dispatch(statsActions.updateGlobalStat("playerWinCount"));
    } else if (!gameState.cpuPlayer.cards.length) {
      if (!getState().modals.gameOver) {
        dispatch(statsActions.updateLocalStat("computerWinCount"));
        dispatch(statsActions.updateGlobalStat("computerWinCount"));
        dispatch(playSound("defeat"));
      }
      dispatch({ type: "SHOW_MODAL", modal: "gameOver" });
    }
  };
}

export function takeCards(who) {
  return function(dispatch, getState) {
    const gameState = getState().gameState;
    const firstCardChecked = gameState.firstCardChecked;
    if (firstCardChecked) {
      dispatch(statsActions.updateLocalStat("movesCount"));
      dispatch(statsActions.updateGlobalStat("movesCount"));
    }

    let howMany = !firstCardChecked ? 1 : gameState.cardsToTake - 2;
    if (howMany < 1) howMany = 1;
    if (firstCardChecked && gameState.cardsToTake < 2) howMany = 0;

    // Check if there are enough cards on deck
    let deck = gameState.deck;
    if (deck.length < howMany) {
      dispatch(shuffleDeck());
      deck = getState().gameState.deck;
    }

    if (!firstCardChecked || howMany)
      dispatch({ type: "TAKE_FROM_DECK", howMany });

    let cardsToTake = howMany
      ? deck.slice(deck.length - howMany, deck.length)
      : [];
    if (!firstCardChecked && howMany) cardsToTake[0].isForCheck = true;

    let newCardsWithTakenCards = sortCards([
      ...cardsToTake,
      ..._.cloneDeep(gameState[who].cards)
    ]);

    if (firstCardChecked) {
      newCardsWithTakenCards = newCardsWithTakenCards.map(
        card => (card = _.omit(card, "isForCheck"))
      );
      dispatch(updateGameFactor("firstCardChecked", false));
    }

    if (who === "player") {
      dispatch(updatePlayerCards(newCardsWithTakenCards));
    } else dispatch(updateCpuCards(newCardsWithTakenCards));

    for (let i = 0; i < howMany; i++) {
      setTimeout(() => {
        dispatch(playSound("pick_card3"));
      }, (i + 1) * 80 + 320);
    }

    if (firstCardChecked) {
      if (gameState.cardsToTake > 1)
        dispatch(updateGameFactor("cardsToTake", 1));
      if (gameState.jackActive)
        dispatch(updateGameFactor("jackActive", gameState.jackActive - 1));
      if (gameState.battleCardActive)
        dispatch(updateGameFactor("battleCardActive", false));
    } else {
      dispatch(updateGameFactor("firstCardChecked", true));
    }
  };
}

function nobodyIsWaiting() {
  return function(dispatch, getState) {
    const gameState = getState().gameState;
    return !gameState.player.wait && !gameState.cpuPlayer.wait;
  };
}

export function makePlayerMove(cards) {
  return function(dispatch, getState) {
    const gameState = getState().gameState;

    if (cards.length) {
      let newPlayerCards = dispatch(verifyUsedCards(cards));
      dispatch(addToPile(cards, "player"));
      dispatch(updatePlayerCards(newPlayerCards));
    }

    if (gameState.firstCardChecked && !cards.length) {
      dispatch(takeCards("player"));
      dispatch(updateGameFactor("firstCardChecked", false));
    }

    dispatch(checkMacaoAndWin());

    const modals = getState().modals;

    if (!modals.ace && !modals.jack && !modals.gameOver) {
      setTimeout(() => {
        dispatch(makeCpuMove());
        dispatch(checkMacaoAndWin());
      }, 700);
    }
    dispatch(updateWhosTurn("player"));
  };
}

function verifyUsedCards(cards) {
  return function(dispatch, getState) {
    const { gameState } = getState();
    let {
      cardsToTake,
      waitTurn,
      jackActive,
      battleCardActive,
      firstCardChecked
    } = gameState;
    let gameFactors = {
      cardsToTake,
      waitTurn,
      jackActive,
      battleCardActive,
      firstCardChecked
    };

    let newPlayerCards = _.cloneDeep(gameState.player.cards).map(
      card => (card = _.omit(card, "class"))
    );

    if (firstCardChecked) {
      newPlayerCards = newPlayerCards.map(
        card => (card = _.omit(card, "isForCheck"))
      );
    }

    if (cards.length) {
      cards.forEach(card => {
        switch (card.type) {
          case "2":
            if (nobodyIsWaiting()) gameFactors.cardsToTake += 2;
            break;
          case "3":
            if (nobodyIsWaiting()) gameFactors.cardsToTake += 3;
            break;
          case "4":
            if (!gameState.cpuPlayer.wait) {
              gameFactors.waitTurn += 1;
            }
            break;
          case "jack":
            dispatch(checkWin(gameState));
            dispatch({ type: "SHOW_MODAL", modal: "jack" });
            gameFactors.jackActive = 3;
            break;
          case "ace":
            dispatch(checkWin(gameState));
            dispatch({ type: "SHOW_MODAL", modal: "ace" });
            break;
          case "king":
            if (
              card.weight === "hearts" ||
              (card.weight === "spades" && nobodyIsWaiting())
            ) {
              gameFactors.cardsToTake += 5;
              break;
            }
            //Kings of clubs and diamonds nullify amount of cards to be taken
            else {
              gameFactors.cardsToTake = 1;
              break;
            }
          default:
            break;
        }

        // Remove cards from playerCards
        let cardIndexInPlayerCards = newPlayerCards.findIndex(
          c => card.type === c.type && card.weight === c.weight
        );
        newPlayerCards.splice(cardIndexInPlayerCards, 1);
      });
      dispatch(checkGameFactorsToUpdate(gameFactors));
    }

    return newPlayerCards;
  };
}

function checkGameFactorsToUpdate(gameFactors) {
  return function(dispatch, getState) {
    const gameState = getState().gameState;
    if (gameFactors.cardsToTake > 1) gameFactors.battleCardActive = true;
    else gameFactors.battleCardActive = false;

    if (gameFactors.jackActive) gameFactors.jackActive -= 1;

    _.forOwn(gameFactors, function(value, key) {
      if (value !== gameState[key]) dispatch(updateGameFactor(key, value));
    });
  };
}

export function makeCpuMove() {
  return function(dispatch, getState) {
    const gameState = getState().gameState;
    let cpuWait = gameState.cpuPlayer.wait;

    if (getState().modals.gameOver) return;
    if (cpuWait) return dispatch(waitTurns("cpuPlayer"));
    let availableCards = dispatch(getAvailableCards());

    if (availableCards.length) {
      dispatch(hasCardsAvailable(availableCards));
    } else {
      dispatch(noCardsToUse());
    }

    dispatch(checkMacaoAndWin());

    if (gameState.firstCardChecked);
    dispatch(updateWhosTurn("cpuPlayer"));
  };
}

function getAvailableCards() {
  return function(dispatch, getState) {
    const gameState = getState().gameState;
    const {
      chosenWeight,
      chosenType,
      jackActive,
      cpuPlayer,
      pile,
      firstCardChecked
    } = gameState;

    const pileTopCard = pile[pile.length - 1];
    const cards = !firstCardChecked
      ? cpuPlayer.cards
      : cpuPlayer.cards.filter(card => card.isForCheck);

    let availableCards = [];
    if (pileTopCard.type === "ace") {
      availableCards = cards.filter(
        card => card.weight === chosenWeight || card.type === pileTopCard.type
      );
    } else if (jackActive) {
      availableCards = cards.filter(
        card => "jack" === card.type || card.type === chosenType
      );
    } else {
      availableCards = cards.filter(
        card =>
          card.weight === pileTopCard.weight || card.type === pileTopCard.type
      );
    }
    return availableCards;
  };
}

function hasCardsAvailable(availableCards) {
  return function(dispatch, getState) {
    let cardsToUse = dispatch(checkCardsToUse(availableCards));

    if (!cardsToUse) {
      return dispatch(noCardsToUse());
    } else {
      if (!cardsToUse.length) return dispatch(noCardsToUse());
      cardsToUse = dispatch(setBestTopCard(cardsToUse));

      let newCpuCards = dispatch(verifyCardsFromAI(cardsToUse));

      availableCards = [];
      dispatch(addToPile(cardsToUse, "cpuPlayer"));
      newCpuCards = sortCards(newCpuCards);

      const firstCardChecked = getState().gameState.firstCardChecked;
      if (firstCardChecked) {
        newCpuCards = newCpuCards.map(
          card => (card = _.omit(card, "isForCheck"))
        );
        dispatch(updateGameFactor("firstCardChecked", false));
      }

      dispatch(updateCpuCards(newCpuCards));
    }
  };
}

function noCardsToUse() {
  return function(dispatch, getState) {
    const gameState = getState().gameState;
    if (gameState.waitTurn > 0 || gameState.cpuPlayer.wait) {
      dispatch(waitTurns("cpuPlayer"));
    } else {
      if (!gameState.firstCardChecked) {
        dispatch(takeCards("cpuPlayer"));
        setTimeout(() => {
          dispatch(makeCpuMove());
        }, 500);
      }
      if (gameState.firstCardChecked) {
        dispatch(takeCards("cpuPlayer"));
      }
    }
  };
}

function getSameTypeAndWeightAmount(availableCards, cpuCards) {
  return availableCards.map(card => {
    return {
      type: card.type,
      weight: card.weight,
      sameTypeAmount: (() => {
        let amount = 0;
        cpuCards.forEach(c => {
          if (c.type === card.type) {
            amount += 1;
          }
        });
        return amount - 1;
      })(),
      sameWeightAmount: (() => {
        let moves = 0;
        cpuCards.forEach(c => {
          if (c.weight === card.weight) {
            moves += 1;
          }
        });
        return moves - 1;
      })()
    };
  });
}

function getNeutralCards(cards) {
  return cards.filter(
    card =>
      card.type === "5" ||
      card.type === "6" ||
      card.type === "7" ||
      card.type === "8" ||
      card.type === "9" ||
      card.type === "10" ||
      card.type === "queen" ||
      (card.type === "king" && card.weight === "diamonds") ||
      (card.type === "king" && card.weight === "clubs")
  );
}

function getBattleCards(cards) {
  return cards.filter(
    card =>
      card.type === "2" ||
      card.type === "3" ||
      (card.type === "king" && card.weight === "hearts") ||
      (card.type === "king" && card.weight === "spades")
  );
}

function getCardsDifferenceBetweenPlayers() {
  return function(dispatch, getState) {
    const gameState = getState().gameState;
    const cpuCardsLength = gameState.cpuPlayer.cards.length;
    const playerCardsLength = gameState.player.cards.length;

    if (cpuCardsLength - playerCardsLength > 0) {
      return cpuCardsLength - playerCardsLength;
    } else {
      return 1;
    }
  };
}

function checkCardsToUse(availableCards) {
  return function(dispatch, getState) {
    const cpuCards = _.cloneDeep(getState().gameState.cpuPlayer.cards);
    const cardsDifference = dispatch(getCardsDifferenceBetweenPlayers());
    const gameState = getState().gameState;
    const { battleCardActive, waitTurn, jackActive, pile, deck } = gameState;
    const pileTopCard = pile[pile.length - 1];
    const cpuWait = gameState.cpuPlayer.wait;
    const playerCards = gameState.player.cards;

    // Get information about cards of same type & weight
    let cpuCardsTypeAndWeight = getSameTypeAndWeightAmount(
      availableCards,
      cpuCards
    );
    let neutralCards = getNeutralCards(cpuCardsTypeAndWeight);
    let battleCards = getBattleCards(cpuCardsTypeAndWeight);
    let fours = cpuCardsTypeAndWeight.filter(card => card.type === "4");
    let jacks = cpuCardsTypeAndWeight.filter(card => card.type === "jack");
    let aces = cpuCardsTypeAndWeight.filter(card => card.type === "ace");
    let kings = cpuCardsTypeAndWeight.filter(
      card =>
        (card.type === "king" && card.weight === "diamonds") ||
        (card.type === "king" && card.weight === "clubs")
    );

    function getNeutralValue() {
      if (
        neutralCards.length === 0 ||
        battleCardActive ||
        waitTurn ||
        cpuWait
      ) {
        return 0;
      } else {
        let weight = 15;
        let value = neutralCards.length * weight;
        return value;
      }
    }

    function getBattleValue() {
      if (battleCards.length === 0 || waitTurn || cpuWait || jackActive) {
        return 0;
      } else {
        let weight = 6;
        let value =
          battleCards.length * weight +
          (Math.pow(cardsDifference, 2) / 10) * weight;
        return value;
      }
    }

    function getFoursValue() {
      if (fours.length === 0 || battleCardActive || jackActive || cpuWait) {
        return 0;
      } else {
        let weight;
        let foursOnPile = pile.filter(x => x.type === "4").length;

        (function checkWeight() {
          if (4 - foursOnPile - fours.length === 0) {
            weight = 500;
          } else if (4 - foursOnPile - fours.length === 1) {
            weight = 20;
          } else if (4 - foursOnPile - fours.length === 2) {
            weight = 5;
          } else {
            weight = 2;
          }
        })();

        let value = (weight * deck.length) / playerCards.length;
        return value;
      }
    }

    function getJacksValue() {
      if (jacks.length === 0 || battleCardActive || waitTurn || cpuWait) {
        return 0;
      } else {
        let jacksWeight = 24;
        let jackNeutralRatio = 1;
        if (neutralCards.length) {
          jackNeutralRatio = jacksWeight / neutralCards.length;
        }
        let value =
          jacks.length * jackNeutralRatio +
          (cardsDifference / jacksWeight) * 3 +
          (jacksWeight / playerCards.length) * 2;
        return value;
      }
    }

    function getAcesValue() {
      if (
        aces.length === 0 ||
        battleCardActive ||
        waitTurn ||
        cpuWait ||
        jackActive
      ) {
        return 0;
      } else {
        let weight = 3;
        let value =
          aces.length * weight +
          (cpuCards.length / availableCards.length) * weight;
        return value;
      }
    }

    function getKingsValue() {
      if (
        kings.length &&
        ((pileTopCard.type === "king" && pileTopCard.weight === "hearts") ||
          (pileTopCard.type === "king" && pileTopCard.weight === "spades"))
      ) {
        return 15;
      } else {
        return 0;
      }
    }
    const neutralValue = getNeutralValue();
    const battleValue = getBattleValue();
    const foursValue = getFoursValue();
    const jacksValue = getJacksValue();
    const acesValue = getAcesValue();
    const kingsValue = getKingsValue();

    let min = 0;
    let max =
      neutralValue +
      battleValue +
      foursValue +
      jacksValue +
      acesValue +
      kingsValue;
    let previousUpperRange = 0;

    let ranges = {
      neutral: calculateRange(getNeutralValue(), previousUpperRange),
      battle: calculateRange(getBattleValue(), previousUpperRange),
      fours: calculateRange(getFoursValue(), previousUpperRange),
      jacks: calculateRange(getJacksValue(), previousUpperRange),
      aces: calculateRange(getAcesValue(), previousUpperRange),
      kings: calculateRange(getKingsValue(), previousUpperRange)
    };

    let rand = function(min, max) {
      return Math.random() * (max - min) + min;
    };

    let randomNumber = rand(min, max);

    let cardsToUse;

    if (randomNumber < ranges.neutral) {
      cardsToUse = neutralCards;
    } else if (randomNumber < ranges.battle) {
      cardsToUse = battleCards;
    } else if (randomNumber < ranges.fours) {
      cardsToUse = fours;
    } else if (randomNumber < ranges.jacks) {
      cardsToUse = jacks;
    } else if (randomNumber < ranges.aces) {
      cardsToUse = aces;
    } else if (randomNumber < ranges.kings) {
      cardsToUse = kings;
    }

    if (jacks.length && neutralCards.length === 1 && jacksValue) {
      cardsToUse = jacks;
    }
    return cardsToUse;
  };
}

function calculateRange(rangeWidth, previousUpperRange) {
  previousUpperRange = previousUpperRange + rangeWidth;
  if (rangeWidth) {
    previousUpperRange += rangeWidth;
    return previousUpperRange;
  } else {
    return 0;
  }
}

function getCardWithMostMoves(cards) {
  return cards.reduce((prev, curr) =>
    prev.possibleCardsAfter < curr.possibleCardsAfter ? prev : curr
  );
}

function setBestTopCard(cardsToUse) {
  return function(dispatch, getState) {
    const gameState = getState().gameState;

    const { pile, cpuPlayer, jackActive, chosenType, chosenWeight } = gameState;
    let cpuCards = cpuPlayer.cards;
    if (gameState.firstCardChecked)
      cpuCards = cpuCards.filter(card => card.isForCheck);
    const pileTopCard = pile[pile.length - 1];
    let mostMovesCard = getCardWithMostMoves(cardsToUse);
    let cpuSelectedCards = [];

    if (!mostMovesCard.sameTypeAmount) {
      cpuSelectedCards.push(mostMovesCard);
    } else {
      cpuSelectedCards = cpuCards.filter(c => c.type === mostMovesCard.type);

      //While the first selected card does not match the card on pile - move it to the end of array
      if (
        pileTopCard.type !== cpuSelectedCards[0].type &&
        pileTopCard.type !== "ace" &&
        !jackActive
      ) {
        while (cpuSelectedCards[0].weight !== pileTopCard.weight) {
          const firstCard = cpuSelectedCards.shift();
          cpuSelectedCards.push(firstCard);
        }
      }
      if (
        chosenType !== cpuSelectedCards[0].type &&
        pileTopCard.type === "ace" &&
        !jackActive
      ) {
        while (cpuSelectedCards[0].weight !== chosenWeight) {
          const firstCard = cpuSelectedCards.shift();
          cpuSelectedCards.push(firstCard);
        }
      }
    }
    return cpuSelectedCards;
  };
}

function verifyCardsFromAI(cardsToUse) {
  return function(dispatch, getState) {
    const gameState = getState().gameState;

    let {
      cardsToTake,
      waitTurn,
      jackActive,
      battleCardActive,
      chosenType,
      chosenWeight,
      cpuPlayer
    } = gameState;

    let gameFactors = {
      cardsToTake,
      waitTurn,
      jackActive,
      battleCardActive,
      chosenType,
      chosenWeight
    };
    const cpuCards = cpuPlayer.cards;
    let newCpuCards = _.cloneDeep(cpuPlayer.cards);
    let allNeutralCards = getSameTypeAndWeightAmount(
      getNeutralCards(cpuCards),
      cpuCards
    );
    let mostMovesCard = getCardWithMostMoves(cardsToUse);

    // Bool to use if cpu has more than 1 jack to use
    let cardDemandAlreadyChanged = false;

    cardsToUse.forEach(card => {
      let notCheckedYet = true;
      switch (card.type) {
        case "2":
          if (nobodyIsWaiting()) gameFactors.cardsToTake += 2;
          break;
        case "3":
          if (nobodyIsWaiting()) gameFactors.cardsToTake += 3;
          break;
        case "4":
          gameFactors.waitTurn += 1;
          break;
        case "jack":
          if (!cardDemandAlreadyChanged) {
            if (allNeutralCards.length) {
              for (let i = 0; i < 2; i++) {
                let index = allNeutralCards.findIndex(x => x.type === "king");
                if (index !== -1)
                  allNeutralCards = allNeutralCards.slice(index, 1);
                else i = 2;
              }
              if (allNeutralCards.length)
                gameFactors.chosenType = allNeutralCards.reduce((prev, curr) =>
                  prev.sameTypeAmount < curr.sameTypeAmount ? prev : curr
                ).type;
              else gameFactors.chosenType = null;
            }
            gameFactors.chosenType
              ? (gameFactors.jackActive = 3)
              : (gameFactors.jackActive = 0);
            cardDemandAlreadyChanged = true;
          }
          break;
        case "ace":
          if (notCheckedYet) {
            let cpuCardsWithoutMostMoves = [...newCpuCards];
            cpuCardsWithoutMostMoves.splice(
              cpuCardsWithoutMostMoves.indexOf(mostMovesCard),
              1
            );
            if (newCpuCards.length > 1)
              gameFactors.chosenWeight = cpuCardsWithoutMostMoves.reduce(
                (prev, curr) =>
                  prev.sameWeightAmount < curr.sameWeightAmount ? prev : curr
              ).weight;
          }
          break;
        case "king":
          if (
            card.weight === "hearts" ||
            (card.weight === "spades" && nobodyIsWaiting())
          ) {
            gameFactors.cardsToTake += 5;
            break;
          }

          //Kings of clubs and diamonds nullify amount of cards to be taken
          else {
            gameFactors.cardsToTake = 1;
            break;
          }
        default:
          break;
      }

      let indexInCpuCards = newCpuCards.findIndex(
        x => x.type === card.type && x.weight === card.weight
      );
      newCpuCards.splice(indexInCpuCards, 1);
    });
    dispatch(checkGameFactorsToUpdate(gameFactors));
    dispatch(checkMacaoAndWin());
    return newCpuCards;
  };
}
