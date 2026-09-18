import React from "react";
import PropTypes from 'prop-types';

export default function RulesDialog(props) {
  return (
    <div>
      <i onClick={props.close} id="close-rules">x</i>
      <h1>Gameplay</h1>
      <p>
        <span>
          Players are dealt 5 cards each; the deck is then cut and the cut card
          becomes the first card in the discard pile. Play starts randomly.
        </span>
        <span>
          The next card played must be of the same suit or the same value as the
          card on the top of the discard pile. If a 7 of spades was on the top
          of the discard pile, the player can play a 9 of spades or a 7 of
          clubs. If the player cannot play a card, he must draw from the deck.
        </span>
        <span>
          Cards can be played in runs, i.e. 5 of Spades, 5 of Diamonds, 5 of
          Hearts.
        </span>
        <span>
          When an action card is played, the player next in sequence must
          complete the action or add to it to pass in onto the next player in
          sequence. When down to a single card, a player must say "Macao!". The
          winner of the game is the first player to have no cards;
        </span>
      </p>
      <h1>Action cards</h1>
        <ul>
          <li>
            If a 2 is played, the next player in sequence must pick up 2 cards
            unless they have a 2, in which case they can add this to the
            original 2 and the next player in sequence must pick up 4 cards and
            so on.
          </li>
          <li>
            If a 3 is played, the next player in sequence must pick up 3 cards
            unless they have a 3, in which case they can add this to the
            original 3 and the next player in sequence must pick up 6 cards and
            so on.
          </li>
          <li>
            If a 4 is played, the next player in sequence must miss a go, unless
            they have a 4, in which case they can add this to the original 4 and
            the next player in sequence miss 2 goes.
          </li>
          <li>
            If a Jack is played, the player placing the Jack can call for a
            non-action card value, him and the player in sequence must either
            play the card value called or place another Jack down and call a
            different value.
          </li>
          <li>
            If a King of Spades is played, the previous player in sequence must
            pick up 5 cards, unless they have a King of Hearts, in which case
            they can add this to the original King and the next player in
            sequence must pick up 10 cards.
          </li>
          <li>
            If a King of Hearts is played, the next player in sequence must pick
            up 5 cards, unless they have a King of Spades, in which case they
            can add this to the original King and the next player in sequence
            must pick up 10 cards.
          </li>
          <li>
            If a King of Hearts is played or King of Spades is played, the
            player who must pick up cards can use King of Diamonds or King of
            Clubs to defend himself and not take any cards.
          </li>
          <li>
            If an Ace is played, the player playing the Ace can call a suit suit
            of choice.
          </li>
        </ul>
        <span>
          Multiples action cards can be played, i.e. Player 1 plays three 2s and
          the next player in sequence must pick up 6 cards unless they have
          another 2. This is the same for 3's, 4's and Kings.
        </span>
    </div>
  );
}

RulesDialog.propTypes = {
  close: PropTypes.func
}
