import React from 'react';
import {shallow} from 'enzyme';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import GameView from './GameView';

const mockStore = configureMockStore([ thunk ]);

const storeStateMock = {
  gameState:{
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
  }
};

let store;
let component;
describe('tests for GameView container', () => {
  beforeEach(() => {
    store = mockStore(storeStateMock);
    component = shallow(<GameView store={store} />).shallow();
  });

  it('renders properly', () => {
    expect(component).toMatchSnapshot();
  });
});