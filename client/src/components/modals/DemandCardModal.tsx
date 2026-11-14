import ModalButton from "../buttons/ModalButton";

export default function DemandCardModal(props: { demandCard: (card: string) => void }) {
  const cardsForDemand = ["5", "6", "7", "8", "9", "10", "queen", ""];
  const nameToDisplay = (card: string) =>
    card === "queen" ? "Q" : card === "" ? "X" : card;

  return (
    <div>
      <span>Demand card</span>
      <div className="demand-icons">
        {cardsForDemand.map(card => (
          <ModalButton
            key={card}
            onClick={() => props.demandCard(card)}
            text={nameToDisplay(card)}
          />
        ))}
      </div>
    </div>
  );
}

