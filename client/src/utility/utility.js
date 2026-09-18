export const sortCards = (cards) => {
    return cards.sort(function(a, b) {
      const compString =
        "'2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king' , 'ace'";
      return compString.indexOf(a.type) - compString.indexOf(b.type);
    });
  }

export const shuffleCards = (cards) => {
    let currentIndex = cards.length,
      temporaryValue,
      randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = cards[currentIndex];
      cards[currentIndex] = cards[randomIndex];
      cards[randomIndex] = temporaryValue;
    }

    return cards;
  }