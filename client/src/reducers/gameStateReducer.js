// import * as actionTypes from "./actions";
import {
  UPDATE_PLAYER_CARDS,
  UPDATE_CPU_CARDS,
  UPDATE_GAME_FACTOR,
  UPDATE_WHOS_TURN,
  ADD_TO_PILE,
  TAKE_FROM_DECK,
  CHANGE_SUIT,
  DEMAND_CARD,
  SHUFFLE_DECK,
  WAIT_TURNS,
  RESTART_GAME
} from "../actions/logicActions";
import { cardTypes, cardSuits } from "../constants/constants";
import { sortCards } from "../utility/utility";
import _ from "lodash";

export const initialState = () => {
  let initGame = {
    player: {
      cards: [],
      wait: 0
    },
    cpuPlayer: {
      cards: [],
      wait: 0
    },
    pile: [],
    deck: [],
    chosenWeight: "",
    chosenType: "",
    isPlayerTurn: 0,
    firstCardChecked: false,
    jackActive: 0,
    cardsToTake: 1,
    waitTurn: 0,
    battleCardActive: false,
    winner: 0,
    gameOver: false
  };

  function card(type, weight) {
    this.type = type;
    this.weight = weight;
  }

  (function createDeck() {
    cardSuits.forEach(weight => {
      cardTypes.forEach(type => {
        initGame.deck.push(new card(type, weight));
      });
    });
  })();

  initGame.isPlayerTurn = Math.round(Math.random() * 1);
  initGame.deck = _.shuffle(initGame.deck);

  // Deal cards
  (function assignCards() {
    initGame.player.cards = sortCards(initGame.deck.splice(0, 5));
    initGame.cpuPlayer.cards = sortCards(initGame.deck.splice(0, 5));

    // Always start game with a neutral card
    for (let i = 0; i < initGame.deck.length; i++) {
      switch (initGame.deck[i].type) {
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
        case "10":
        case "queen":
          initGame.pile = initGame.deck.splice(i, 1);
          return;
        default:
          break;
      }
    }
  })();
  return initGame;
};

export default function(state = initialState(), action) {
  switch (action.type) {
    case UPDATE_PLAYER_CARDS:
      return {
        ...state,
        player: {
          ...state.player,
          cards: [...action.cards]
        }
      };
    case TAKE_FROM_DECK:
      return {
        ...state,
        deck: [...state.deck.slice(0, -action.howMany)]
      };
    case ADD_TO_PILE:
      return {
        ...state,
        pile: [...state.pile, ...action.cards]
      };
    case CHANGE_SUIT:
      return {
        ...state,
        chosenWeight: action.chosenWeight
      };
    case DEMAND_CARD:
      return {
        ...state,
        chosenType: action.chosenType
      };
    case SHUFFLE_DECK:
      return {
        ...state,
        deck: [...state.deck, ...action.cards],
        pile: [...state.pile.slice(-1)]
      };
    case UPDATE_CPU_CARDS:
      return {
        ...state,
        cpuPlayer: {
          ...state.cpuPlayer,
          cards: action.cards
        }
      };
    case WAIT_TURNS:
      return {
        ...state,
        [action.who]: {
          ...state[action.who],
          wait: action.waitTurns
        }
      };
    case UPDATE_GAME_FACTOR:
      return {
        ...state,
        [action.factor]: action.value
      };
    case UPDATE_WHOS_TURN:
      return {
        ...state,
        isPlayerTurn: action.isPlayerTurn
      };
    case RESTART_GAME:
      return initialState();
    default:
      return state;
  }
}
