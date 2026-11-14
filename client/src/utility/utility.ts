export const sortCards = <T extends { type: string }>(cards: T[]): T[] => {
  return cards.sort(function(a, b) {
    const compString =
      "'2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king' , 'ace'";
    return compString.indexOf(a.type) - compString.indexOf(b.type);
  });
};

export const shuffleCards = <T>(cards: T[]): T[] => {
  let currentIndex = cards.length;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick remaining element...
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    const temporaryValue = cards[currentIndex];
    cards[currentIndex] = cards[randomIndex];
    cards[randomIndex] = temporaryValue;
  }

  return cards;
};
